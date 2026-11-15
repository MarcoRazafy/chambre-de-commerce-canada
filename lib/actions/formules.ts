"use server";

// Mon entreprise > Formules d'adhésion (super admins) : les formules que la Chambre propose à ses membres
// (inscription, fiche du membre, factures de cotisation). Une formule déjà choisie par des membres s'archive
// au lieu de disparaître : ils la gardent, elle n'est plus proposée.
import { revalidatePath } from "next/cache";
import { exigerAdministrateur } from "@/lib/autorisations";
import { prisma } from "@/lib/db";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";

const PAGE = "/admin/entreprise#formules";
const texte = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().replace(/\s+/g, " ").slice(0, max);

// Une formule : son type d'adhésion (« profil »), son montant et sa devise ; l'ancien titre (« pays ») n'est plus saisi
function lireFormule(fd: FormData) {
  const profil = texte(fd, "profil", 120);
  const montant = Number(texte(fd, "montant", 12).replace(/[\s ]/g, ""));
  const devise = texte(fd, "devise", 3);
  if (!profil) redirectWithErreur(PAGE, "Indiquez le type d’adhésion.");
  if (!Number.isInteger(montant) || montant < 0 || montant > 100_000_000) redirectWithErreur(PAGE, "Le montant est un nombre entier (sans décimales).");
  if (devise !== "CAD" && devise !== "MGA") redirectWithErreur(PAGE, "Choisissez la devise.");
  return { profil, montant, devise: devise as "CAD" | "MGA" };
}

async function formuleOuErreur(fd: FormData) {
  const f = await prisma.formuleAdhesion.findFirst({
    where: { id: texte(fd, "formuleId", 64) },
    select: { id: true, pays: true, profil: true, active: true, _count: { select: { membres: true } } },
  });
  if (!f) redirectWithErreur(PAGE, "Formule introuvable.");
  return f;
}

const fini = (message: string): never => {
  revalidatePath("/", "layout");
  redirectWithFlash(PAGE, message);
};

export async function ajouterFormuleAdhesion(formData: FormData) {
  await exigerAdministrateur(PAGE);
  const f = lireFormule(formData);
  const derniere = await prisma.formuleAdhesion.aggregate({ _max: { ordre: true } });
  await prisma.formuleAdhesion.create({ data: { ...f, pays: "", ordre: (derniere._max.ordre ?? -1) + 1 } });
  fini(`Formule ${f.profil} ajoutée`);
}

export async function enregistrerFormuleAdhesion(formData: FormData) {
  await exigerAdministrateur(PAGE);
  const actuelle = await formuleOuErreur(formData);
  const f = lireFormule(formData);
  await prisma.formuleAdhesion.update({ where: { id: actuelle.id }, data: f });
  fini(`Formule ${f.profil} enregistrée`);
}

// Monter ou descendre une formule dans la liste (l'ordre des cartes à l'inscription).
// Deux actions : un bouton qui porte une action ne peut pas porter aussi son propre nom/valeur.
export async function monterFormuleAdhesion(formData: FormData) {
  await deplacer(formData, -1);
}
export async function descendreFormuleAdhesion(formData: FormData) {
  await deplacer(formData, 1);
}

async function deplacer(formData: FormData, vers: -1 | 1) {
  await exigerAdministrateur(PAGE);
  const actuelle = await formuleOuErreur(formData);
  const liste = await prisma.formuleAdhesion.findMany({ where: { active: true }, orderBy: [{ ordre: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const i = liste.findIndex((x) => x.id === actuelle.id);
  const j = i + vers;
  if (i < 0 || j < 0 || j >= liste.length) fini("Ordre inchangé");
  [liste[i], liste[j]] = [liste[j], liste[i]];
  await prisma.$transaction(liste.map((x, ordre) => prisma.formuleAdhesion.update({ where: { id: x.id }, data: { ordre } })));
  fini("Ordre enregistré");
}

// Retirer : supprimée si personne ne l'a choisie, sinon archivée (ses membres la gardent)
export async function retirerFormuleAdhesion(formData: FormData) {
  await exigerAdministrateur(PAGE);
  const f = await formuleOuErreur(formData);
  if (!f._count.membres) {
    await prisma.formuleAdhesion.delete({ where: { id: f.id } });
    fini(`Formule ${f.profil} supprimée`);
  }
  await prisma.formuleAdhesion.update({ where: { id: f.id }, data: { active: false } });
  fini(`Formule ${f.profil} archivée : ${f._count.membres} membre${f._count.membres > 1 ? "s la gardent" : " la garde"}`);
}

// Proposer de nouveau une formule archivée
export async function remettreFormuleAdhesion(formData: FormData) {
  await exigerAdministrateur(PAGE);
  const f = await formuleOuErreur(formData);
  const derniere = await prisma.formuleAdhesion.aggregate({ where: { active: true }, _max: { ordre: true } });
  await prisma.formuleAdhesion.update({ where: { id: f.id }, data: { active: true, ordre: (derniere._max.ordre ?? -1) + 1 } });
  fini(`Formule ${f.profil} de nouveau proposée`);
}
