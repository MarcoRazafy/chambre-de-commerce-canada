import "server-only";

// Espace Admin GM : son compte (session à part), et ce qu'il voit de toutes les Chambres.
// Lectures sans limite de Chambre (prismaSysteme) : l'Admin GM n'appartient à aucune Chambre.
import { redirect } from "next/navigation";
import { sessionGMCourante } from "@/lib/auth-gm";
import { prismaSysteme as db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { DELAI_REGLEMENT_JOURS } from "@/lib/membership";

export async function compteGM() {
  const s = await sessionGMCourante();
  if (!s) return null;
  const c = await db.compteGM.findUnique({ where: { id: s.id }, select: { id: true, nom: true, email: true, motDePasseModifieLe: true } });
  // Mot de passe changé depuis l'ouverture de la session : à refaire
  if (!c || (c.motDePasseModifieLe && s.emiseLe + 1000 < c.motDePasseModifieLe.getTime())) return null;
  return { id: c.id, nom: c.nom, email: c.email };
}

export async function exigerGM() {
  const c = await compteGM();
  if (!c) redirect("/gm/connexion");
  return c;
}

export type StatutAffiche = "active" | "en_retard" | "suspendue";
export const STATUTS: Record<StatutAffiche, { libelle: string; ton: "ok" | "warn" | "bad" }> = {
  active: { libelle: "Active", ton: "ok" },
  en_retard: { libelle: "En retard", ton: "warn" },
  suspendue: { libelle: "Suspendue", ton: "bad" },
};

// Membres comptés : ceux de l'annuaire (pas les candidatures ni les refus)
const MEMBRES: Prisma.MemberWhereInput = { statut: { notIn: ["candidature", "refusee"] } };
const limiteRetard = () => new Date(Date.now() - DELAI_REGLEMENT_JOURS * 86_400_000);

// Toutes les Chambres : offre, statut (suspendue, en retard si une facture de l'abonnement attend depuis plus
// de DELAI_REGLEMENT_JOURS jours), membres, comptes de l'équipe, dernier paiement
export async function listeChambres() {
  const [chambres, payees, retards] = await Promise.all([
    db.chambre.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true, nom: true, slug: true, domaine: true, statut: true, createdAt: true,
        offre: { select: { id: true, nom: true } },
        _count: { select: { membres: { where: MEMBRES }, utilisateurs: { where: { role: "admin" } } } },
      },
    }),
    db.facturePlateforme.groupBy({ by: ["chambreId"], _max: { payeeLe: true } }),
    db.facturePlateforme.groupBy({ by: ["chambreId"], where: { payeeLe: null, date: { lt: limiteRetard() } }, _count: { _all: true } }),
  ]);
  const dernier = new Map(payees.map((p) => [p.chambreId, p._max.payeeLe]));
  const enRetard = new Set(retards.map((r) => r.chambreId));
  return chambres.map((c) => ({
    id: c.id, nom: c.nom, slug: c.slug, domaine: c.domaine, creeLe: c.createdAt, offre: c.offre,
    statut: (c.statut === "suspendue" ? "suspendue" : enRetard.has(c.id) ? "en_retard" : "active") as StatutAffiche,
    membres: c._count.membres,
    equipe: c._count.utilisateurs,
    dernierPaiement: dernier.get(c.id) ?? null,
  }));
}

export async function ficheChambre(id: string) {
  const c = await db.chambre.findUnique({ where: { id }, include: { offre: true } });
  if (!c) return null;
  const [equipe, factures, membres, evenements, journal, retard] = await Promise.all([
    db.user.findMany({
      where: { chambreId: id, role: "admin" },
      orderBy: { createdAt: "asc" },
      select: { id: true, nom: true, email: true, niveauEquipe: true, createdAt: true },
    }),
    db.facturePlateforme.findMany({ where: { chambreId: id }, orderBy: { date: "desc" }, take: 24 }),
    db.member.count({ where: { chambreId: id, ...MEMBRES } }),
    db.event.count({ where: { chambreId: id } }),
    db.auditLog.findMany({ where: { chambreId: id, entite: "Chambre" }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.facturePlateforme.count({ where: { chambreId: id, payeeLe: null, date: { lt: limiteRetard() } } }),
  ]);
  const statut: StatutAffiche = c.statut === "suspendue" ? "suspendue" : retard ? "en_retard" : "active";
  return { chambre: c, statut, equipe, factures, membres, evenements, journal };
}

export function offresPlateforme() {
  return db.offre.findMany({ orderBy: { ordre: "asc" }, include: { _count: { select: { chambres: true } } } });
}
