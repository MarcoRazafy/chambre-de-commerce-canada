import "server-only";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { COORDONNEES } from "@/lib/coordonnees";

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

const EXPEDITEUR =
  process.env.COURRIEL_EXPEDITEUR || "CanCham Connect <onboarding@resend.dev>";

export const COURRIEL_EQUIPE = process.env.COURRIEL_EQUIPE || COORDONNEES.email;

export function courrielsActifs(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function envoyerCourriel(c: Courriel): Promise<boolean> {
  return (await envoyerCourrielSuivi(c)) !== null;
}

// Envoie (ou programme, avec « programmeLe ») et renvoie l'identifiant Resend du courriel,
// qui sert à le suivre (webhooks) ou à annuler un envoi programmé ; null si rien n'est parti
export async function envoyerCourrielSuivi(
  c: Courriel,
  { programmeLe }: { programmeLe?: Date } = {},
): Promise<string | null> {
  const cle = process.env.RESEND_API_KEY;
  if (!cle) {
    const jointes = c.pieces?.length
      ? `\n[pièces jointes] ${c.pieces.map((p) => p.nom).join(", ")}`
      : "";
    console.info(
      `[courriel] non envoyé (RESEND_API_KEY absente) — à ${c.a} — « ${c.sujet} »\n${c.texte}${jointes}`,
    );
    return null;
  }
  const idempotence = randomUUID();
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
          from: EXPEDITEUR,
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
          reply_to: COURRIEL_EQUIPE,
          ...(programmeLe ? { scheduled_at: programmeLe.toISOString() } : {}),
        }),
      });
      // Trop de courriels à la seconde (envoi d'une lettre) : on attend et on recommence, sans compter l'essai
      if (reponse.status === 429 && limites < LIMITES_TOLEREES) {
        limites++;
        essai--;
        await new Promise((r) => setTimeout(r, 1100));
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

// Annule un courriel programmé (avant son heure d'envoi) ; true si Resend l'a bien retiré
export async function annulerCourrielProgramme(id: string): Promise<boolean> {
  const cle = process.env.RESEND_API_KEY;
  if (!cle || !id) return false;
  try {
    const r = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cle}` },
    });
    if (!r.ok) console.error(`[courriel] annulation refusée (${r.status}) — ${id} : ${await r.text()}`);
    return r.ok;
  } catch (e) {
    console.error(`[courriel] annulation impossible — ${id}`, e);
    return false;
  }
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

function enTete(): string {
  const base = baseLiens();
  const site = base && !estAdresseLocale(base) ? base : ADRESSE_PLATEFORME;
  return `<img src="${echapper(`${site}/marque/logo-courriel.png`)}" width="220" height="66" alt="CanCham — Chambre de Commerce et de Coopération Canada-Madagascar" style="display:block;border:0;outline:none;text-decoration:none;width:220px;height:auto;color:#ffffff;font-size:16px;font-weight:bold">`;
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
