import "server-only";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import nodemailer, { type Transporter } from "nodemailer";
import { COORDONNEES } from "@/lib/coordonnees";
import { adresseValidee, domaineDe, estWebmail } from "@/lib/brevo-domaines";
import { prisma } from "@/lib/db";

export interface Courriel {
  a: string;
  sujet: string;
  html: string;
  texte: string;
  pieces?: PieceCourriel[];
}

export interface PieceCourriel {
  nom: string;
  contenu: Buffer;
  type: string;
  cid?: string;
}

// Expéditeur : COURRIEL_EXPEDITEUR, ou MAIL_FROM (réglage Brevo historique), sur un domaine vérifié
const EXPEDITEUR =
  process.env.COURRIEL_EXPEDITEUR ||
  process.env.MAIL_FROM ||
  "CanCham Connect <onboarding@resend.dev>";

export const COURRIEL_EQUIPE = process.env.COURRIEL_EQUIPE || COORDONNEES.email;

type Adresse = { name: string; address: string };
const enTexte = (a: Adresse) => (a.name ? `"${a.name.replace(/["\\]/g, "")}" <${a.address}>` : a.address);
// « Nom <adresse> » ou « adresse » de la configuration du serveur
function lireAdresse(v: string): Adresse {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(v);
  return m ? { name: m[1].trim(), address: m[2].trim() } : { name: "", address: v.trim() };
}
const SERVEUR = lireAdresse(EXPEDITEUR);
// L'adresse du serveur (utilisée quand celle de l'entreprise n'est pas validée)
export const adresseServeur = () => SERVEUR.address;
const valide = (e: string) => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(e);

// Expéditeur réglé dans Paramètres (nom, domaine, adresse), réponse au courriel de l'entreprise.
// Relu au plus toutes les 30 s ; « secours » : l'adresse du serveur, si le fournisseur refuse celle de l'entreprise
let memoire: { jusqua: number; valeur: { de: Adresse; secours: Adresse | null; reponse: string } } | null = null;
// Après un changement dans Paramètres : relire l'expéditeur au prochain envoi
export function oublierExpediteur() {
  memoire = null;
}
async function expediteur() {
  if (memoire && memoire.jusqua > Date.now()) return memoire.valeur;
  let p: { nom: string; email: string; expediteurNom: string; expediteurDomaine: string; expediteurEmail: string } | null = null;
  try {
    p = await prisma.profilChambre.findUnique({
      where: { id: "unique" },
      select: { nom: true, email: true, expediteurNom: true, expediteurDomaine: true, expediteurEmail: true },
    });
  } catch (e) {
    console.error("[courriel] profil de l'entreprise illisible, expéditeur du serveur utilisé", e);
  }
  const nom = p?.expediteurNom.trim() || p?.nom.trim() || SERVEUR.name;
  const adresse = p?.expediteurEmail.trim() ?? "";
  // L'adresse de l'entreprise ne sert d'expéditeur que si elle est sur son domaine et que ce domaine est validé
  // chez Brevo ; sinon (domaine non validé, Brevo injoignable) : l'adresse du serveur, avec le nom de l'entreprise
  const autorisee =
    valide(adresse) &&
    domaineDe(adresse) === p?.expediteurDomaine.trim() &&
    !estWebmail(domaineDe(adresse)) &&
    (fournisseurCourriel() === "smtp" ? await adresseValidee(adresse) : true);
  const de = { name: nom, address: autorisee ? adresse : SERVEUR.address };
  const valeur = {
    de,
    secours: de.address !== SERVEUR.address ? { name: nom, address: SERVEUR.address } : null,
    // Les réponses vont à l'adresse d'expédition saisie (même Gmail), sinon au courriel de l'entreprise
    reponse: valide(adresse) ? adresse : p?.email.trim() && valide(p.email.trim()) ? p.email.trim() : COURRIEL_EQUIPE,
  };
  memoire = { jusqua: Date.now() + 30_000, valeur };
  return valeur;
}

// Fournisseur d'envoi : Brevo (ou tout serveur SMTP) avec SMTP_HOST, SMTP_USER et SMTP_PASS ; sinon Resend
export function fournisseurCourriel(): "smtp" | "resend" | null {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  if (process.env.RESEND_API_KEY) return "resend";
  return null;
}

export function courrielsActifs(): boolean {
  return fournisseurCourriel() !== null;
}

export const SANS_ENVOI = "L’envoi de courriels n’est pas configuré (SMTP_HOST, SMTP_USER et SMTP_PASS pour Brevo)";

export async function envoyerCourriel(c: Courriel): Promise<boolean> {
  return (await envoyerCourrielSuivi(c)) !== null;
}

// Envoie et renvoie l'identifiant du courriel chez le fournisseur ; null si rien n'est parti.
// « suivi » revient dans les webhooks (Brevo : en-tête X-Mailin-custom) pour relier remises, ouvertures et clics.
export async function envoyerCourrielSuivi(
  c: Courriel,
  { suivi }: { suivi?: string } = {},
): Promise<string | null> {
  const fournisseur = fournisseurCourriel();
  if (!fournisseur) {
    const jointes = c.pieces?.length
      ? `\n[pièces jointes] ${c.pieces.map((p) => p.nom).join(", ")}`
      : "";
    console.info(
      `[courriel] non envoyé (aucun envoi configuré) — à ${c.a} — « ${c.sujet} »\n${c.texte}${jointes}`,
    );
    return null;
  }
  return fournisseur === "smtp" ? envoyerSmtp(c, suivi) : envoyerResend(c, suivi);
}

let transport: Transporter | null = null;
function transporteur(): Transporter {
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transport;
}

async function envoyerSmtp(c: Courriel, suivi?: string): Promise<string | null> {
  const exp = await expediteur();
  let de = exp.de;
  for (let essai = 1; essai <= ESSAIS_ENVOI; essai++) {
    try {
      const info = await transporteur().sendMail({
        from: de,
        to: c.a,
        replyTo: exp.reponse,
        subject: c.sujet,
        html: c.html,
        text: c.texte,
        attachments: c.pieces?.map((p) => ({
          filename: p.nom,
          content: p.contenu,
          contentType: p.type,
          ...(p.cid ? { cid: p.cid } : {}),
        })),
        ...(suivi ? { headers: { "X-Mailin-custom": suivi } } : {}),
      });
      return (info.messageId ?? "").replace(/^<|>$/g, "");
    } catch (e) {
      // Adresse de l'entreprise refusée (domaine non vérifié chez le fournisseur) : on repart avec celle du serveur
      if (exp.secours && de !== exp.secours) {
        console.warn(`[courriel] ${de.address} refusée comme expéditeur, envoi avec ${exp.secours.address}`, e);
        de = exp.secours;
        essai--;
        continue;
      }
      if (essai < ESSAIS_ENVOI) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      console.error(`[courriel] échec SMTP — à ${c.a} — « ${c.sujet} »`, e);
    }
  }
  return null;
}

async function envoyerResend(c: Courriel, suivi?: string): Promise<string | null> {
  const cle = process.env.RESEND_API_KEY!;
  const exp = await expediteur();
  let de = exp.de;
  let idempotence = randomUUID();
  let limites = 0;
  for (let essai = 1; essai <= ESSAIS_ENVOI; essai++) {
    try {
      const reponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cle}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotence,
        },
        body: JSON.stringify({
          from: enTexte(de),
          to: [c.a],
          subject: c.sujet,
          html: c.html,
          text: c.texte,
          ...(c.pieces?.length
            ? {
                attachments: c.pieces.map((p) => ({
                  filename: p.nom,
                  content: p.contenu.toString("base64"),
                  content_type: p.type,
                  ...(p.cid ? { content_id: p.cid } : {}),
                })),
              }
            : {}),
          reply_to: exp.reponse,
          ...(suivi ? { tags: [{ name: "suivi", value: suivi.replace(/[^A-Za-z0-9_-]/g, "") }] } : {}),
        }),
      });
      // Trop de courriels à la seconde (envoi d'une lettre) : on attend et on recommence, sans compter l'essai
      if (reponse.status === 429 && limites < LIMITES_TOLEREES) {
        limites++;
        essai--;
        await new Promise((r) => setTimeout(r, 1100));
        continue;
      }
      // Domaine de l'entreprise non vérifié chez Resend : on repart avec l'adresse du serveur
      if ((reponse.status === 403 || reponse.status === 422) && exp.secours && de !== exp.secours) {
        console.warn(`[courriel] ${de.address} refusée comme expéditeur (${reponse.status}), envoi avec ${exp.secours.address}`);
        de = exp.secours;
        idempotence = randomUUID();
        essai--;
        continue;
      }
      if (!reponse.ok) {
        console.error(
          `[courriel] échec ${reponse.status} — à ${c.a} — « ${c.sujet} » : ${await reponse.text()}`,
        );
        return null;
      }
      const { id } = (await reponse.json().catch(() => ({}))) as { id?: string };
      return id ?? "";
    } catch (e) {
      if (essai < ESSAIS_ENVOI) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      console.error(`[courriel] échec réseau — à ${c.a} — « ${c.sujet} »`, e);
    }
  }
  return null;
}

const LIMITES_TOLEREES = 20;

const ESSAIS_ENVOI = 2;

export const ADRESSE_PLATEFORME = "https://app.cancham.mg";

export function estAdresseLocale(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(\/|$)/i.test(
    url,
  );
}

function baseLiens(): string | null {
  const base = process.env.APP_URL?.trim().replace(/\/+$/, "") || null;
  if (process.env.NODE_ENV !== "production") return base;
  return base && !estAdresseLocale(base) ? base : ADRESSE_PLATEFORME;
}

export async function urlPublique(chemin: string): Promise<string> {
  const base = baseLiens();
  if (base) return `${base}${chemin}`;
  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocole =
    h.get("x-forwarded-proto") ??
    (hote.startsWith("localhost") ? "http" : "https");
  return `${protocole}://${hote}${chemin}`;
}

export function enTete(): string {
  const base = baseLiens();
  const site = base && !estAdresseLocale(base) ? base : ADRESSE_PLATEFORME;
  return `<img src="${echapper(`${site}/marque/logo-courriel.png`)}" width="220" height="89" alt="IMPACT 261" style="display:block;border:0;outline:none;text-decoration:none;width:220px;height:auto;color:#ffffff;font-size:16px;font-weight:bold">`;
}

export function echapper(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function gabarit({
  titre,
  paragraphes,
  images = [],
  bouton,
  apres = [],
}: {
  titre: string;
  paragraphes: string[];
  images?: { cid: string; legende: string }[];
  bouton?: { libelle: string; url: string };
  apres?: string[];
}): { html: string; texte: string } {
  const p = (t: string, taille = 15, couleur = "#3d4b5c") =>
    `<p style="margin:0 0 14px;font-size:${taille}px;line-height:1.6;color:${couleur}">${echapper(t)}</p>`;

  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;padding:24px 12px;background:#f3f5f8;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0f1d2c;padding:18px 28px;color:#ffffff;font-size:18px;font-weight:bold">${enTete()}</td></tr>
<tr><td style="height:4px;background:linear-gradient(90deg,#ad0707,#007140)"></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 18px;font-size:21px;color:#0f1d2c">${echapper(titre)}</h1>
${paragraphes.map((t) => p(t)).join("\n")}
${images
  .map(
    (i) =>
      `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 18px"><tr><td style="padding:0 0 6px;font-size:14px;font-weight:bold;color:#0f1d2c">${echapper(i.legende)}</td></tr><tr><td><img src="cid:${echapper(i.cid)}" width="170" height="170" alt="QR code — ${echapper(i.legende)}" style="display:block;border:1px solid #e3e8ee;border-radius:10px;width:170px;height:170px"></td></tr></table>`,
  )
  .join("\n")}
${
  bouton
    ? `<p style="margin:22px 0"><a href="${echapper(bouton.url)}" style="display:inline-block;background:#ad0707;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">${echapper(bouton.libelle)}</a></p>`
    : ""
}
${apres.map((t) => p(t, 13, "#6b7a8a")).join("\n")}
</td></tr>
<tr><td style="padding:16px 28px;background:#f7f9fb;font-size:12px;color:#8a97a6">Chambre de Commerce et de Coopération Canada–Madagascar · ${echapper(COORDONNEES.email)} · ${echapper(COORDONNEES.telephone)}</td></tr>
</table></td></tr></table></body></html>`;

  const texte = [
    titre,
    "",
    ...paragraphes.flatMap((t) => [t, ""]),
    ...(bouton ? [`${bouton.libelle} : ${bouton.url}`, ""] : []),
    ...apres.flatMap((t) => [t, ""]),
    "—",
    `CanCham · ${COORDONNEES.email} · ${COORDONNEES.telephone}`,
  ].join("\n");

  return { html, texte };
}
