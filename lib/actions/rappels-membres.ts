"use server";

import { revalidatePath } from "next/cache";
import { exigerEquipe } from "@/lib/autorisations";
import { courrielsActifs, envoyerCourriel, urlPublique } from "@/lib/courriel";
import { prisma } from "@/lib/db";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { fmtDate } from "@/lib/format";
import { lireDoc } from "@/lib/lettre-blocs";
import { getProfilChambre } from "@/lib/profil-chambre";
import { courrielRappel } from "@/lib/rappels-membres";
import { estDeclencheur, JOURS_MAX, libelleRappel, type Declencheur } from "@/lib/rappels-membres-base";

const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const LISTE = "/admin/rappels";

function lireSaisie(formData: FormData, retour: string) {
  const declencheur = texte(formData, "declencheur");
  if (!estDeclencheur(declencheur)) redirectWithErreur(retour, "Choisissez quand le rappel part.");
  const jours = Number(texte(formData, "jours"));
  if (!Number.isInteger(jours) || jours < 1 || jours > JOURS_MAX) {
    redirectWithErreur(retour, `Indiquez un nombre de jours entre 1 et ${JOURS_MAX}.`);
  }
  const sujet = texte(formData, "sujet").slice(0, 200);
  const doc = lireDoc(texte(formData, "contenu").slice(0, 200000));
  if (!sujet || !doc?.sections.length) redirectWithErreur(retour, "Indiquez l’objet et le texte du rappel.");
  return { declencheur: declencheur as Declencheur, jours, sujet, contenu: JSON.stringify(doc), actif: formData.get("actif") === "1" };
}

export async function enregistrerRappelMembre(formData: FormData) {
  const moi = await exigerEquipe();
  const id = texte(formData, "id");
  const essai = texte(formData, "intention") === "essai";
  const retour = id ? `${LISTE}/${id}` : `${LISTE}/nouveau`;
  const data = lireSaisie(formData, retour);

  const doublon = await prisma.rappelMembre.findFirst({
    where: { declencheur: data.declencheur, jours: data.jours, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (doublon) redirectWithErreur(retour, `Un rappel existe déjà ${libelleRappel(data)} : modifiez-le, ou choisissez un autre nombre de jours.`);

  let rappelId = id;
  if (id) {
    const avant = await prisma.rappelMembre.findUnique({ where: { id }, select: { id: true } });
    if (!avant) redirectWithErreur(LISTE, "Rappel introuvable.");
    await prisma.rappelMembre.update({ where: { id }, data });
  } else {
    rappelId = (await prisma.rappelMembre.create({ data, select: { id: true } })).id;
  }
  revalidatePath(LISTE);
  if (essai) await envoyerEssai(data, moi, `${LISTE}/${rappelId}`);
  redirectWithFlash(LISTE, `Rappel enregistré : ${libelleRappel(data)}${data.actif ? "" : " (coupé)"}`);
}

export async function basculerRappelMembre(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "id");
  const r = await prisma.rappelMembre.findUnique({ where: { id }, select: { actif: true, declencheur: true, jours: true } });
  if (!r) redirectWithErreur(LISTE, "Rappel introuvable.");
  await prisma.rappelMembre.update({ where: { id }, data: { actif: !r.actif } });
  revalidatePath(LISTE);
  redirectWithFlash(LISTE, `${r.actif ? "Rappel coupé" : "Rappel activé"} : ${libelleRappel(r)}`);
}

export async function supprimerRappelMembre(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "id");
  const r = await prisma.rappelMembre.findUnique({ where: { id }, select: { declencheur: true, jours: true } });
  if (!r) redirectWithErreur(LISTE, "Rappel introuvable.");
  await prisma.rappelMembre.delete({ where: { id } });
  revalidatePath(LISTE);
  redirectWithFlash(LISTE, `Rappel supprimé : ${libelleRappel(r)}`);
}

async function envoyerEssai(
  data: { declencheur: Declencheur; jours: number; sujet: string; contenu: string },
  moi: { nom: string; email: string },
  page: string,
): Promise<never> {
  if (!courrielsActifs()) redirectWithErreur(page, "Rappel enregistré, mais l’envoi de courriels n’est pas configuré : l’essai n’est pas parti.");
  const chambre = (await getProfilChambre()).nom;
  const lien = await urlPublique("/membre/cotisations");
  const exemple = data.declencheur === "facture"
    ? { facture: "CC-2026-0001", objet: "Cotisation annuelle", montant: "150 $", jours: String(data.jours), lien }
    : { echeance: fmtDate(new Date(Date.now() + data.jours * 86_400_000).toISOString().slice(0, 10)), montant: "150 $", jours: String(data.jours), lien };
  const courriel = await courrielRappel(
    { sujet: `[Essai] ${data.sujet}`, contenu: data.contenu },
    moi.email,
    { prenom: moi.nom.split(/\s+/)[0] ?? "", nom: moi.nom, email: moi.email, entreprise: "Entreprise exemple", chambre, ...exemple },
  );
  if (!courriel || !(await envoyerCourriel(courriel))) redirectWithErreur(page, "Rappel enregistré, mais l’essai n’est pas parti. Réessayez dans un instant.");
  redirectWithFlash(page, `Rappel enregistré, essai envoyé à ${moi.email}`);
}
