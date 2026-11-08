"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { courrielsActifs, envoyerCourriel, urlPublique } from "@/lib/courriel";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { ficheParApi, exigerEquipe } from "@/lib/autorisations";
import { nettoyer, prerempli, progression, type Reponses } from "@/lib/maillage";
import { courrielRelanceMaillage } from "@/lib/modeles-courriels";
import { notifierMembre } from "@/lib/push";
import { getCurrentUser } from "@/lib/session";
import type { Prisma } from "@/lib/generated/prisma/client";

const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function journal(action: string, entiteId: string, acteur: string, detail?: string) {
  await prisma.auditLog.create({ data: { action, entite: "Member", entiteId, acteur, detail } });
}

// Enregistre une partie des réponses (appelé au fil de la saisie, depuis la fenêtre du questionnaire).
// Le membre ne remplit que le sien ; l'équipe peut remplir celui de n'importe quel membre.
export async function enregistrerMaillage(memberId: string, patch: unknown) {
  const acces = await ficheParApi(memberId);
  if (!acces.ok) return { ok: false as const, erreur: acces.erreur };
  const r = nettoyer(patch);
  if (!Object.keys(r).length) return { ok: false as const, erreur: "Aucune réponse à enregistrer." };

  const m = await prisma.member.findUnique({
    where: { id: acces.memberId },
    select: { nom: true, siteweb: true, secteur: true, desc: true, activite: true, maillage: true },
  });
  if (!m) return { ok: false as const, erreur: "Fiche introuvable." };
  const avant = (m.maillage?.reponses ?? {}) as Reponses;
  // Première réponse : on part des informations de la fiche pour ne pas les perdre
  const reponses = { ...(Object.keys(avant).length ? avant : prerempli(m)), ...r } as Prisma.InputJsonObject;
  const par = acces.estEquipe ? `${acces.nom} (équipe)` : acces.nom;
  const mg = await prisma.maillage.upsert({
    where: { memberId: acces.memberId },
    create: { memberId: acces.memberId, reponses, rempliPar: par, commenceLe: new Date() },
    update: { reponses, rempliPar: par, commenceLe: m.maillage?.commenceLe ?? new Date() },
  });
  const p = progression(reponses as Reponses);
  if (p.pct === 100 && !mg.completeLe) {
    await prisma.maillage.update({ where: { memberId: acces.memberId }, data: { completeLe: new Date() } });
    await journal("maillage_complete", acces.memberId, par, `${m.nom} a répondu aux ${p.total} questions essentielles.`);
  }
  return { ok: true as const, ...p };
}

// Relance (équipe) : courriel au contact principal et notification sur ses appareils
export async function relancerMaillage(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "memberId");
  const fiche = `/admin/membres/${id}?onglet=maillage`;
  const m = await prisma.member.findUnique({ where: { id }, select: { nom: true, maillage: { select: { reponses: true } } } });
  if (!m) redirectWithErreur("/admin/membres", "Membre introuvable.");
  const contact = await prisma.user.findFirst({
    where: { memberId: id, role: "membre" },
    orderBy: [{ contactPrincipal: "desc" }, { createdAt: "asc" }],
    select: { nom: true, email: true },
  });
  if (!contact) redirectWithErreur(fiche, `${m.nom} n’a aucun contact à qui écrire : ajoutez-en un d’abord.`);

  const p = progression((m.maillage?.reponses ?? {}) as Reponses);
  const envoye = await envoyerCourriel(
    courrielRelanceMaillage(contact.email, {
      nom: contact.nom,
      entreprise: m.nom,
      faites: p.faites,
      total: p.total,
      lien: await urlPublique("/membre/profil?onglet=maillage&repondre=1"),
    }),
  );
  after(() =>
    notifierMembre(id, {
      titre: "Questionnaire de maillage",
      corps: "La Chambre vous invite à répondre au questionnaire pour vous présenter des partenaires.",
      url: "/membre/profil?onglet=maillage&repondre=1",
    }),
  );
  const acteur = (await getCurrentUser("admin")).nom;
  await prisma.maillage.upsert({
    where: { memberId: id },
    create: { memberId: id, relanceLe: new Date() },
    update: { relanceLe: new Date() },
  });
  await journal("maillage_relance", id, acteur, `Relance envoyée à ${contact.email}${envoye ? "" : " (courriel non parti)"}.`);
  revalidatePath(`/admin/membres/${id}`);
  if (!envoye) {
    redirectWithErreur(
      fiche,
      courrielsActifs()
        ? `La relance n’a pas pu partir vers ${contact.email}. Réessayez plus tard.`
        : "Relance notée et notification envoyée ; l’envoi de courriels n’est pas encore configuré (RESEND_API_KEY).",
    );
  }
  redirectWithFlash(fiche, `Relance envoyée à ${contact.email}`);
}

// Mettre deux membres en relation (équipe), depuis une suggestion
export async function mettreEnRelation(formData: FormData) {
  await exigerEquipe();
  const a = texte(formData, "a"), b = texte(formData, "b");
  const note = texte(formData, "note") || null;
  const retour = texte(formData, "retour").startsWith("/admin") ? texte(formData, "retour") : "/admin/maillage";
  if (!a || !b || a === b) redirectWithErreur(retour, "Choisissez deux membres différents.");
  const [x, y] = [a, b].sort();
  const noms = await prisma.member.findMany({ where: { id: { in: [x, y] } }, select: { id: true, nom: true } });
  if (noms.length !== 2) redirectWithErreur(retour, "Membre introuvable.");
  await prisma.miseEnRelation.upsert({
    where: { memberAId_memberBId: { memberAId: x, memberBId: y } },
    create: { memberAId: x, memberBId: y, note },
    update: { statut: "relation", note },
  });
  const acteur = (await getCurrentUser("admin")).nom;
  const [na, nb] = [noms.find((n) => n.id === x)!.nom, noms.find((n) => n.id === y)!.nom];
  await journal("mise_en_relation", x, acteur, `${na} ↔ ${nb}`);
  after(async () => {
    await notifierMembre(x, { titre: "Nouvelle mise en relation", corps: `La Chambre vous présente ${nb}.`, url: "/membre/profil?onglet=maillage" });
    await notifierMembre(y, { titre: "Nouvelle mise en relation", corps: `La Chambre vous présente ${na}.`, url: "/membre/profil?onglet=maillage" });
  });
  revalidatePath("/", "layout");
  redirectWithFlash(retour, `${na} et ${nb} sont mis en relation`);
}

// Écarter une suggestion : elle ne revient plus
export async function ecarterSuggestion(formData: FormData) {
  await exigerEquipe();
  const [x, y] = [texte(formData, "a"), texte(formData, "b")].sort();
  const retour = texte(formData, "retour").startsWith("/admin") ? texte(formData, "retour") : "/admin/maillage";
  if (x && y && x !== y) {
    await prisma.miseEnRelation.upsert({
      where: { memberAId_memberBId: { memberAId: x, memberBId: y } },
      create: { memberAId: x, memberBId: y, statut: "ignoree" },
      update: { statut: "ignoree" },
    });
  }
  revalidatePath("/admin/maillage");
  redirectWithFlash(retour, "Suggestion écartée");
}

// Étiquettes d'un membre : repères internes (équipe seulement), ce qu'il propose, recherche, ce qui l'intéresse
const CHAMPS_ETIQUETTES = ["etiquettes", "offresTags", "besoinsTags", "interetsTags"] as const;
export type ChampEtiquettes = (typeof CHAMPS_ETIQUETTES)[number];

export async function majEtiquettes(memberId: string, champ: ChampEtiquettes, valeurs: string[]) {
  if (!CHAMPS_ETIQUETTES.includes(champ)) return { ok: false as const, erreur: "Champ inconnu." };
  const acces = await ficheParApi(memberId);
  if (!acces.ok) return { ok: false as const, erreur: acces.erreur };
  if (champ === "etiquettes" && !acces.estEquipe) return { ok: false as const, erreur: "Réservé à l’équipe." };
  const propres = [...new Set(valeurs.map((v) => String(v).trim().slice(0, 60)).filter(Boolean))].slice(0, 20);
  await prisma.member.update({ where: { id: acces.memberId }, data: { [champ]: propres } });
  revalidatePath(acces.estEquipe ? `/admin/membres/${acces.memberId}` : "/membre/profil");
  return { ok: true as const, valeurs: propres };
}

/* ===== Page Étiquettes (équipe) : renommer, supprimer, attribuer à plusieurs membres ===== */
const propreEtiquette = (v: string) => v.trim().replace(/\s+/g, " ").slice(0, 60);

export async function renommerEtiquette(formData: FormData) {
  await exigerEquipe();
  const ancien = texte(formData, "ancien"), nouveau = propreEtiquette(texte(formData, "nouveau"));
  if (!ancien || !nouveau) redirectWithErreur("/admin/etiquettes", "Indiquez le nouveau nom.");
  const ms = await prisma.member.findMany({ where: { etiquettes: { has: ancien } }, select: { id: true, etiquettes: true } });
  for (const m of ms) {
    await prisma.member.update({ where: { id: m.id }, data: { etiquettes: [...new Set(m.etiquettes.map((e) => (e === ancien ? nouveau : e)))] } });
  }
  revalidatePath("/admin", "layout");
  redirectWithFlash(`/admin/etiquettes?e=${encodeURIComponent(nouveau)}`, `« ${ancien} » renommée en « ${nouveau} »`);
}

export async function supprimerEtiquette(formData: FormData) {
  await exigerEquipe();
  const nom = texte(formData, "nom");
  const ms = await prisma.member.findMany({ where: { etiquettes: { has: nom } }, select: { id: true, etiquettes: true } });
  for (const m of ms) await prisma.member.update({ where: { id: m.id }, data: { etiquettes: m.etiquettes.filter((e) => e !== nom) } });
  revalidatePath("/admin", "layout");
  redirectWithFlash("/admin/etiquettes", `Étiquette « ${nom} » retirée de ${ms.length} membre${ms.length > 1 ? "s" : ""}`);
}

export async function attribuerEtiquette(formData: FormData) {
  await exigerEquipe();
  const nom = propreEtiquette(texte(formData, "nom"));
  const ids = formData.getAll("membres").map(String).filter(Boolean);
  if (!nom || !ids.length) redirectWithErreur("/admin/etiquettes", "Choisissez une étiquette et au moins un membre.");
  const ms = await prisma.member.findMany({ where: { id: { in: ids } }, select: { id: true, etiquettes: true } });
  for (const m of ms) if (!m.etiquettes.includes(nom)) await prisma.member.update({ where: { id: m.id }, data: { etiquettes: [...m.etiquettes, nom] } });
  revalidatePath("/admin", "layout");
  redirectWithFlash(`/admin/etiquettes?e=${encodeURIComponent(nom)}`, `« ${nom} » ajoutée à ${ms.length} membre${ms.length > 1 ? "s" : ""}`);
}

export async function retirerEtiquetteMembre(formData: FormData) {
  await exigerEquipe();
  const nom = texte(formData, "nom"), id = texte(formData, "memberId");
  const m = await prisma.member.findUnique({ where: { id }, select: { etiquettes: true } });
  if (m) await prisma.member.update({ where: { id }, data: { etiquettes: m.etiquettes.filter((e) => e !== nom) } });
  revalidatePath("/admin", "layout");
  redirectWithFlash(`/admin/etiquettes?e=${encodeURIComponent(nom)}`, "Étiquette retirée");
}
