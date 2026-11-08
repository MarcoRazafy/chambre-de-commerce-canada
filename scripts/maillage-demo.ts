import { prisma } from "../lib/db";
import type { Prisma } from "../lib/generated/prisma/client";
import type { Reponses } from "../lib/maillage";

// Données de démonstration du maillage : étiquettes (propose / recherche / intérêts) des membres de démo,
// quelques réponses au questionnaire, deux mises en relation et une suggestion écartée.
// Ne remplace rien : un membre qui a déjà des étiquettes ou un questionnaire est laissé tel quel.

type Profil = { offres: string[]; besoins: string[]; interets: string[]; reponses?: Reponses };

const PROFILS: Record<string, Profil> = {
  m1: {
    offres: ["Produits malgaches à l’export", "Huiles essentielles bio"],
    besoins: ["Acheteurs & distributeurs au Canada", "Conseil & accompagnement d’affaires"],
    interets: ["Export", "Bio & commerce équitable"],
    reponses: { C2: { texte: "Un appui pour obtenir la certification bio canadienne et nous implanter au Québec.", delai: "2027-03-31" } },
  },
  m2: {
    offres: ["Produits malgaches à l’export", "Artisanat d’art"],
    besoins: ["Marketing digital & réseaux sociaux", "Acheteurs & distributeurs au Canada"],
    interets: ["Export", "Salons professionnels"],
  },
  m3: {
    offres: ["Agence réceptive à Madagascar", "Séjours d’affaires"],
    besoins: ["Site web & applications"],
    interets: ["Tourisme", "Digital"],
    reponses: { C2: { texte: "Refaire notre site web avec la réservation en ligne pour la clientèle québécoise." } },
  },
  m4: {
    offres: ["Produits malgaches à l’export"],
    besoins: ["Conseil & accompagnement d’affaires"],
    interets: ["Export", "Agroalimentaire"],
  },
  m5: {
    offres: ["Site web & applications", "Marketing digital & réseaux sociaux", "Externalisation & assistance à distance"],
    besoins: ["Conseil & accompagnement d’affaires"],
    interets: ["Digital", "Intelligence artificielle"],
    reponses: { C2: { texte: "Un accompagnement pour structurer notre offre et signer nos premiers clients au Canada." } },
  },
  m6: {
    offres: ["Minerais & pierres industrielles"],
    besoins: ["Conseil & accompagnement d’affaires"],
    interets: ["Export", "Mines responsables"],
    reponses: { C4: "Structurer une filière d’export traçable, conforme aux attentes des acheteurs responsables." },
  },
  m7: {
    offres: ["Conseil & accompagnement d’affaires", "Financement à l’export"],
    besoins: ["Site web & applications"],
    interets: ["Export", "Financement"],
    reponses: { C4: "Notre site web ne permet pas encore aux PME de déposer une demande de financement en ligne." },
  },
  m8: {
    offres: ["Formation & montée en compétences"],
    besoins: ["Marketing digital & réseaux sociaux"],
    interets: ["Formation"],
    reponses: { C2: { texte: "Plus de visibilité pour nos formations auprès des entreprises du réseau." } },
  },
  m9: {
    offres: ["Conseil & accompagnement d’affaires", "Formation & montée en compétences"],
    besoins: [],
    interets: ["Formation", "Export"],
  },
};

// m7 a répondu à tout le questionnaire : il apparaît « Complété » dans le suivi
const COMPLET: Reponses = {
  A1: { nom: "Fandresena Finance", annee: "2012", site: "https://fandresena.mg" },
  A2: { noms: ["Services financiers"] },
  A3: "Nous finançons les PME malgaches qui exportent : préfinancement de commandes, garanties et conseil financier.",
  B1: [{ nom: "Préfinancement export", description: "Avance sur commande confirmée", client: "PME exportatrices", prix: "Sur dossier" }],
  B2: "Une coopérative de vanille a pu honorer une commande québécoise grâce à un préfinancement de 60 jours.",
  B5: { choix: ["Bureaux ou salles"], details: "Une salle de réunion à Antananarivo, libre le vendredi." },
  C1: [{ poste: "Développement informatique", volume: "15 000 $ par an" }],
  C2: { texte: "Un prestataire pour développer notre portail de demande en ligne." },
  C4: "Notre site web ne permet pas encore aux PME de déposer une demande de financement en ligne.",
  D1: { choix: ["PME"], details: "Les dirigeants de PME exportatrices." },
  D3: { actuels: ["Antananarivo"], vises: ["Québec", "La Réunion"] },
  D5: "1. Ouvrir une ligne de garantie export\n2. Digitaliser les demandes\n3. Nouer un partenariat bancaire au Canada",
  E1: { themes: ["Finance inclusive", "Paiement mobile"] },
  F1: { choix: ["Fournisseur", "Partage de ressources"] },
  F2: "Aucun.",
  F8: { A: "membres", B: "membres", C: "chambre", D: "chambre", E: "membres", F: "chambre" },
};

async function main() {
  const maintenant = new Date();
  const jours = (n: number) => new Date(maintenant.getTime() - n * 86_400_000);
  const membres = await prisma.member.findMany({
    where: { id: { in: Object.keys(PROFILS) } },
    select: { id: true, offresTags: true, besoinsTags: true, interetsTags: true, maillage: { select: { memberId: true } } },
  });

  let etiquetes = 0, questionnaires = 0;
  for (const m of membres) {
    const p = PROFILS[m.id];
    if (!m.offresTags.length && !m.besoinsTags.length && !m.interetsTags.length) {
      await prisma.member.update({ where: { id: m.id }, data: { offresTags: p.offres, besoinsTags: p.besoins, interetsTags: p.interets } });
      etiquetes++;
    }
    const reponses = m.id === "m7" ? COMPLET : p.reponses;
    if (reponses && !m.maillage) {
      await prisma.maillage.create({
        data: {
          memberId: m.id,
          reponses: reponses as Prisma.InputJsonObject,
          rempliPar: "Le membre",
          commenceLe: jours(20),
          completeLe: m.id === "m7" ? jours(12) : null,
          relanceLe: m.id === "m8" ? jours(5) : null,
        },
      });
      questionnaires++;
    }
  }
  console.log(`  Étiquettes de maillage : ${etiquetes} membre(s) ; questionnaires : ${questionnaires}.`);

  const presents = new Set(membres.map((m) => m.id));
  const liens: [string, string, string, string | null, number][] = [
    ["m1", "m2", "relation", "Stand commun au prochain salon de Montréal : huiles essentielles et artisanat.", 18],
    ["m7", "m9", "relation", "Accompagnement conjoint des PME membres vers le financement export.", 9],
    ["m4", "m9", "ignoree", null, 6],
  ];
  let faits = 0;
  for (const [a, b, statut, note, il] of liens) {
    if (!presents.has(a) || !presents.has(b)) continue;
    const [x, y] = [a, b].sort();
    const deja = await prisma.miseEnRelation.findUnique({ where: { memberAId_memberBId: { memberAId: x, memberBId: y } } });
    if (deja) continue;
    await prisma.miseEnRelation.create({ data: { memberAId: x, memberBId: y, statut, note, createdAt: jours(il) } });
    faits++;
  }
  console.log(`  Mises en relation ajoutées : ${faits}.`);
  await prisma.$disconnect();
}

main();
