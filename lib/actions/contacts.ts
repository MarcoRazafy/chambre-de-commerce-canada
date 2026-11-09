"use server";

import { revalidatePath } from "next/cache";
import { PROVISOIRE } from "@/lib/accueil";
import { exigerEquipe } from "@/lib/autorisations";
import { prisma } from "@/lib/db";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { jourBase } from "@/lib/format";
import { LIGNES_IMPORT_MAX, ligneValide } from "@/lib/import-contacts";
import { secteurOuProvisoire } from "@/lib/secteurs";

// Page Contacts (équipe) : ajouter un contact, importer un CSV, poser ou retirer des tags sur une sélection

const ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const retourContacts = (fd: FormData) => {
  const r = texte(fd, "retour");
  return r.startsWith("/admin/contacts") ? r : "/admin/contacts";
};
const garderTags = async (noms: string[]) => {
  for (const nom of noms) await prisma.tag.upsert({ where: { nom }, create: { nom }, update: {} });
};
const tagsDe = (fd: FormData) =>
  [...new Set(fd.getAll("tags").map((t) => String(t).trim().replace(/\s+/g, " ").slice(0, 60)).filter(Boolean))].slice(0, 20);

async function journal(action: string, entiteId: string, acteur: string, detail: string) {
  await prisma.auditLog.create({ data: { action, entite: "Member", entiteId, acteur, detail } });
}

// Nouvelle entreprise, comme « Ajouter un membre » : en attente de paiement, fiche à compléter
function nouvelleEntreprise(nom: string, secteur: string, ville: string) {
  return prisma.member.create({
    data: {
      type: "morale",
      nom,
      secteur: secteurOuProvisoire(secteur, PROVISOIRE.secteur),
      ville: ville || PROVISOIRE.ville,
      statut: "en_attente",
      adhesion: jourBase(),
      activite: PROVISOIRE.activite,
      desc: PROVISOIRE.desc,
    },
    select: { id: true },
  });
}

// « Ajouter un contact » : à une entreprise existante, ou avec une nouvelle entreprise
export async function ajouterContact(formData: FormData) {
  const equipe = await exigerEquipe();
  const retour = retourContacts(formData);
  const nom = texte(formData, "nom").slice(0, 120);
  const email = texte(formData, "email").toLowerCase();
  const memberIdChoisi = texte(formData, "memberId");
  const nomEntreprise = texte(formData, "entreprise").slice(0, 120);

  if (!nom || !email) redirectWithErreur(retour, "Le nom et le courriel du contact sont obligatoires.");
  if (!ADRESSE.test(email)) redirectWithErreur(retour, `« ${email} » n’est pas un courriel valide.`);
  if (!memberIdChoisi && !nomEntreprise) redirectWithErreur(retour, "Choisissez l’entreprise, ou donnez le nom de la nouvelle.");
  const occupe = await prisma.user.findUnique({ where: { email }, select: { member: { select: { nom: true } } } });
  if (occupe) redirectWithErreur(retour, `${email} a déjà un compte${occupe.member ? ` (${occupe.member.nom})` : ""}.`);

  let memberId = memberIdChoisi;
  let creee = false;
  if (memberId) {
    if (!(await prisma.member.findUnique({ where: { id: memberId }, select: { id: true } }))) redirectWithErreur(retour, "Entreprise introuvable.");
  } else {
    memberId = (await nouvelleEntreprise(nomEntreprise, texte(formData, "secteur"), texte(formData, "ville"))).id;
    creee = true;
  }

  const aDejaPrincipal = !creee && (await prisma.user.count({ where: { memberId, role: "membre", contactPrincipal: true } })) > 0;
  const principal = creee || !aDejaPrincipal || formData.get("principal") === "on";
  await prisma.$transaction(async (tx) => {
    if (principal) await tx.user.updateMany({ where: { memberId }, data: { contactPrincipal: false } });
    await tx.user.create({
      data: {
        role: "membre",
        memberId,
        nom,
        fonction: texte(formData, "fonction").slice(0, 120) || "Contact",
        email,
        tel: texte(formData, "tel").slice(0, 40) || null,
        contactPrincipal: principal,
      },
    });
  });
  await journal(creee ? "membre_cree" : "contact_ajoute", memberId, equipe.nom, `Contact ${nom} (${email}) ajouté depuis la page Contacts.`);
  revalidatePath("/admin", "layout");
  redirectWithFlash(retour, creee ? `${nom} et sa nouvelle entreprise ont été ajoutés` : `${nom} a été ajouté`);
}

export type BilanImport = {
  entreprisesCreees: number;
  contactsCrees: number;
  contactsMisAJour: number;
  ignores: { email: string; raison: string }[];
};

// Import CSV (lignes déjà mises en correspondance dans le navigateur, revérifiées ici)
export async function importerContacts(lignes: unknown[]): Promise<BilanImport> {
  const equipe = await exigerEquipe();
  const bilan: BilanImport = { entreprisesCreees: 0, contactsCrees: 0, contactsMisAJour: 0, ignores: [] };
  if (!Array.isArray(lignes)) return bilan;

  const membres = await prisma.member.findMany({ select: { id: true, nom: true } });
  const parNom = new Map(membres.map((m) => [m.nom.trim().toLowerCase(), m.id]));
  const tagsPoses = new Set<string>();

  for (const brute of lignes.slice(0, LIGNES_IMPORT_MAX)) {
    const l = ligneValide(brute);
    if (!l) {
      const email = brute && typeof brute === "object" && typeof (brute as { email?: unknown }).email === "string" ? (brute as { email: string }).email : "?";
      bilan.ignores.push({ email, raison: "ligne incomplète ou courriel invalide" });
      continue;
    }

    const existant = await prisma.user.findUnique({ where: { email: l.email }, select: { id: true, role: true, memberId: true } });
    let memberId = parNom.get(l.entreprise.toLowerCase());
    if (existant && (existant.role !== "membre" || (memberId && existant.memberId !== memberId))) {
      bilan.ignores.push({ email: l.email, raison: existant.role === "membre" ? "déjà contact d’une autre entreprise" : "compte de l’équipe" });
      continue;
    }
    if (!memberId) {
      if (existant?.memberId) memberId = existant.memberId;
      else {
        memberId = (await nouvelleEntreprise(l.entreprise, l.secteur, l.ville)).id;
        parNom.set(l.entreprise.toLowerCase(), memberId);
        bilan.entreprisesCreees++;
        await journal("membre_cree", memberId, equipe.nom, `Import CSV de ${l.entreprise}.`);
      }
    }

    if (existant) {
      await prisma.user.update({
        where: { id: existant.id },
        data: { nom: l.nom, ...(l.fonction ? { fonction: l.fonction } : {}), ...(l.tel ? { tel: l.tel } : {}) },
      });
      bilan.contactsMisAJour++;
    } else {
      const principal = (await prisma.user.count({ where: { memberId, role: "membre", contactPrincipal: true } })) === 0;
      await prisma.user.create({
        data: { role: "membre", memberId, nom: l.nom, fonction: l.fonction || "Contact", email: l.email, tel: l.tel || null, contactPrincipal: principal },
      });
      bilan.contactsCrees++;
    }

    if (l.tags.length) {
      const m = await prisma.member.findUnique({ where: { id: memberId }, select: { etiquettes: true } });
      const nouveaux = l.tags.filter((t) => !m?.etiquettes.includes(t));
      if (nouveaux.length) await prisma.member.update({ where: { id: memberId }, data: { etiquettes: [...(m?.etiquettes ?? []), ...nouveaux] } });
      l.tags.forEach((t) => tagsPoses.add(t));
    }
  }

  await garderTags([...tagsPoses]);
  revalidatePath("/admin", "layout");
  return bilan;
}

// Sélection : ajouter des tags à plusieurs entreprises
export async function ajouterTagsEntreprises(formData: FormData) {
  await exigerEquipe();
  const retour = retourContacts(formData);
  const ids = formData.getAll("entreprises").map(String).filter(Boolean);
  const tags = tagsDe(formData);
  if (!ids.length || !tags.length) redirectWithErreur(retour, "Choisissez au moins une entreprise et un tag.");
  const ms = await prisma.member.findMany({ where: { id: { in: ids } }, select: { id: true, etiquettes: true } });
  for (const m of ms) {
    const nouveaux = tags.filter((t) => !m.etiquettes.includes(t));
    if (nouveaux.length) await prisma.member.update({ where: { id: m.id }, data: { etiquettes: [...m.etiquettes, ...nouveaux] } });
  }
  await garderTags(tags);
  revalidatePath("/admin", "layout");
  redirectWithFlash(retour, `${pluriel(tags.length, "tag")} ajouté${tags.length > 1 ? "s" : ""} à ${pluriel(ms.length, "entreprise")}`);
}

// Sélection : retirer des tags de plusieurs entreprises (les tags restent dans la liste des tags)
export async function retirerTagsEntreprises(formData: FormData) {
  await exigerEquipe();
  const retour = retourContacts(formData);
  const ids = formData.getAll("entreprises").map(String).filter(Boolean);
  const tags = tagsDe(formData);
  if (!ids.length || !tags.length) redirectWithErreur(retour, "Choisissez au moins une entreprise et un tag.");
  const ms = await prisma.member.findMany({ where: { id: { in: ids }, etiquettes: { hasSome: tags } }, select: { id: true, etiquettes: true } });
  for (const m of ms) await prisma.member.update({ where: { id: m.id }, data: { etiquettes: m.etiquettes.filter((t) => !tags.includes(t)) } });
  revalidatePath("/admin", "layout");
  redirectWithFlash(retour, `${pluriel(tags.length, "tag")} retiré${tags.length > 1 ? "s" : ""} de ${pluriel(ms.length, "entreprise")}`);
}
