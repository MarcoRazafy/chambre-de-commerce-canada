"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { lignesDe } from "@/lib/billets";
import { cheminBillet, cheminEvenementPublic, dansLaChambreDuFormulaire } from "@/lib/billet-public";
import {
  codeInscription,
  estCodeInscription,
  extraireCode,
} from "@/lib/codes-accueil";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { minutes, origineAppelante, tentative } from "@/lib/limite";
import { ouvrirChezLePrestataire } from "@/lib/paiement-en-ligne";
import { compteStripeActif } from "@/lib/encaissement-stripe";
import { estPortefeuilleConnu } from "@/lib/portefeuilles";
import { fmtMontant } from "@/lib/membership";
import { reglementPublicOuvert } from "@/lib/paiements";
import { notifierEquipe } from "@/lib/push";
import {
  estModeReglement,
  MODES,
  modesPublics,
  referenceReglement,
  type ModeReglement,
} from "@/lib/reglements";
import { getCurrentUser } from "@/lib/session";
import {
  mobileMoneyEnLigne,
  vanillaPayActif,
} from "@/lib/vanillapay";
import { prefixeNumeros } from "@/lib/prefixe-numeros";

const texte = (fd: FormData, k: string) =>
  String(fd.get(k) ?? "")
    .replace(/\s+/g, " ")
    .trim();

function detailExistant(detail: unknown): Prisma.InputJsonObject {
  return detail && typeof detail === "object" && !Array.isArray(detail)
    ? (detail as Prisma.InputJsonObject)
    : {};
}

export async function payerParCarte(formData: FormData) {
  const user = await getCurrentUser("membre");
  const id = texte(formData, "reglementId");

  const p = await prisma.paiement.findUnique({
    where: { id },
    include: {
      invoice: { select: { numero: true, objet: true, statut: true } },
    },
  });
  if (!p || !user.memberId || p.memberId !== user.memberId) {
    redirectWithErreur("/membre/cotisations", "Règlement introuvable.");
  }
  const page = `/membre/cotisations/payer/${p.id}`;
  if (p.mode !== "carte") {
    redirectWithErreur(page, "Ce règlement ne se fait pas par carte.");
  }
  if (p.statut === "reussie" || p.invoice?.statut === "payee") {
    redirectWithFlash("/membre/cotisations", "Ce règlement est déjà encaissé.");
  }

  const titulaire = texte(formData, "titulaire").slice(0, 80);
  if (!titulaire) {
    redirectWithErreur(page, "Indiquez le nom du titulaire de la carte.");
  }

  const detail = { ...detailExistant(p.detail), titulaire };
  await prisma.paiement.update({
    where: { id: p.id },
    data: { detail },
  });

  if (!(await compteStripeActif())) {
    if (!vanillaPayActif()) {
      redirectWithErreur(
        page,
        "Le paiement par carte n’est pas encore raccordé : la chambre attend ses accès au prestataire. En attendant, choisissez un autre moyen.",
      );
    }
    if (p.devise !== "MGA") {
      redirectWithErreur(page, "Le paiement par carte n’accepte que l’Ariary.");
    }
  }

  const ouverture = await ouvrirChezLePrestataire(
    { id: p.id, montant: p.montant, numeroFacture: p.invoice?.numero ?? null },
    "international",
    detail,
  );
  if ("raison" in ouverture) redirectWithErreur(page, ouverture.raison);

  redirect(ouverture.url);
}

export async function payerParPortefeuille(formData: FormData) {
  const user = await getCurrentUser("membre");
  const id = texte(formData, "reglementId");

  const p = await prisma.paiement.findUnique({
    where: { id },
    include: {
      invoice: { select: { numero: true, objet: true, statut: true } },
    },
  });
  if (!p || !user.memberId || p.memberId !== user.memberId) {
    redirectWithErreur("/membre/cotisations", "Règlement introuvable.");
  }
  const page = `/membre/cotisations/payer/${p.id}`;
  if (!estPortefeuilleConnu(p.mode)) {
    redirectWithErreur(
      page,
      "Ce règlement ne se fait pas par portefeuille mobile.",
    );
  }
  if (p.statut === "reussie" || p.invoice?.statut === "payee") {
    redirectWithFlash("/membre/cotisations", "Ce règlement est déjà encaissé.");
  }
  if (!mobileMoneyEnLigne()) {
    redirectWithErreur(
      page,
      "Le paiement depuis la plateforme n’est pas encore raccordé pour ce moyen : faites l’envoi depuis votre téléphone, comme indiqué.",
    );
  }
  if (p.devise !== "MGA") {
    redirectWithErreur(
      page,
      "Les portefeuilles mobiles n’acceptent que l’Ariary.",
    );
  }

  const ouverture = await ouvrirChezLePrestataire(
    {
      id: p.id,
      montant: p.montant,
      numeroFacture: p.invoice?.numero ?? null,
      portefeuille: p.mode,
    },
    "mobile_money",
  );
  if ("raison" in ouverture) redirectWithErreur(page, ouverture.raison);

  redirect(ouverture.url);
}

const PAIEMENTS_PUBLICS_PAR_HEURE = 10;

async function inscriptionAPayer(formData: FormData, slug: string) {
  const eventId = texte(formData, "eventId");
  const code = codeInscription(extraireCode(texte(formData, "code")));
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(eventId) || !estCodeInscription(code)) {
    redirectWithErreur(`/c/${slug}/evenements`, "Inscription introuvable.");
  }
  const page = cheminBillet(slug, eventId, { code });

  const attente = tentative(
    `paiement-public:${await origineAppelante()}`,
    PAIEMENTS_PUBLICS_PAR_HEURE,
    60 * 60 * 1000,
  );
  if (attente) {
    redirectWithErreur(
      page,
      `Trop de tentatives depuis cet appareil. Réessayez dans ${minutes(attente)} minute${minutes(attente) > 1 ? "s" : ""}.`,
    );
  }

  const [event, lignes, inscriptionMembre] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      select: { titre: true, public: true, prixPublic: true },
    }),
    prisma.attendee.findMany({
      where: { eventId, statut: "a_valider", ...lignesDe(code) },
      orderBy: { createdAt: "asc" },
      select: { nom: true, email: true, montant: true },
    }),
    prisma.registration.findUnique({ where: { code }, select: { id: true } }),
  ]);
  if (!event?.public || inscriptionMembre) {
    redirectWithErreur(cheminEvenementPublic(slug, eventId), "Inscription introuvable.");
  }
  if (!lignes.length) {
    redirectWithFlash(page, "Cette inscription est déjà réglée.");
  }
  return {
    eventId,
    code,
    page,
    event,
    lignes,
    montant: lignes.reduce((somme, l) => somme + (l.montant || event.prixPublic), 0),
  };
}

async function reglementPublic(
  eventId: string,
  code: string,
  mode: ModeReglement,
  montant: number,
  detail: Prisma.InputJsonObject,
) {
  const ouvert = await reglementPublicOuvert(eventId, code);
  if (ouvert?.statut === "annonce") return null;

  if (ouvert && ouvert.mode === mode) {
    return prisma.paiement.update({
      where: { id: ouvert.id },
      data: { montant, detail },
      select: { id: true, reference: true },
    });
  }
  if (ouvert) {
    await prisma.paiement.update({
      where: { id: ouvert.id },
      data: { statut: "echouee" },
    });
  }
  return prisma.paiement.create({
    data: {
      reference: referenceReglement(await prefixeNumeros()),
      montant,
      devise: "CAD",
      mode,
      detail,
    },
    select: { id: true, reference: true },
  });
}

const DEJA_ANNONCE =
  "Votre paiement est déjà annoncé : l’équipe le traite. Écrivez-lui pour changer de moyen.";

export async function choisirPaiementPublic(formData: FormData) {
  return dansLaChambreDuFormulaire(formData, (slug) => choisirPourVisiteur(formData, slug));
}

async function choisirPourVisiteur(formData: FormData, slug: string) {
  const mode = texte(formData, "mode");
  if (mode === "carte") return payerPourVisiteur(formData, slug);

  const { eventId, code, page, lignes, montant } =
    await inscriptionAPayer(formData, slug);
  if (
    !estModeReglement(mode) ||
    !(await modesPublics(montant)).includes(mode)
  ) {
    redirectWithErreur(page, "Ce moyen de paiement n’est pas proposé.");
  }

  const p = await reglementPublic(eventId, code, mode, montant, {
    inscription: code,
    eventId,
    titulaire: lignes[0].nom,
    email: lignes[0].email,
  });
  if (!p) redirectWithFlash(page, DEJA_ANNONCE);
  revalidatePath(cheminEvenementPublic(slug, eventId));
  redirect(page);
}

export async function annoncerPaiementPublic(formData: FormData) {
  return dansLaChambreDuFormulaire(formData, (slug) => annoncerPourVisiteur(formData, slug));
}

async function annoncerPourVisiteur(formData: FormData, slug: string) {
  const { eventId, code, page, event, lignes, montant } =
    await inscriptionAPayer(formData, slug);

  const p = await reglementPublicOuvert(eventId, code);
  if (!p || p.mode === "carte") {
    redirectWithErreur(page, "Choisissez d’abord un moyen de paiement.");
  }
  if (p.statut === "annonce") {
    redirectWithFlash(page, "Votre paiement est déjà annoncé à l’équipe.");
  }

  await prisma.paiement.update({
    where: { id: p.id },
    data: {
      statut: "annonce",
      annonceLe: new Date(),
      refBancaire: texte(formData, "refBancaire").slice(0, 80) || null,
      montant,
    },
  });
  await prisma.auditLog.create({
    data: {
      action: "reglement_annonce",
      entite: "Event",
      entiteId: eventId,
      acteur: "Inscription publique",
      detail: `${lignes[0].nom} · ${fmtMontant(montant, p.devise)} par ${MODES[p.mode].titre.toLowerCase()} · réf. ${p.reference} · « ${event.titre} »`,
    },
  });
  after(() =>
    notifierEquipe({
      titre: "Règlement annoncé — inscription publique",
      corps: `${lignes[0].nom} · ${fmtMontant(montant, p.devise)} par ${MODES[p.mode].titre.toLowerCase()} · réf. ${p.reference}`,
      url: "/admin/reglements",
      etiquette: `reglement-${p.id}`,
    }),
  );
  revalidatePath("/", "layout");
  redirectWithFlash(
    page,
    "Paiement annoncé : l’équipe confirme dès réception, et vos billets partent par e-mail",
  );
}

export async function payerInscriptionPublique(formData: FormData) {
  return dansLaChambreDuFormulaire(formData, (slug) => payerPourVisiteur(formData, slug));
}

async function payerPourVisiteur(formData: FormData, slug: string) {
  const { eventId, code, page, lignes, montant } =
    await inscriptionAPayer(formData, slug);

  if (!(await compteStripeActif())) {
    redirectWithErreur(
      page,
      "Le paiement en ligne n’est pas disponible pour cette inscription : réglez-la auprès de l’équipe de la Chambre.",
    );
  }

  const p = await reglementPublic(eventId, code, "carte", montant, {
    inscription: code,
    eventId,
    titulaire: lignes[0].nom,
    email: lignes[0].email,
  });
  if (!p) redirectWithFlash(page, DEJA_ANNONCE);

  const ouverture = await ouvrirChezLePrestataire(
    { id: p.id, montant, numeroFacture: null, portefeuille: "carte" },
    "international",
    {
      inscription: code,
      eventId,
      titulaire: lignes[0].nom,
      email: lignes[0].email,
    },
    (reference) => cheminBillet(slug, eventId, { code, ref: reference }),
  );
  if ("raison" in ouverture) redirectWithErreur(page, ouverture.raison);

  redirect(ouverture.url);
}
