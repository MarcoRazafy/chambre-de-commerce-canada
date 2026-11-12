import "server-only";

// Abonnement à la plateforme payé par carte (Stripe, compte de la plateforme). Les factures restent celles de
// la plateforme (numéro, taxes) ; Stripe garde la carte de la Chambre et prélève chaque facture.
//  - la carte s'enregistre (ou une facture se paie) sur la page de paiement de Stripe (Checkout) ;
//  - le résultat s'applique au retour du navigateur et par le webhook (sans doublon) ;
//  - les tâches régulières prélèvent les factures dues et envoient les relances (réglages de l'Admin GM).
// Écritures sans limite de Chambre (prismaSysteme), toujours avec la Chambre en clair.
import type Stripe from "stripe";
import { oublierAdresses } from "@/lib/chambre-courante";
import { envoyerCourriel, gabarit, urlPublique } from "@/lib/courriel";
import { prismaSysteme as db, reglagesRetard } from "@/lib/db";
import { fmtDollars } from "@/lib/plateforme";
import { joursDepuis, relanceDue } from "@/lib/retards";
import { enCents, stripe, stripeConfigure } from "@/lib/stripe";

const TENTATIVES_MAX = 3;
const ENTRE_TENTATIVES_MS = 2 * 86_400_000;

async function noter(chambreId: string, action: string, detail: string, acteur = "Paiement en ligne") {
  await db.auditLog.create({ data: { chambreId, action, entite: "Chambre", entiteId: chambreId, acteur, detail } });
}

// Le client Stripe de la Chambre, créé au besoin
async function clientStripe(chambreId: string): Promise<string> {
  const c = await db.chambre.findUnique({ where: { id: chambreId }, select: { stripeClientId: true, nom: true, profil: { select: { email: true } } } });
  if (!c) throw new Error(`Chambre ${chambreId} introuvable`);
  if (c.stripeClientId) return c.stripeClientId;
  const client = await stripe().customers.create(
    { name: c.nom, email: c.profil?.email || undefined, metadata: { chambreId } },
    { idempotencyKey: `client-${chambreId}` },
  );
  await db.chambre.update({ where: { id: chambreId }, data: { stripeClientId: client.id } });
  return client.id;
}

const avecSession = (retour: string) => `${retour}${retour.includes("?") ? "&" : "?"}stripe={CHECKOUT_SESSION_ID}`;

// Page Stripe pour enregistrer (ou changer) la carte ; « passerA » : l'offre à prendre une fois la carte enregistrée
export async function sessionCarte(chambreId: string, retour: string, passerA?: string): Promise<string> {
  const s = await stripe().checkout.sessions.create({
    mode: "setup",
    currency: "cad",
    customer: await clientStripe(chambreId),
    success_url: avecSession(retour),
    cancel_url: retour,
    metadata: { chambreId, ...(passerA ? { passerA } : {}) },
  });
  if (!s.url) throw new Error("Stripe n'a pas donné d'adresse de paiement");
  return s.url;
}

// Page Stripe pour payer une facture de l'abonnement (la carte est gardée pour les prochaines)
export async function sessionPaiement(chambreId: string, factureId: string, retour: string): Promise<string | null> {
  const f = await db.facturePlateforme.findFirst({ where: { id: factureId, chambreId, payeeLe: null }, select: { id: true, numero: true, total: true } });
  if (!f) return null;
  const s = await stripe().checkout.sessions.create({
    mode: "payment",
    customer: await clientStripe(chambreId),
    line_items: [{ quantity: 1, price_data: { currency: "cad", unit_amount: enCents(f.total), product_data: { name: `Abonnement à la plateforme — ${f.numero}` } } }],
    payment_intent_data: { setup_future_usage: "off_session", metadata: { chambreId, factureId: f.id } },
    metadata: { chambreId, factureId: f.id },
    success_url: avecSession(retour),
    cancel_url: retour,
  });
  if (!s.url) throw new Error("Stripe n'a pas donné d'adresse de paiement");
  return s.url;
}

// La carte (marque, 4 derniers chiffres, échéance) sur la Chambre, et carte par défaut chez Stripe
async function enregistrerCarte(chambreId: string, pm: Stripe.PaymentMethod) {
  const carte = pm.card;
  await db.chambre.update({
    where: { id: chambreId },
    data: {
      stripeCarteId: pm.id,
      carteMarque: carte?.brand ?? null,
      carteFin: carte?.last4 ?? null,
      carteExpire: carte ? `${String(carte.exp_month).padStart(2, "0")}/${String(carte.exp_year).slice(-2)}` : null,
    },
  });
  const client = typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
  if (client) await stripe().customers.update(client, { invoice_settings: { default_payment_method: pm.id } });
}

export async function passerALOffre(chambreId: string, offreId: string, acteur?: string) {
  const [o, c] = await Promise.all([
    db.offre.findUnique({ where: { id: offreId }, select: { id: true, nom: true } }),
    db.chambre.findUnique({ where: { id: chambreId }, select: { offreId: true } }),
  ]);
  if (!o || !c || c.offreId === o.id) return false;
  await db.chambre.update({ where: { id: chambreId }, data: { offreId: o.id } });
  await noter(chambreId, "offre_changee", `Offre ${o.nom}.`, acteur);
  return true;
}

// Facture payée (carte, ou réglée autrement et notée par l'Admin GM) : sans effet si elle l'est déjà
export async function marquerPayee(factureId: string, paiementId: string | null, acteur?: string) {
  const f = await db.facturePlateforme.findUnique({ where: { id: factureId }, select: { chambreId: true, numero: true } });
  if (!f) return false;
  const r = await db.facturePlateforme.updateMany({
    where: { id: factureId, payeeLe: null },
    data: { payeeLe: new Date(), stripePaiementId: paiementId, dernierEchec: null },
  });
  if (!r.count) return false;
  oublierAdresses(); // un espace en retard se rouvre tout de suite
  await noter(f.chambreId, "facture_payee", `Facture ${f.numero} payée.`, acteur);
  return true;
}

// Une session Checkout terminée (retour du navigateur ou webhook) ; chambreAttendue : celle de l'adresse du site
export async function appliquerSession(sessionId: string, chambreAttendue?: string): Promise<"carte" | "payee" | "rien"> {
  const s = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["setup_intent.payment_method", "payment_intent.payment_method"] });
  const chambreId = s.metadata?.chambreId;
  if (!chambreId || (chambreAttendue && chambreId !== chambreAttendue) || s.status !== "complete") return "rien";
  if (s.mode === "setup") {
    const pm = (s.setup_intent as Stripe.SetupIntent | null)?.payment_method;
    if (pm && typeof pm !== "string") await enregistrerCarte(chambreId, pm);
    if (s.metadata?.passerA) await passerALOffre(chambreId, s.metadata.passerA);
    return "carte";
  }
  if (s.mode === "payment" && s.payment_status === "paid") {
    const pi = s.payment_intent as Stripe.PaymentIntent | null;
    if (pi?.payment_method && typeof pi.payment_method !== "string") await enregistrerCarte(chambreId, pi.payment_method);
    if (s.metadata?.factureId) await marquerPayee(s.metadata.factureId, pi?.id ?? null);
    return "payee";
  }
  return "rien";
}

// Le refus de la banque, en clair
export function messageRefus(e: unknown): string {
  const err = e as { code?: string; decline_code?: string };
  switch (err?.decline_code ?? err?.code) {
    case "insufficient_funds":
      return "Fonds insuffisants";
    case "expired_card":
      return "Carte expirée";
    case "authentication_required":
      return "La banque demande une confirmation : payez la facture en ligne";
    case "incorrect_cvc":
    case "card_declined":
    case "generic_decline":
    case "do_not_honor":
      return "Carte refusée";
    default:
      return "Paiement refusé";
  }
}

// Prélève une facture sur la carte enregistrée
async function prelever(
  f: { id: string; numero: string; total: number; tentatives: number },
  c: { id: string; stripeClientId: string; stripeCarteId: string },
): Promise<"payee" | "refusee" | "attente"> {
  try {
    const pi = await stripe().paymentIntents.create(
      {
        amount: enCents(f.total),
        currency: "cad",
        customer: c.stripeClientId,
        payment_method: c.stripeCarteId,
        off_session: true,
        confirm: true,
        description: `Abonnement à la plateforme — ${f.numero}`,
        metadata: { chambreId: c.id, factureId: f.id },
      },
      { idempotencyKey: `prelevement-${f.id}-${f.tentatives}` },
    );
    if (pi.status === "succeeded") {
      await marquerPayee(f.id, pi.id);
      return "payee";
    }
    await echec(f.id, "Paiement en attente de confirmation");
    return "attente";
  } catch (e) {
    await echec(f.id, messageRefus(e));
    return "refusee";
  }
}

async function echec(factureId: string, message: string) {
  await db.facturePlateforme.update({
    where: { id: factureId },
    data: { tentatives: { increment: 1 }, dernierEchec: message, dernierEchecLe: new Date() },
  });
}

// Tâche régulière, pour une Chambre : prélève ses factures suivies impayées (3 essais, 2 jours d'écart)
export async function prelevementsDus(chambreId: string, maintenant = new Date()): Promise<number> {
  if (!stripeConfigure()) return 0;
  const c = await db.chambre.findUnique({ where: { id: chambreId }, select: { id: true, stripeClientId: true, stripeCarteId: true } });
  if (!c?.stripeClientId || !c.stripeCarteId) return 0;
  const factures = await db.facturePlateforme.findMany({
    where: {
      chambreId,
      payeeLe: null,
      suivie: true,
      tentatives: { lt: TENTATIVES_MAX },
      OR: [{ dernierEchecLe: null }, { dernierEchecLe: { lt: new Date(maintenant.getTime() - ENTRE_TENTATIVES_MS) } }],
    },
    orderBy: { date: "asc" },
    select: { id: true, numero: true, total: true, tentatives: true },
  });
  let payees = 0;
  for (const f of factures) {
    if ((await prelever(f, { id: c.id, stripeClientId: c.stripeClientId, stripeCarteId: c.stripeCarteId })) === "payee") payees++;
  }
  return payees;
}

// Tâche régulière, pour une Chambre (dans avecChambre) : relance ses super admins pour chaque facture en retard,
// aux jours réglés par l'Admin GM, une fois par jour de relance
export async function relancesDues(chambreId: string, maintenant = new Date()): Promise<number> {
  const r = await reglagesRetard();
  const factures = await db.facturePlateforme.findMany({
    where: { chambreId, payeeLe: null, suivie: true },
    orderBy: { date: "asc" },
    select: { id: true, numero: true, total: true, date: true, relances: true },
  });
  const aRelancer = factures.map((f) => ({ f, jour: relanceDue(f, r, maintenant) })).filter((x) => x.jour !== null);
  if (!aRelancer.length) return 0;
  const destinataires = await db.user.findMany({ where: { chambreId, role: "admin", niveauEquipe: "administrateur" }, select: { email: true, nom: true } });
  const lien = await urlPublique("/admin/abonnement?onglet=factures");
  for (const { f } of aRelancer) {
    const jours = joursDepuis(f.date, maintenant);
    const reste = r.delaiRetard - jours;
    for (const u of destinataires) {
      const { html, texte } = gabarit({
        titre: "Facture de l’abonnement en attente",
        paragraphes: [
          `Bonjour ${u.nom.split(/\s+/)[0] ?? ""},`,
          `La facture ${f.numero} (${fmtDollars(f.total)}) attend son paiement depuis ${jours} jour${jours > 1 ? "s" : ""}.`,
          ...(r.delaiRetard > 0 && reste > 0
            ? [`Sans paiement dans ${reste} jour${reste > 1 ? "s" : ""}, l’espace passera ${r.actionRetard === "blocage" ? "en accès bloqué" : "en lecture seule"}.`]
            : []),
        ],
        bouton: { libelle: "Payer la facture", url: lien },
      });
      await envoyerCourriel({ a: u.email, sujet: `Facture ${f.numero} en attente`, html, texte });
    }
    // Toutes les relances passées comptent comme faites : une seule par passage
    const faites = [...new Set([...f.relances, ...r.relances.filter((d) => d <= jours)])];
    await db.facturePlateforme.update({ where: { id: f.id }, data: { relances: faites } });
  }
  return aRelancer.length;
}

// Webhook Stripe : session de paiement terminée, prélèvement confirmé plus tard (confirmation de la banque)
export async function traiterEvenement(ev: Stripe.Event): Promise<void> {
  switch (ev.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await appliquerSession(ev.data.object.id);
      break;
    case "payment_intent.succeeded": {
      const pi = ev.data.object;
      if (pi.metadata?.factureId) await marquerPayee(pi.metadata.factureId, pi.id);
      break;
    }
  }
}
