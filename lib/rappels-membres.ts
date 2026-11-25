import "server-only";

import { renouvellementCotisation } from "@/lib/agenda";
import { COORDONNEES } from "@/lib/coordonnees";
import { envoyerCourriel, urlPublique } from "@/lib/courriel";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import {
  avecVariables,
  docDepuisTexte,
  LIEN_VARIABLE,
  lireDoc,
  sectionVide,
  versHtml,
  versTexte,
  type DocLettre,
  type PiedRegle,
  type Reseau,
  type Section,
  type Variables,
} from "@/lib/lettre-blocs";
import { fmtMontant } from "@/lib/membership";
import { calculer } from "@/lib/parametres";
import { getProfilChambreBrut, logoPourCourriel } from "@/lib/profil-chambre";
import { completerProfil } from "@/lib/profil-chambre-defauts";
import { choisirRappel, lettreDeRelance, type Declencheur } from "@/lib/rappels-membres-base";
import { joursDepuis } from "@/lib/retards";

const LETTRES_PAR_DEFAUT: Record<Declencheur, { sujet: string; texte: string; bouton: string }> = {
  facture: {
    sujet: "Facture {facture} en attente de règlement",
    texte:
      "Bonjour {prenom},\n\nLa facture {facture} ({objet}) de {montant} est en attente de règlement depuis {jours} jours.\n\nVous pouvez la régler en ligne depuis votre espace membre.\n\nMerci,\nL’équipe de {chambre}",
    bouton: "Régler la facture",
  },
  adhesion: {
    sujet: "Votre adhésion se termine le {echeance}",
    texte:
      "Bonjour {prenom},\n\nL’adhésion de {entreprise} à {chambre} se termine le {echeance}.\n\nPensez à la renouveler pour continuer à profiter des avantages réservés aux membres.\n\nMerci,\nL’équipe de {chambre}",
    bouton: "Renouveler mon adhésion",
  },
};

export function lettreParDefaut(
  declencheur: Declencheur,
  reseaux: Partial<Record<Reseau, string>> = {},
  pied: PiedRegle = {},
): { sujet: string; doc: DocLettre } {
  const l = LETTRES_PAR_DEFAUT[declencheur];
  const doc = docDepuisTexte(l.sujet, l.texte, reseaux, pied);
  doc.sections = doc.sections.map((s) => (s.type === "bandeau" ? { ...s, sousTitre: "" } : s));
  const bouton = { ...(sectionVide("bouton") as Extract<Section, { type: "bouton" }>), libelle: l.bouton, url: LIEN_VARIABLE };
  const fin = doc.sections.findIndex((s) => s.type === "reseaux" || s.type === "pied");
  doc.sections.splice(fin < 0 ? doc.sections.length : fin, 0, bouton);
  return { sujet: l.sujet, doc };
}

export async function convertirRelancesAnciennes(): Promise<void> {
  const brut = await getProfilChambreBrut();
  const jours = (brut?.relancesMembres ?? []).filter((j) => j > 0);
  if (!brut || !jours.length) return;
  const existants = await prisma.rappelMembre.count({ where: { declencheur: "facture" } });
  if (!existants) {
    const { reseaux, mentions } = calculer(brut);
    const { sujet, doc } = lettreParDefaut("facture", reseaux, mentions);
    await prisma.rappelMembre.createMany({
      data: jours.map((j) => ({ declencheur: "facture", jours: j, sujet, contenu: JSON.stringify(doc) })),
    });
  }
  await prisma.profilChambre.update({ where: { id: brut.id }, data: { relancesMembres: [] } });
}

type Rappel = { id: string; declencheur: string; jours: number; sujet: string; contenu: string };

async function contact(memberId: string) {
  return prisma.user.findFirst({
    where: { memberId, role: "membre" },
    orderBy: [{ contactPrincipal: "desc" }, { createdAt: "asc" }],
    select: { nom: true, email: true },
  });
}

export async function courrielRappel(r: Pick<Rappel, "sujet" | "contenu">, a: string, vars: Variables) {
  const doc = lireDoc(r.contenu);
  if (!doc) return null;
  const o = {
    base: (await urlPublique("/")).replace(/\/$/, ""),
    vars,
    mention: "Vous recevez ce message en tant que membre de la Chambre.",
    desabonnement: null,
    coordonnees: { adresse: COORDONNEES.adresse, email: COORDONNEES.email, telephone: COORDONNEES.telephone, confidentialite: COORDONNEES.legal.confidentialite },
    logo: await logoPourCourriel(),
  };
  return { a, sujet: avecVariables(r.sujet, vars).slice(0, 200), html: versHtml(doc, o), texte: versTexte(doc, o) };
}

const variablesDe = (nom: string, email: string, entreprise: string, chambre: string, autres: Variables): Variables => ({
  prenom: nom.split(/\s+/)[0] ?? "",
  nom,
  email,
  entreprise,
  chambre,
  ...autres,
});

const isoJour = (d: Date) => d.toISOString().slice(0, 10);

async function journal(r: Rappel, memberId: string, detail: string) {
  await Promise.all([
    prisma.auditLog.create({ data: { action: "relance_envoyee", entite: "Member", entiteId: memberId, acteur: "Rappel automatique", detail } }),
    prisma.rappelMembre.update({ where: { id: r.id }, data: { envoyes: { increment: 1 } } }),
  ]);
}

async function rappelsFactures(rappels: Rappel[], chambre: string, maintenant: Date): Promise<number> {
  const factures = await prisma.invoice.findMany({
    where: { statut: "envoyee", memberId: { not: null }, member: { statut: { in: ["en_attente", "a_jour", "en_retard"] } } },
    orderBy: { date: "asc" },
    select: { id: true, numero: true, objet: true, montant: true, devise: true, date: true, relances: true, memberId: true, member: { select: { nom: true } } },
  });
  let envoyes = 0;
  for (const f of factures) {
    const ecoules = joursDepuis(f.date, maintenant);
    const choix = choisirRappel(rappels, ecoules, "facture", (r) => f.relances.includes(r.jours));
    if (!choix) continue;
    const faites = [...new Set([...f.relances, ...choix.atteints.map((r) => r.jours)])];
    const c = await contact(f.memberId!);
    if (c?.email) {
      const courriel = await courrielRappel(choix.rappel, c.email, variablesDe(c.nom, c.email, f.member?.nom ?? "", chambre, {
        facture: f.numero,
        objet: f.objet,
        montant: fmtMontant(f.montant, f.devise),
        jours: String(ecoules),
        lien: await urlPublique(`/membre/cotisations/${f.id}`),
      }));
      if (!courriel || !(await envoyerCourriel(courriel))) continue;
      envoyes++;
      await journal(choix.rappel, f.memberId!, `Facture ${f.numero} (${ecoules} jours) : rappel envoyé à ${c.email}.`);
    }
    await prisma.invoice.update({ where: { id: f.id }, data: { relances: faites } });
  }
  return envoyes;
}

async function rappelsAdhesions(rappels: Rappel[], chambre: string, maintenant: Date): Promise<number> {
  const membres = await prisma.member.findMany({
    where: { statut: "a_jour" },
    select: {
      id: true,
      nom: true,
      adhesion: true,
      rappelsFin: true,
      formule: { select: { montant: true, devise: true } },
      factures: { select: { date: true, objet: true, statut: true } },
    },
  });
  const aujourdhui = isoJour(maintenant);
  let envoyes = 0;
  for (const m of membres) {
    const echeance = renouvellementCotisation({
      factures: m.factures.map((f) => ({ date: isoJour(f.date), objet: f.objet, statut: f.statut })),
      adhesion: isoJour(m.adhesion),
      aJour: true,
    });
    if (!echeance) continue;
    const avant = Math.round((Date.parse(echeance) - Date.parse(aujourdhui)) / 86_400_000);
    const cle = (r: Rappel) => `${echeance}:${r.jours}`;
    const choix = choisirRappel(rappels, avant, "adhesion", (r) => m.rappelsFin.includes(cle(r)));
    if (!choix) continue;
    const faits = [...new Set([...m.rappelsFin.filter((x) => x.startsWith(`${echeance}:`)), ...choix.atteints.map(cle)])];
    const c = await contact(m.id);
    if (c?.email) {
      const courriel = await courrielRappel(choix.rappel, c.email, variablesDe(c.nom, c.email, m.nom, chambre, {
        echeance: fmtDate(echeance),
        jours: String(avant),
        montant: m.formule ? fmtMontant(m.formule.montant, m.formule.devise) : "",
        lien: await urlPublique("/membre/cotisations"),
      }));
      if (!courriel || !(await envoyerCourriel(courriel))) continue;
      envoyes++;
      await journal(choix.rappel, m.id, `Adhésion jusqu’au ${fmtDate(echeance)} (${avant} jours avant) : rappel envoyé à ${c.email}.`);
    }
    await prisma.member.update({ where: { id: m.id }, data: { rappelsFin: faits } });
  }
  return envoyes;
}

export async function courrielRelanceFacture(factureId: string): Promise<{ email: string | null; envoye: boolean }> {
  const f = await prisma.invoice.findUnique({
    where: { id: factureId },
    select: { id: true, numero: true, objet: true, montant: true, devise: true, date: true, memberId: true, member: { select: { nom: true } } },
  });
  const c = f?.memberId ? await contact(f.memberId) : null;
  if (!f || !c?.email) return { email: null, envoye: false };
  const brut = await getProfilChambreBrut();
  const rappels = await prisma.rappelMembre.findMany({
    where: { declencheur: "facture" },
    select: { jours: true, sujet: true, contenu: true },
  });
  const age = joursDepuis(f.date, new Date());
  const lettre = lettreDeRelance(rappels, age) ?? (() => {
    const { reseaux, mentions } = calculer(brut);
    const { sujet, doc } = lettreParDefaut("facture", reseaux, mentions);
    return { sujet, contenu: JSON.stringify(doc) };
  })();
  const courriel = await courrielRappel(lettre, c.email, variablesDe(c.nom, c.email, f.member?.nom ?? "", completerProfil(brut).nom, {
    facture: f.numero,
    objet: f.objet,
    montant: fmtMontant(f.montant, f.devise),
    jours: String(age),
    lien: await urlPublique(`/membre/cotisations?regler=${f.id}`),
  }));
  return { email: c.email, envoye: Boolean(courriel && (await envoyerCourriel(courriel))) };
}

export async function envoyerRappelsMembresDus(maintenant = new Date()): Promise<number> {
  await convertirRelancesAnciennes();
  const rappels = await prisma.rappelMembre.findMany({
    where: { actif: true },
    select: { id: true, declencheur: true, jours: true, sujet: true, contenu: true },
  });
  if (!rappels.length) return 0;
  const chambre = completerProfil(await getProfilChambreBrut()).nom;
  const factures = rappels.filter((r) => r.declencheur === "facture");
  const adhesions = rappels.filter((r) => r.declencheur === "adhesion");
  return (
    (factures.length ? await rappelsFactures(factures, chambre, maintenant) : 0) +
    (adhesions.length ? await rappelsAdhesions(adhesions, chambre, maintenant) : 0)
  );
}
