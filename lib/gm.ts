import "server-only";

// Espace Admin GM : son compte (session à part), et ce qu'il voit de toutes les Chambres.
// Lectures sans limite de Chambre (prismaSysteme) : l'Admin GM n'appartient à aucune Chambre.
import { redirect } from "next/navigation";
import { sessionGMCourante } from "@/lib/auth-gm";
import { prismaSysteme as db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

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
// En retard : une facture de l'abonnement impayée, datée d'avant aujourd'hui
const limiteRetard = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

// Toutes les Chambres : offre, statut (suspendue, en retard si une facture de l'abonnement attend son paiement),
// membres, comptes de l'équipe, dernier paiement
export async function listeChambres() {
  const [chambres, payees, retards] = await Promise.all([
    db.chambre.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true, nom: true, slug: true, domaine: true, statut: true, createdAt: true,
        offre: { select: { id: true, nom: true } },
        profil: { select: { logo: true } },
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
    // Le logo réglé par la Chambre (Mon entreprise) ; sans logo : ses initiales
    logo: c.profil?.logo ?? null,
    statut: (c.statut === "suspendue" ? "suspendue" : enRetard.has(c.id) ? "en_retard" : "active") as StatutAffiche,
    membres: c._count.membres,
    equipe: c._count.utilisateurs,
    dernierPaiement: dernier.get(c.id) ?? null,
  }));
}

export async function ficheChambre(id: string) {
  const c = await db.chambre.findUnique({ where: { id }, include: { offre: true, profil: { select: { logo: true } } } });
  if (!c) return null;
  const [equipe, factures, membres, evenements, journal, journalTotal, retard] = await Promise.all([
    db.user.findMany({
      where: { chambreId: id, role: "admin" },
      orderBy: { createdAt: "asc" },
      select: { id: true, nom: true, email: true, niveauEquipe: true, createdAt: true },
    }),
    db.facturePlateforme.findMany({ where: { chambreId: id }, orderBy: { date: "desc" }, take: 24 }),
    db.member.count({ where: { chambreId: id, ...MEMBRES } }),
    db.event.count({ where: { chambreId: id } }),
    db.auditLog.findMany({ where: { chambreId: id, entite: "Chambre" }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.auditLog.count({ where: { chambreId: id, entite: "Chambre" } }),
    db.facturePlateforme.count({ where: { chambreId: id, payeeLe: null, date: { lt: limiteRetard() } } }),
  ]);
  const statut: StatutAffiche = c.statut === "suspendue" ? "suspendue" : retard ? "en_retard" : "active";
  return { chambre: c, statut, equipe, factures, membres, evenements, journal, journalTotal };
}

export const HISTORIQUE_PAR_PAGE = 50;

// Tout l'historique d'une Chambre (offre, accès, adresse, paiements, démarrage), du plus récent au plus ancien, par pages
export async function historiqueChambre(id: string, page = 1) {
  const where = { chambreId: id, entite: "Chambre" };
  const [chambre, total, entrees] = await Promise.all([
    db.chambre.findUnique({ where: { id }, select: { id: true, nom: true, profil: { select: { logo: true } } } }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * HISTORIQUE_PAR_PAGE, take: HISTORIQUE_PAR_PAGE }),
  ]);
  if (!chambre) return null;
  return { chambre, total, entrees, pages: Math.max(1, Math.ceil(total / HISTORIQUE_PAR_PAGE)) };
}

export function offresPlateforme() {
  return db.offre.findMany({ orderBy: { ordre: "asc" }, include: { _count: { select: { chambres: true } } } });
}

export function reglagesPlateforme() {
  return db.reglagesPlateforme.upsert({ where: { id: "plateforme" }, create: { id: "plateforme" }, update: {} });
}

const MOIS = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });

// Tableau de bord de l'Admin GM : Chambres (actives, en retard, nouvelles), revenus de l'abonnement
export async function tableauDeBordGM(maintenant = new Date()) {
  const debutMois = (decalage: number) => new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - decalage, 1));
  const il_y_a_30_jours = new Date(maintenant.getTime() - 30 * 86_400_000);
  const [chambres, payees, derniersPaiements] = await Promise.all([
    listeChambres(),
    db.facturePlateforme.findMany({ where: { payeeLe: { gte: debutMois(5) } }, select: { total: true, payeeLe: true } }),
    db.facturePlateforme.findMany({
      where: { payeeLe: { not: null } },
      orderBy: { payeeLe: "desc" },
      take: 6,
      select: { id: true, numero: true, total: true, payeeLe: true, chambre: { select: { id: true, nom: true, profil: { select: { logo: true } } } } },
    }),
  ]);
  // Revenus encaissés par mois, des 6 derniers mois (le plus ancien d'abord)
  const revenus = Array.from({ length: 6 }, (_, i) => {
    const debut = debutMois(5 - i);
    const fin = debutMois(4 - i);
    const total = payees.filter((f) => f.payeeLe && f.payeeLe >= debut && f.payeeLe < fin).reduce((s, f) => s + f.total, 0);
    return { mois: MOIS.format(debut), total: Math.round(total * 100) / 100 };
  });
  return {
    total: chambres.length,
    actives: chambres.filter((c) => c.statut !== "suspendue").length,
    enRetard: chambres.filter((c) => c.statut === "en_retard"),
    nouvelles: chambres.filter((c) => c.creeLe >= il_y_a_30_jours).sort((a, b) => b.creeLe.getTime() - a.creeLe.getTime()),
    revenus,
    revenusDuMois: revenus[5].total,
    derniersPaiements,
  };
}
