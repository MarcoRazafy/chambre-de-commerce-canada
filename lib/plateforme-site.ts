import "server-only";

// Site public de la plateforme : les Chambres qu'on peut rejoindre, les offres à la création d'une Chambre.
// Hors de toute Chambre : lectures sans limite (prismaSysteme), seulement ce qui est public.
import { adresseOuSite } from "@/lib/adresse-chambre";
import { prismaSysteme as db } from "@/lib/db";
import { FONCTIONS } from "@/lib/fonctions-plateforme";
import { fmtDollars, lirePrixFonctions, offreGratuite } from "@/lib/plateforme";

// Les Chambres actives (nom, ville, pays), avec le lien vers leur inscription
export async function chambresPubliques(q: string) {
  const chambres = await db.chambre.findMany({
    where: { statut: "active", ...(q ? { nom: { contains: q, mode: "insensitive" as const } } : {}) },
    orderBy: { nom: "asc" },
    take: 100,
    select: { id: true, nom: true, slug: true, profil: { select: { ville: true, pays: true, logo: true } } },
  });
  // Le lien de la demande d'adhésion : l'espace des membres, la Chambre précisée par son identifiant
  const avecAdresse = await Promise.all(
    chambres.map(async (c) => {
      const base = await adresseOuSite(c.id, "client");
      return { ...c, adresse: base ? `${base}/auth/inscription?${new URLSearchParams({ chambre: c.slug })}` : null };
    }),
  );
  return avecAdresse.filter((c) => c.adresse);
}

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// Les offres, résumées pour le choix à la création et pour les tarifs du site (fonctions incluses : leurs libellés).
// Offre à la carte : pas de prix affiché (il se calcule en composant l'offre), chaque fonction au choix avec son prix.
export async function offresPubliques() {
  const offres = await db.offre.findMany({ orderBy: { ordre: "asc" } });
  return offres.map((o) => {
    const gratuite = !o.surMesure && offreGratuite(o);
    const limites = [
      o.maxMembres != null ? `jusqu’à ${o.maxMembres} membres` : "membres illimités",
      o.maxUtilisateurs != null ? `${o.maxUtilisateurs} compte${o.maxUtilisateurs > 1 ? "s" : ""} d’équipe` : null,
    ].filter(Boolean).join(" · ");
    const parCompte = o.parUtilisateur > 0
      ? `${fmtDollars(o.parUtilisateur)} par compte d’équipe en plus${o.utilisateursOfferts ? ` (${o.utilisateursOfferts} offert${o.utilisateursOfferts > 1 ? "s" : ""})` : ""}`
      : null;
    const prix = lirePrixFonctions(o.prixFonctions);
    const incluses = FONCTIONS.filter((f) => o.fonctions.includes(f.cle));
    return {
      id: o.id,
      nom: o.nom,
      prix: gratuite ? "Gratuit" : o.surMesure ? "Selon vos choix" : fmtDollars(o.forfait),
      periode: gratuite || o.surMesure ? "" : "mois",
      detail: majuscule((o.surMesure ? [limites] : [parCompte, limites]).filter(Boolean).join(" · ")),
      gratuite,
      surMesure: o.surMesure,
      fonctions: incluses.map((f) => f.libelle),
      cles: incluses.map((f) => f.cle as string),
      // Chiffres (offre à la carte, tableau comparatif)
      base: o.forfait,
      parUtilisateur: o.parUtilisateur,
      offerts: o.utilisateursOfferts,
      maxMembres: o.maxMembres,
      maxUtilisateurs: o.maxUtilisateurs,
      options: o.surMesure ? incluses.map((f) => ({ cle: f.cle as string, libelle: f.libelle as string, prix: prix[f.cle] ?? 0 })) : [],
    };
  });
}

export type OffrePublique = Awaited<ReturnType<typeof offresPubliques>>[number];
