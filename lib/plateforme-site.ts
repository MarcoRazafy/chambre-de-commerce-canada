import "server-only";

// Site public de la plateforme : les Chambres qu'on peut rejoindre, les offres à la création d'une Chambre.
// Hors de toute Chambre : lectures sans limite (prismaSysteme), seulement ce qui est public.
import { adresseOuSite } from "@/lib/adresse-chambre";
import { prismaSysteme as db } from "@/lib/db";
import { fmtDollars, offreGratuite } from "@/lib/plateforme";

// Les Chambres actives (nom, ville, pays), avec le lien vers leur inscription
export async function chambresPubliques(q: string) {
  const chambres = await db.chambre.findMany({
    where: { statut: "active", ...(q ? { nom: { contains: q, mode: "insensitive" as const } } : {}) },
    orderBy: { nom: "asc" },
    take: 100,
    select: { id: true, nom: true, profil: { select: { ville: true, pays: true } } },
  });
  const avecAdresse = await Promise.all(chambres.map(async (c) => ({ ...c, adresse: await adresseOuSite(c.id) })));
  return avecAdresse.filter((c) => c.adresse);
}

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// Les offres, résumées pour le choix à la création
export async function offresPubliques() {
  const offres = await db.offre.findMany({ orderBy: { ordre: "asc" } });
  return offres.map((o) => {
    const gratuite = offreGratuite(o);
    const limites = [
      o.maxMembres != null ? `jusqu’à ${o.maxMembres} membres` : "membres illimités",
      o.maxUtilisateurs != null ? `${o.maxUtilisateurs} compte${o.maxUtilisateurs > 1 ? "s" : ""} d’équipe` : null,
    ].filter(Boolean).join(" · ");
    const parCompte = o.parUtilisateur > 0
      ? `${fmtDollars(o.parUtilisateur)} par compte d’équipe en plus${o.utilisateursOfferts ? ` (${o.utilisateursOfferts} offert${o.utilisateursOfferts > 1 ? "s" : ""})` : ""}`
      : null;
    return {
      id: o.id,
      nom: o.nom,
      prix: gratuite ? "Gratuit" : fmtDollars(o.forfait),
      periode: gratuite ? "" : "mois",
      detail: majuscule([parCompte, limites].filter(Boolean).join(" · ")),
    };
  });
}
