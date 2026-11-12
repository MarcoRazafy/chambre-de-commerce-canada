"use server";

import { revalidatePath } from "next/cache";
import { PROVISOIRE } from "@/lib/accueil";
import { exigerEquipe } from "@/lib/autorisations";
import { prisma, prismaSysteme } from "@/lib/db";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { jourBase } from "@/lib/format";
import { LIGNES_IMPORT_MAX, ligneValide, nomComplet } from "@/lib/import-contacts";
import { secteurOuProvisoire } from "@/lib/secteurs";
import { enregistrerImage, ImageRefusee } from "@/lib/uploads";
import { chambreCourante } from "@/lib/chambre-courante";

// Page Contacts (équipe) : ajouter un contact, importer un CSV, poser ou retirer des tags sur une sélection

const ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const retourContacts = (fd: FormData) => {
  const r = texte(fd, "retour");
  return r.startsWith("/admin/contacts") ? r : "/admin/contacts";
};
const garderTags = async (noms: string[]) => {
  const chambreId = await chambreCourante();
  for (const nom of noms) await prisma.tag.upsert({ where: { chambreId_nom: { chambreId, nom } }, create: { nom }, update: {} });
};
const tagsDe = (fd: FormData) =>
  [...new Set(fd.getAll("tags").map((t) => String(t).trim().replace(/\s+/g, " ").slice(0, 60)).filter(Boolean))].slice(0, 20);

async function journal(action: string, entiteId: string, acteur: string, detail: string) {
  await prisma.auditLog.create({ data: { action, entite: "Member", entiteId, acteur, detail } });
}

// Nouvelle entreprise, comme « Ajouter un membre » : en attente de paiement, fiche à compléter
function nouvelleEntreprise(nom: string, secteur: string, ville: string, logo: string | null = null) {
  return prisma.member.create({
    data: {
      type: "morale",
      nom,
      logo,
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

// « Ajouter un contact » : à une entreprise existante, avec une nouvelle entreprise, ou seul (sans entreprise)
export async function ajouterContact(formData: FormData) {
  const equipe = await exigerEquipe();
  const retour = retourContacts(formData);
  const nom = texte(formData, "nom").slice(0, 120);
  const email = texte(formData, "email").toLowerCase();
  const memberIdChoisi = texte(formData, "memberId");
  const nomEntreprise = texte(formData, "entreprise").slice(0, 120);

  if (!nom || !email) redirectWithErreur(retour, "Le nom et le courriel du contact sont obligatoires.");
  if (!ADRESSE.test(email)) redirectWithErreur(retour, `« ${email} » n’est pas un courriel valide.`);
  // Sans entreprise : un contact seul, qui reçoit la newsletter envoyée à tous
  if (!memberIdChoisi && !nomEntreprise) {
    await prisma.abonne.upsert({
      where: { chambreId_email: { chambreId: await chambreCourante(), email } },
      update: { prenom: nom, desabonneLe: null, erreurLe: null },
      create: { prenom: nom, email, source: "equipe" },
    });
    revalidatePath("/admin/contacts");
    redirectWithFlash(retour, `${nom} a été ajouté (sans entreprise)`);
  }
  // Une adresse = un seul espace : cherchée dans toutes les Chambres (sans rien montrer d'une autre)
  const occupe = await prismaSysteme.user.findUnique({ where: { email }, select: { chambreId: true, member: { select: { nom: true } } } });
  if (occupe && occupe.chambreId !== (await chambreCourante())) redirectWithErreur(retour, `${email} est déjà utilisée sur un autre espace.`);
  if (occupe) redirectWithErreur(retour, `${email} a déjà un compte${occupe.member ? ` (${occupe.member.nom})` : ""}.`);

  let memberId = memberIdChoisi;
  let creee = false;
  if (memberId) {
    if (!(await prisma.member.findUnique({ where: { id: memberId }, select: { id: true } }))) redirectWithErreur(retour, "Entreprise introuvable.");
  } else {
    // Logo facultatif de la nouvelle entreprise, vérifié avant de créer quoi que ce soit
    let logo: string | null = null;
    try {
      logo = await enregistrerImage(formData.get("logo"), { prefixe: `logo-${crypto.randomUUID().slice(0, 8)}`, largeur: 600, transparence: true });
    } catch (e) {
      if (e instanceof ImageRefusee) redirectWithErreur(retour, e.message);
      throw e;
    }
    memberId = (await nouvelleEntreprise(nomEntreprise, texte(formData, "secteur"), texte(formData, "ville"), logo)).id;
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
  const ici = await chambreCourante();

  for (const brute of lignes.slice(0, LIGNES_IMPORT_MAX)) {
    const l = ligneValide(brute);
    if (!l) {
      const email = brute && typeof brute === "object" && typeof (brute as { email?: unknown }).email === "string" ? (brute as { email: string }).email : "?";
      bilan.ignores.push({ email, raison: "ligne incomplète ou courriel invalide" });
      continue;
    }

    const existant = await prismaSysteme.user.findUnique({ where: { email: l.email }, select: { id: true, role: true, memberId: true, chambreId: true } });
    if (existant && existant.chambreId !== ici) {
      bilan.ignores.push({ email: l.email, raison: "adresse déjà utilisée sur un autre espace" });
      continue;
    }
    const nom = nomComplet(l);

    // Sans entreprise : un contact de l'onglet « Sans entreprise » (créé, ou remis s'il avait été retiré)
    if (!l.entreprise) {
      if (existant) {
        bilan.ignores.push({ email: l.email, raison: existant.role === "admin" ? "compte de l’équipe" : "déjà contact d’une entreprise" });
        continue;
      }
      const deja = await prisma.abonne.findFirst({ where: { email: l.email }, select: { id: true, etiquettes: true } });
      await prisma.abonne.upsert({
        where: { chambreId_email: { chambreId: await chambreCourante(), email: l.email } },
        create: { email: l.email, prenom: nom, source: "import", etiquettes: l.tags },
        update: { prenom: nom, desabonneLe: null, etiquettes: [...new Set([...(deja?.etiquettes ?? []), ...l.tags])] },
      });
      l.tags.forEach((t) => tagsPoses.add(t));
      if (deja) bilan.contactsMisAJour++;
      else bilan.contactsCrees++;
      continue;
    }

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
        data: { nom, ...(l.fonction ? { fonction: l.fonction } : {}), ...(l.tel ? { tel: l.tel } : {}) },
      });
      bilan.contactsMisAJour++;
    } else {
      const principal = (await prisma.user.count({ where: { memberId, role: "membre", contactPrincipal: true } })) === 0;
      await prisma.user.create({
        data: { role: "membre", memberId, nom, fonction: l.fonction || "Contact", email: l.email, tel: l.tel || null, contactPrincipal: principal },
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

// Retirer un contact sans entreprise : il ne reçoit plus la newsletter (son adresse reste connue)
export async function retirerContactSeul(formData: FormData) {
  await exigerEquipe();
  const retour = retourContacts(formData);
  const a = await prisma.abonne.update({ where: { id: texte(formData, "id") }, data: { desabonneLe: new Date() } });
  revalidatePath("/admin/contacts");
  redirectWithFlash(retour, `${a.prenom || a.email} a été retiré`);
}

// Sélection (contacts sans entreprise) : retirer plusieurs contacts d'un coup ; ils ne reçoivent plus la newsletter
export async function retirerContactsSeuls(formData: FormData) {
  await exigerEquipe();
  const retour = retourContacts(formData);
  const ids = formData.getAll("contacts").map(String).filter(Boolean);
  if (!ids.length) redirectWithErreur(retour, "Choisissez au moins un contact.");
  const { count } = await prisma.abonne.updateMany({ where: { id: { in: ids }, desabonneLe: null }, data: { desabonneLe: new Date() } });
  revalidatePath("/admin/contacts");
  redirectWithFlash(retour, `${count} contact${count > 1 ? "s" : ""} retiré${count > 1 ? "s" : ""}`);
}

// Sélection (contacts sans entreprise) : ajouter des tags à plusieurs contacts
export async function ajouterTagsContactsSeuls(formData: FormData) {
  await exigerEquipe();
  const retour = retourContacts(formData);
  const ids = formData.getAll("contacts").map(String).filter(Boolean);
  const tags = tagsDe(formData);
  if (!ids.length || !tags.length) redirectWithErreur(retour, "Choisissez au moins un contact et un tag.");
  const cs = await prisma.abonne.findMany({ where: { id: { in: ids } }, select: { id: true, etiquettes: true } });
  for (const c of cs) {
    const nouveaux = tags.filter((t) => !c.etiquettes.includes(t));
    if (nouveaux.length) await prisma.abonne.update({ where: { id: c.id }, data: { etiquettes: [...c.etiquettes, ...nouveaux] } });
  }
  await garderTags(tags);
  revalidatePath("/admin", "layout");
  redirectWithFlash(retour, `${pluriel(tags.length, "tag")} ajouté${tags.length > 1 ? "s" : ""} à ${cs.length} contact${cs.length > 1 ? "s" : ""}`);
}

// Sélection (contacts sans entreprise) : retirer des tags de plusieurs contacts
export async function retirerTagsContactsSeuls(formData: FormData) {
  await exigerEquipe();
  const retour = retourContacts(formData);
  const ids = formData.getAll("contacts").map(String).filter(Boolean);
  const tags = tagsDe(formData);
  if (!ids.length || !tags.length) redirectWithErreur(retour, "Choisissez au moins un contact et un tag.");
  const cs = await prisma.abonne.findMany({ where: { id: { in: ids }, etiquettes: { hasSome: tags } }, select: { id: true, etiquettes: true } });
  for (const c of cs) await prisma.abonne.update({ where: { id: c.id }, data: { etiquettes: c.etiquettes.filter((t) => !tags.includes(t)) } });
  revalidatePath("/admin", "layout");
  redirectWithFlash(retour, `${pluriel(tags.length, "tag")} retiré${tags.length > 1 ? "s" : ""} de ${cs.length} contact${cs.length > 1 ? "s" : ""}`);
}

// Fiche d'un contact sans entreprise : ses tags
export async function majTagsContactSeul(formData: FormData) {
  await exigerEquipe();
  const retour = retourContacts(formData);
  const tags = tagsDe(formData);
  const c = await prisma.abonne.update({ where: { id: texte(formData, "id") }, data: { etiquettes: tags }, select: { prenom: true, email: true } });
  await garderTags(tags);
  revalidatePath("/admin", "layout");
  redirectWithFlash(retour, `Tags de ${c.prenom || c.email} enregistrés`);
}

// Page d'un tag : retirer ce tag d'un contact sans entreprise
export async function retirerTagContactSeul(formData: FormData) {
  await exigerEquipe();
  const tag = texte(formData, "tag");
  const c = await prisma.abonne.findUnique({ where: { id: texte(formData, "id") }, select: { id: true, prenom: true, email: true, etiquettes: true } });
  const page = `/admin/etiquettes?e=${encodeURIComponent(tag)}`;
  if (!c) redirectWithErreur(page, "Contact introuvable.");
  await prisma.abonne.update({ where: { id: c.id }, data: { etiquettes: c.etiquettes.filter((t) => t !== tag) } });
  revalidatePath("/admin", "layout");
  redirectWithFlash(page, `« ${tag} » retiré de ${c.prenom || c.email}`);
}
