"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { delivrerBillets, delivrerBilletsPublics } from "@/lib/billets";
import { inscriptionPublique } from "@/lib/paiements";
import { envoyerCourriel, urlPublique } from "@/lib/courriel";
import { courrielReglementEcarte } from "@/lib/modeles-courriels";
import { ouvrirChezLePrestataire } from "@/lib/paiement-en-ligne";
import { vanillaPayActif } from "@/lib/vanillapay";
import { ouvrirFactureCotisation, payableEnLigne } from "@/lib/cotisation";
import { detailAchat, estTypeAchat, pageAchat } from "@/lib/achat";
import { examinerAchat } from "@/lib/achats-en-ligne";
import { prisma } from "@/lib/db";
import { exigerEquipe } from "@/lib/autorisations";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { ajouterJours, estJourISO } from "@/lib/agenda";
import { aujourdhuiISO, fmtDate, jourBase } from "@/lib/format";
import { fmtMontant } from "@/lib/membership";
import { getCurrentUser } from "@/lib/session";
import {
  estModeReglement,
  MODES,
  modesProposes,
  referenceReglement,
  type ModeReglement,
} from "@/lib/reglements";
import { after } from "next/server";
import { notifierEquipe, notifierMembre } from "@/lib/push";
import { chambreCourante } from "@/lib/chambre-courante";

const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function journal(
  action: string,
  entiteId: string,
  detail: string,
  acteur: string,
) {
  await prisma.auditLog.create({
    data: { action, entite: "Invoice", entiteId, acteur, detail },
  });
}

export async function enregistrerCoordonneesPaiement(formData: FormData) {
  await exigerEquipe();
  const retour = "/admin/reglements/coordonnees";

  const champs = {
    titulaire: texte(formData, "titulaire"),
    banque: texte(formData, "banque"),
    agence: texte(formData, "agence"),
    rib: texte(formData, "rib"),
    iban: texte(formData, "iban").toUpperCase().replace(/\s+/g, " "),
    bic: texte(formData, "bic").toUpperCase(),
    mvola: texte(formData, "mvola"),
    orangeMoney: texte(formData, "orangeMoney"),
    airtelMoney: texte(formData, "airtelMoney"),
    adresseBureau: texte(formData, "adresseBureau"),
    horaires: texte(formData, "horaires"),
    plateformes: texte(formData, "plateformes"),
  };

  await prisma.coordonneesPaiement.upsert({
    where: { chambreId: await chambreCourante() },
    create: { ...champs },
    update: champs,
  });
  revalidatePath("/", "layout");
  redirectWithFlash(retour, "Coordonnées enregistrées");
}

async function modeDemande(formData: FormData, retour: string) {
  const mode = texte(formData, "mode");
  if (!estModeReglement(mode)) {
    redirectWithErreur(retour, "Choisissez un moyen de paiement.");
  }
  if (!(await modesProposes()).includes(mode)) {
    redirectWithErreur(retour, `${MODES[mode].titre} : pas encore disponible.`);
  }
  return mode;
}

async function ouvrirTunnel(
  user: { memberId: string | null; nom: string },
  factureId: string,
  mode: ModeReglement,
): Promise<never> {
  const f = await prisma.invoice.findUnique({
    where: { id: factureId },
    select: {
      id: true,
      numero: true,
      montant: true,
      devise: true,
      statut: true,
      memberId: true,
    },
  });
  if (!f || !user.memberId || f.memberId !== user.memberId) {
    redirectWithErreur("/membre/cotisations", "Facture introuvable.");
  }
  if (f.statut === "payee") {
    redirectWithErreur(
      "/membre/cotisations",
      `La facture ${f.numero} est déjà réglée.`,
    );
  }

  const ouvert = await prisma.paiement.findFirst({
    where: { invoiceId: f.id, mode, statut: "en_cours" },
    select: { id: true, montant: true },
  });
  const p =
    ouvert ??
    (await prisma.paiement.create({
      data: {
        reference: referenceReglement(),
        invoiceId: f.id,
        memberId: f.memberId,
        montant: f.montant,
        devise: f.devise,
        mode,
      },
      select: { id: true, montant: true },
    }));
  const page = `/membre/cotisations/payer/${p.id}`;

  if (mode === "carte" && vanillaPayActif() && f.devise === "MGA") {
    const ouverture = await ouvrirChezLePrestataire(
      { id: p.id, montant: p.montant, numeroFacture: f.numero },
      "international",
      { titulaire: user.nom },
    );
    if ("raison" in ouverture) redirectWithErreur(page, ouverture.raison);
    redirect(ouverture.url);
  }

  redirect(page);
}

export async function ouvrirReglement(formData: FormData) {
  const user = await getCurrentUser("membre");
  const factureId = texte(formData, "factureId");
  const mode = await modeDemande(
    formData,
    `/membre/cotisations?regler=${factureId}`,
  );
  await ouvrirTunnel(user, factureId, mode);
}

export async function reglerAchat(formData: FormData) {
  const user = await getCurrentUser("membre");
  const type = texte(formData, "achat");
  const cible = texte(formData, "cible");
  if (!estTypeAchat(type) || !cible || !user.memberId) {
    redirectWithErreur("/membre", "Achat introuvable.");
  }
  const retour = pageAchat({ type, id: cible });

  const examen = await examinerAchat(type, cible);
  if (!examen.ok) {
    if (examen.dejaOuvert) redirectWithFlash(retour, examen.raison);
    redirectWithErreur(
      type === "ressource" ? "/membre/ressources" : retour,
      examen.raison,
    );
  }
  const { achat } = examen;
  const mode = await modeDemande(formData, retour);
  const detail = detailAchat(achat, user.id);

  const ouvert = await prisma.paiement.findFirst({
    where: {
      memberId: user.memberId,
      invoiceId: null,
      mode,
      statut: "en_cours",
      AND: [
        { detail: { path: ["achat"], equals: achat.type } },
        { detail: { path: ["cible"], equals: achat.id } },
      ],
    },
    select: { id: true },
  });
  const p = ouvert
    ? await prisma.paiement.update({
        where: { id: ouvert.id },
        data: { montant: achat.prix, detail },
        select: { id: true },
      })
    : await prisma.paiement.create({
        data: {
          reference: referenceReglement(),
          memberId: user.memberId,
          montant: achat.prix,
          devise: "MGA",
          mode,
          detail,
        },
        select: { id: true },
      });
  const page = `/membre/cotisations/payer/${p.id}`;

  if (mode === "carte") {
    const ouverture = await ouvrirChezLePrestataire(
      { id: p.id, montant: achat.prix, numeroFacture: null },
      "international",
      { ...detail, titulaire: user.nom },
    );
    if ("raison" in ouverture) redirectWithErreur(page, ouverture.raison);
    redirect(ouverture.url);
  }

  redirect(page);
}

export async function reglerCotisation(formData: FormData) {
  const user = await getCurrentUser("membre");
  const retour = "/membre/cotisations";
  const mode = await modeDemande(formData, retour);

  const facture = user.memberId
    ? await ouvrirFactureCotisation(user.memberId)
    : null;
  if (!facture) {
    redirectWithErreur(
      retour,
      "Aucune cotisation à régler en ligne pour le moment : écrivez à l’équipe.",
    );
  }
  if (!payableEnLigne(facture.montant, facture.devise)) {
    redirectWithErreur(
      retour,
      "Cette cotisation ne se règle pas en ligne : réglez-la auprès de l’équipe CanCham.",
    );
  }
  await ouvrirTunnel(user, facture.id, mode);
}

export async function preparerRemiseEspeces(formData: FormData) {
  const user = await getCurrentUser("membre");
  const id = texte(formData, "reglementId");

  const p = await prisma.paiement.findUnique({
    where: { id },
    select: {
      id: true,
      memberId: true,
      mode: true,
      statut: true,
      reference: true,
      montant: true,
      devise: true,
      member: { select: { nom: true } },
    },
  });
  if (!p || !user.memberId || p.memberId !== user.memberId) {
    redirectWithErreur("/membre/cotisations", "Règlement introuvable.");
  }
  const page = `/membre/cotisations/payer/${p.id}`;
  const formulaire = `${page}?modifier=1`;
  if (p.mode !== "especes") {
    redirectWithErreur(page, "Ce règlement ne se fait pas en espèces.");
  }
  if (p.statut === "reussie") {
    redirectWithFlash("/membre/cotisations", "Ce règlement est déjà encaissé.");
  }

  const lieu = texte(formData, "lieu") === "domicile" ? "domicile" : "bureau";
  const adresse = texte(formData, "adresse").replace(/\s+/g, " ").slice(0, 200);
  if (lieu === "domicile" && !adresse) {
    redirectWithErreur(formulaire, "Indiquez où l’équipe doit passer.");
  }

  const jour = texte(formData, "jour");
  const aujourdhui = aujourdhuiISO();
  if (!estJourISO(jour)) {
    redirectWithErreur(formulaire, "Choisissez le jour de la remise.");
  }
  if (jour < aujourdhui) {
    redirectWithErreur(formulaire, "Ce jour est déjà passé.");
  }
  if (jour > ajouterJours(aujourdhui, 90)) {
    redirectWithErreur(
      formulaire,
      "Choisissez un jour dans les trois prochains mois.",
    );
  }
  const moment =
    texte(formData, "moment") === "apres-midi" ? "apres-midi" : "matin";

  await prisma.paiement.update({
    where: { id: p.id },
    data: {
      statut: "annonce",
      annonceLe: new Date(),
      detail: {
        lieu,
        adresse: lieu === "domicile" ? adresse : null,
        jour,
        moment,
        remisPar: user.nom,
      },
    },
  });
  after(() =>
    notifierEquipe({
      titre: "Remise en espèces annoncée",
      corps: `${p.member?.nom ?? user.nom} · ${fmtMontant(p.montant, p.devise)} · ${lieu === "domicile" ? "à domicile" : "au bureau"} le ${fmtDate(jour, { day: "numeric", month: "long" })}, ${moment === "matin" ? "le matin" : "l’après-midi"}`,
      url: "/admin/reglements",
      etiquette: `reglement-${p.id}`,
    }),
  );
  revalidatePath("/", "layout");
  redirect(page);
}

export async function annoncerReglement(formData: FormData) {
  const user = await getCurrentUser("membre");
  const id = texte(formData, "reglementId");

  const p = await prisma.paiement.findUnique({
    where: { id },
    select: {
      id: true,
      memberId: true,
      statut: true,
      reference: true,
      mode: true,
      montant: true,
      devise: true,
      member: { select: { nom: true } },
    },
  });
  if (!p || !user.memberId || p.memberId !== user.memberId) {
    redirectWithErreur("/membre/cotisations", "Règlement introuvable.");
  }
  if (p.statut === "reussie") {
    redirectWithFlash("/membre/cotisations", "Ce règlement est déjà encaissé.");
  }

  await prisma.paiement.update({
    where: { id: p.id },
    data: {
      statut: "annonce",
      annonceLe: new Date(),
      refBancaire: texte(formData, "refBancaire") || null,
    },
  });
  after(() =>
    notifierEquipe({
      titre: "Règlement annoncé",
      corps: `${p.member?.nom ?? user.nom} · ${fmtMontant(p.montant, p.devise)} par ${MODES[p.mode as ModeReglement].titre.toLowerCase()} · réf. ${p.reference}`,
      url: "/admin/reglements",
      etiquette: `reglement-${p.id}`,
    }),
  );
  revalidatePath("/", "layout");
  redirectWithFlash(
    "/membre/cotisations",
    `Règlement ${p.reference} annoncé · l’équipe confirmera dès réception`,
  );
}

function payeurPublic(detail: unknown): string | null {
  const d = (detail ?? {}) as { titulaire?: unknown };
  return typeof d.titulaire === "string" && d.titulaire ? d.titulaire : null;
}

export async function confirmerReglement(formData: FormData) {
  const user = await exigerEquipe();
  const id = texte(formData, "reglementId");
  const retour = "/admin/reglements";

  const p = await prisma.paiement.findUnique({
    where: { id },
    include: {
      invoice: {
        select: { id: true, numero: true, objet: true, statut: true },
      },
      member: { select: { id: true, nom: true, statut: true } },
    },
  });
  if (!p) redirectWithErreur(retour, "Règlement introuvable.");
  if (p.statut === "reussie") redirectWithFlash(retour, "Déjà confirmé.");

  const cotisation =
    p.invoice !== null &&
    /^cotisation/i.test(p.invoice.objet) &&
    p.member !== null &&
    p.member.statut !== "a_jour";
  const montant = fmtMontant(p.montant, p.devise);
  const moyen = MODES[p.mode as ModeReglement].titre;

  await prisma.$transaction([
    prisma.paiement.update({
      where: { id: p.id },
      data: { statut: "reussie", regleLe: new Date(), confirmePar: user.nom },
    }),
    ...(p.invoice && p.invoice.statut !== "payee"
      ? [
          prisma.invoice.update({
            where: { id: p.invoice.id },
            data: { statut: "payee", payeeLe: jourBase() },
          }),
        ]
      : []),
    ...(cotisation && p.member
      ? [
          prisma.member.update({
            where: { id: p.member.id },
            data: {
              statut: "a_jour",
              retardDepuis: null,
              paiementNote: `Payé par ${moyen.toLowerCase()} · ${montant}`,
            },
          }),
        ]
      : []),
  ]);

  await journal(
    "reglement_confirme",
    p.invoice?.numero ?? p.reference,
    `${montant} par ${moyen.toLowerCase()} · ${p.member?.nom ?? payeurPublic(p.detail) ?? "—"} · réf. ${p.reference}`,
    user.nom,
  );
  if (p.invoice) await delivrerBillets(p.invoice.id, user.nom);
  const publique = p.invoice ? null : inscriptionPublique(p.detail);
  if (publique) {
    await delivrerBilletsPublics(
      publique.eventId,
      publique.code,
      user.nom,
      `par ${moyen.toLowerCase()}, constaté par l’équipe`,
    );
  }
  if (p.member) {
    const memberId = p.member.id;
    after(() =>
      notifierMembre(memberId, {
        titre: "Paiement confirmé",
        corps: `${montant} · réf. ${p.reference} · merci !${cotisation ? " Votre adhésion est à jour." : ""}`,
        url: p.invoice
          ? `/membre/cotisations/${p.invoice.id}`
          : "/membre/cotisations",
      }),
    );
  }
  revalidatePath("/", "layout");
  redirectWithFlash(retour, `Règlement ${p.reference} confirmé`);
}

export async function refuserReglement(formData: FormData) {
  const user = await exigerEquipe();
  const id = texte(formData, "reglementId");
  const retour = "/admin/reglements";

  const p = await prisma.paiement.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      statut: true,
      memberId: true,
      invoiceId: true,
      detail: true,
    },
  });
  if (!p) redirectWithErreur(retour, "Règlement introuvable.");
  if (p.statut === "reussie") {
    redirectWithErreur(retour, "Ce règlement est déjà encaissé.");
  }

  await prisma.paiement.update({
    where: { id: p.id },
    data: { statut: "echouee" },
  });
  if (p.memberId) {
    const memberId = p.memberId;
    after(() =>
      notifierMembre(memberId, {
        titre: "Règlement non constaté",
        corps: `Réf. ${p.reference} · l’équipe n’a pas retrouvé votre paiement. Reprenez depuis vos cotisations.`,
        url: "/membre/cotisations",
      }),
    );
  }
  const publique = p.invoiceId ? null : inscriptionPublique(p.detail);
  const email = (p.detail as { email?: unknown } | null)?.email;
  if (publique && typeof email === "string" && email.includes("@")) {
    const [event, lien] = await Promise.all([
      prisma.event.findUnique({
        where: { id: publique.eventId },
        select: { titre: true },
      }),
      urlPublique(
        `/evenements/${publique.eventId}/billet?${new URLSearchParams({ code: publique.code })}`,
      ),
    ]);
    const reference = p.reference;
    after(() =>
      envoyerCourriel(
        courrielReglementEcarte(email, {
          evenement: event?.titre ?? "votre événement",
          reference,
          lien,
        }),
      ),
    );
  }
  await journal(
    "reglement_refuse",
    p.reference,
    texte(formData, "motif") || "Argent non constaté.",
    user.nom,
  );
  revalidatePath("/", "layout");
  redirectWithFlash(retour, `Règlement ${p.reference} écarté`);
}
