import "server-only";

import { prisma } from "@/lib/db";
import { SECTEURS } from "@/lib/secteurs";
import { prerempli, progression, texteDemande, type Reponses } from "@/lib/maillage";

// Maillage : le questionnaire des membres et les suggestions de mises en relation (besoin ↔ offre),
// repris de la plateforme L'Alliée Virtuelle.
const ACTIFS = ["a_jour", "en_attente", "en_retard"] as const;

export type Suggestion = {
  a: { id: string; nom: string; pays: string };
  b: { id: string; nom: string; pays: string };
  score: number;
  why: string[];
  flows: { tag: string; from: string; to: string }[];
  shared: string[];
  bridge: boolean;
};

// Le questionnaire d'un membre : ses réponses (ou celles tirées de sa fiche), l'avancement, la dernière relance
export async function chargerMaillage(memberId: string) {
  const m = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, nom: true, siteweb: true, secteur: true, desc: true, activite: true, maillage: true },
  });
  if (!m) return null;
  const mg = m.maillage;
  const enregistrees = (mg?.reponses ?? {}) as Reponses;
  const reponses = Object.keys(enregistrees).length ? enregistrees : prerempli(m);
  return {
    membre: { id: m.id, nom: m.nom },
    secteurs: [...SECTEURS] as string[],
    reponses,
    commence: Object.keys(enregistrees).length > 0,
    rempliPar: mg?.rempliPar ?? null,
    completeLe: mg?.completeLe?.toISOString() ?? null,
    majLe: mg?.majLe?.toISOString() ?? null,
    relanceLe: mg?.relanceLe?.toISOString() ?? null,
    ...progression(reponses),
  };
}
export type DonneesMaillage = NonNullable<Awaited<ReturnType<typeof chargerMaillage>>>;

// Suivi pour l'équipe : chaque membre actif et l'avancement de son questionnaire
export async function suiviMaillage() {
  const ms = await prisma.member.findMany({
    where: { statut: { in: [...ACTIFS] } },
    select: { id: true, nom: true, statut: true, maillage: true },
    orderBy: { nom: "asc" },
  });
  return ms.map((m) => {
    const r = (m.maillage?.reponses ?? {}) as Reponses;
    return {
      id: m.id,
      nom: m.nom,
      statut: m.statut,
      commence: Object.keys(r).length > 0,
      relanceLe: m.maillage?.relanceLe?.toISOString() ?? null,
      completeLe: m.maillage?.completeLe?.toISOString() ?? null,
      ...progression(r),
    };
  });
}

// Étiquettes trop générales pour justifier, seules, une mise en relation
const GENERIQUES = new Set(["Réseau d’affaires au Canada"]);
// Pour les étiquettes de l'annuaire, le besoin doit se retrouver dans ce que le membre a écrit
// (ce qu'il recherche, motivation, questionnaire) ; une étiquette sans motif compte toujours.
const MOTS_BESOIN: Record<string, RegExp> = {
  "Site web & applications": /(site web|e-commerce|en ligne|digital|numérique|application)/i,
  "Marketing digital & réseaux sociaux": /(visibilit|promo|faire (découvrir|connaître)|marketing|image de marque|communication)/i,
  "Externalisation & assistance à distance": /(externalis|sous-trait|assistan|main-d)/i,
  "Acheteurs & distributeurs au Canada": /(acheteur|distribut|importateur|grossiste|débouché|partenaires? commerciaux|export)/i,
  "Transport & logistique": /(export|logisti|expédi|transport|fret)/i,
  "Produits malgaches à l’export": /(distribut|import|épice|vanille|produits? malgache)/i,
  "Voyage, études & emploi au Canada": /(emploi|étudier|études|voyager|mobilit|visa)/i,
  "Formation & montée en compétences": /(formation|compétenc|renforcement)/i,
  "Conseil & accompagnement d’affaires": /(accompagnement|appuis?|implant|structurer|conseil)/i,
  "Agence réceptive à Madagascar": /(séminaire|incentive|voyage d'affaires|mission à madagascar|découvrir madagascar)/i,
};
const MAX_PAR_MEMBRE = 3;
const SEUIL = 61;

type Profil = { id: string; nom: string; pays: string; besoins: string[]; offres: string[]; interets: string[]; texte: string };

function rapprocher(a: Profil, b: Profil): Suggestion | null {
  const reel = (demandeur: Profil, x: string, offreur: Profil) =>
    !GENERIQUES.has(x) && offreur.offres.includes(x) && (!MOTS_BESOIN[x] || MOTS_BESOIN[x].test(demandeur.texte));
  const ab = a.besoins.filter((x) => reel(a, x, b));
  const ba = b.besoins.filter((x) => reel(b, x, a));
  if (!ab.length && !ba.length) return null;
  const shared = a.interets.filter((x) => b.interets.includes(x));
  const bridge = a.pays !== b.pays;
  const score = Math.min(97, 35 + (ab.length + ba.length) * 26 + shared.length * 12 + (bridge ? 10 : 0));
  if (score < SEUIL) return null;
  const why: string[] = [];
  ab.forEach((x) => why.push(`${a.nom} cherche « ${x} », proposé par ${b.nom}`));
  ba.forEach((x) => why.push(`${b.nom} cherche « ${x} », proposé par ${a.nom}`));
  if (shared.length) why.push(`Intérêts communs : ${shared.join(", ")}`);
  if (bridge) why.push("Un membre au Canada, l’autre à Madagascar");
  const flows = [...ab.map((tag) => ({ tag, from: b.id, to: a.id })), ...ba.map((tag) => ({ tag, from: a.id, to: b.id }))];
  return { a: { id: a.id, nom: a.nom, pays: a.pays }, b: { id: b.id, nom: b.nom, pays: b.pays }, score, why, flows, shared, bridge };
}

// Suggestions de mises en relation ; pour un membre (memberId), toutes les siennes, les meilleures d'abord
export async function suggestions(memberId?: string): Promise<Suggestion[]> {
  const ms = await prisma.member.findMany({
    where: { statut: { in: [...ACTIFS] } },
    select: {
      id: true, nom: true, pays: true, besoinsTags: true, offresTags: true, interetsTags: true,
      besoins: true, motivation: true, maillage: { select: { reponses: true } },
    },
  });
  const profils: Profil[] = ms.map((m) => ({
    id: m.id,
    nom: m.nom,
    pays: m.pays ?? "Madagascar",
    besoins: m.besoinsTags,
    offres: m.offresTags,
    interets: m.interetsTags,
    texte: [m.besoins, m.motivation, m.maillage ? texteDemande(m.maillage.reponses as Reponses) : ""].filter(Boolean).join(" "),
  }));
  const faites = new Set(
    (await prisma.miseEnRelation.findMany({ select: { memberAId: true, memberBId: true } }))
      .map((c) => [c.memberAId, c.memberBId].sort().join("|")),
  );
  const toutes: Suggestion[] = [];
  for (let i = 0; i < profils.length; i++) {
    for (let j = i + 1; j < profils.length; j++) {
      const a = profils[i], b = profils[j];
      if (memberId && a.id !== memberId && b.id !== memberId) continue;
      if (faites.has([a.id, b.id].sort().join("|"))) continue;
      const r = rapprocher(a, b);
      if (r) toutes.push(r);
    }
  }
  toutes.sort((x, y) => y.score - x.score || y.flows.length - x.flows.length);
  if (memberId) return toutes;
  const n = new Map<string, number>();
  return toutes.filter((s) => {
    if ((n.get(s.a.id) ?? 0) >= MAX_PAR_MEMBRE || (n.get(s.b.id) ?? 0) >= MAX_PAR_MEMBRE) return false;
    n.set(s.a.id, (n.get(s.a.id) ?? 0) + 1);
    n.set(s.b.id, (n.get(s.b.id) ?? 0) + 1);
    return true;
  });
}

// Mises en relation faites par la Chambre (d'un membre, ou toutes)
export async function relations(memberId?: string) {
  const rs = await prisma.miseEnRelation.findMany({
    where: {
      statut: "relation",
      ...(memberId ? { OR: [{ memberAId: memberId }, { memberBId: memberId }] } : {}),
    },
    include: {
      memberA: { select: { id: true, nom: true, secteur: true, ville: true, pays: true, logo: true } },
      memberB: { select: { id: true, nom: true, secteur: true, ville: true, pays: true, logo: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rs.map((r) => ({
    id: r.id,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
    a: r.memberA,
    b: r.memberB,
    autre: memberId ? (r.memberAId === memberId ? r.memberB : r.memberA) : null,
  }));
}

// Activité d'un membre, vue depuis son espace : ses inscriptions, ses rendez-vous, ses publications, ses mises en relation
export async function activiteMembre(memberId: string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Agenda / Actualités retirés pour l'instant, gardé pour les remettre
  const [inscriptions, rdv, publications, rels] = await Promise.all([
    prisma.registration.findMany({ where: { memberId }, include: { event: { select: { id: true, titre: true, date: true } } }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.rendezvous.findMany({ where: { memberId }, include: { type: { select: { titre: true } } }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.news.findMany({ where: { memberId }, select: { id: true, titre: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 30 }),
    relations(memberId),
  ]);
  type Ligne = { quand: string; icone: "evenement" | "rendezvous" | "publication" | "relation"; texte: string; lien: string };
  const l: Ligne[] = [
    ...inscriptions.map((i) => ({ quand: i.createdAt.toISOString(), icone: "evenement" as const, texte: `Inscription à « ${i.event.titre} »`, lien: `/membre/evenements/${i.event.id}` })),
    ...rdv.map((r) => ({ quand: r.createdAt.toISOString(), icone: "rendezvous" as const, texte: `${r.annuleLe ? "Rendez-vous annulé" : "Rendez-vous pris"} : ${r.type.titre}, le ${r.jour.toISOString().slice(0, 10).split("-").reverse().join("/")} à ${r.debut}`, lien: "/membre/rendez-vous" })),
    // Actualités retirées pour l'instant : à décommenter pour le remettre
    // ...publications.map((n) => ({ quand: n.createdAt.toISOString(), icone: "publication" as const, texte: `Publication : ${n.titre}`, lien: `/membre/actualites/${n.id}` })),
    ...rels.map((r) => ({ quand: r.createdAt, icone: "relation" as const, texte: `Mise en relation avec ${r.autre?.nom ?? ""}`, lien: `/membre/annuaire/${r.autre?.id ?? ""}` })),
  ];
  return l.sort((a, b) => b.quand.localeCompare(a.quand));
}
