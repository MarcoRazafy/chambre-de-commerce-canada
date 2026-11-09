// Lettre de la newsletter, modifiée directement dans son rendu : logo, bandeau, contenu (titres, textes,
// images, boutons), encadré d'appel, pied de page avec réseaux sociaux. Description, lecture sûre,
// nettoyage du texte mis en forme, rendu HTML de courriel et texte brut — partagés par l'éditeur et l'envoi.

export const ACCENT = "#ad0707";
export const LARGEUR = 600;

export type Bloc =
  | { id: string; type: "titre"; texte: string }
  | { id: string; type: "texte"; html: string }
  | { id: string; type: "image"; url: string; lien: string; alt: string }
  | { id: string; type: "bouton"; libelle: string; url: string };
export type TypeBloc = Bloc["type"];

export const RESEAUX = ["facebook", "youtube", "linkedin", "instagram", "tiktok"] as const;
export type Reseau = (typeof RESEAUX)[number];

export interface DocLettre {
  v: 2;
  apercu: string; // ligne d'aperçu, affichée après l'objet dans la boîte de réception
  bandeau: { image: string; titre: string; sousTitre: string };
  blocs: Bloc[];
  appel: { actif: boolean; titre: string; bouton: string; url: string };
  pied: { texte: string; reseaux: Record<Reseau, string> };
}

export const VARIABLES = [
  { cle: "prenom", libelle: "Prénom" },
  { cle: "nom", libelle: "Nom complet" },
  { cle: "entreprise", libelle: "Entreprise" },
  { cle: "email", libelle: "Courriel" },
] as const;
export type Variables = Partial<Record<(typeof VARIABLES)[number]["cle"], string>>;

const texte = (v: unknown, max = 5000) => (typeof v === "string" ? v.slice(0, max) : "");
let compteur = 0;
export const nouvelId = () => `b${Date.now().toString(36)}${(compteur++).toString(36)}`;

// Adresse sûre : http(s), mailto, tel, ou un fichier téléversé sur la plateforme
export function urlSure(v: unknown): string {
  const u = texte(v, 2000).trim();
  if (/^(https?:\/\/|mailto:|tel:)/i.test(u) || /^\/televersements\/[\w.\-/]+$/.test(u)) return u;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(u)) return `https://${u}`;
  return "";
}

const echapper = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Texte mis en forme dans l'éditeur : seules ces balises restent, sans attribut (sauf l'adresse d'un lien)
const BALISES: Record<string, string> = {
  b: "strong", strong: "strong", i: "em", em: "em", u: "u", br: "br", p: "p", div: "p", ul: "ul", ol: "ol", li: "li", a: "a",
};
export function nettoyerHtml(brut: string): string {
  return brut
    .slice(0, 20000)
    .replace(/<(script|style|iframe|object|embed|svg|math)[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]*>?/g, (balise) => {
      const m = /^<\s*(\/?)\s*([a-z0-9]+)([^>]*)>?$/i.exec(balise);
      if (!m) return "";
      const [, fin, nom, attributs] = m;
      const propre = BALISES[nom.toLowerCase()];
      if (!propre) return "";
      if (fin) return propre === "br" ? "" : `</${propre}>`;
      if (propre === "a") {
        const href = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attributs);
        const url = urlSure((href?.[2] ?? href?.[3] ?? href?.[4] ?? "").replace(/&amp;/g, "&"));
        return url ? `<a href="${echapper(url)}">` : "<a>";
      }
      return propre === "br" ? "<br>" : `<${propre}>`;
    });
}

export function blocVide(type: TypeBloc): Bloc {
  const id = nouvelId();
  switch (type) {
    case "titre":
      return { id, type, texte: "1. Un titre de rubrique" };
    case "texte":
      return { id, type, html: "Votre texte ici." };
    case "image":
      return { id, type, url: "", lien: "", alt: "" };
    case "bouton":
      return { id, type, libelle: "En savoir plus", url: "" };
  }
}

export function docVide(reseaux: Partial<Record<Reseau, string>> = {}): DocLettre {
  return {
    v: 2,
    apercu: "",
    bandeau: { image: "", titre: "La lettre de la Chambre", sousTitre: "Canada – Madagascar" },
    blocs: [
      { id: nouvelId(), type: "texte", html: "Bonjour {prenom},<br><br>Voici les nouvelles du mois : événements, rencontres et opportunités d’affaires entre le Canada et Madagascar." },
      blocVide("titre"),
      blocVide("texte"),
    ],
    appel: { actif: true, titre: "Rejoignez-nous au prochain événement", bouton: "Je m’inscris", url: "" },
    pied: {
      texte: "La Chambre de Commerce et de Coopération Canada–Madagascar rassemble les entreprises des deux pays et facilite leurs échanges. Vous recevez ce courriel en tant que membre ou contact de la Chambre.",
      reseaux: { facebook: "", youtube: "", linkedin: "", instagram: "", tiktok: "", ...reseaux },
    },
  };
}

const enHtml = (t: string) => echapper(t).replace(/\n/g, "<br>");

// Une lettre écrite en texte simple (ou avec l'ancien éditeur) devient une lettre de ce modèle
export function docDepuisTexte(sujet: string, contenu: string, reseaux: Partial<Record<Reseau, string>> = {}): DocLettre {
  const d = docVide(reseaux);
  return {
    ...d,
    bandeau: { ...d.bandeau, titre: sujet || d.bandeau.titre },
    blocs: contenu.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => ({ id: nouvelId(), type: "texte" as const, html: enHtml(p) })),
    appel: { ...d.appel, actif: false },
  };
}

function lireBloc(b: unknown): Bloc | null {
  if (!b || typeof b !== "object") return null;
  const o = b as Record<string, unknown>;
  const id = texte(o.id, 40) || nouvelId();
  switch (o.type) {
    case "titre":
      return { id, type: "titre", texte: texte(o.texte, 300) };
    case "texte":
      return { id, type: "texte", html: nettoyerHtml(typeof o.html === "string" ? o.html : enHtml(texte(o.texte))) };
    case "image":
      return { id, type: "image", url: urlSure(o.url), lien: urlSure(o.lien), alt: texte(o.alt, 200) };
    case "bouton":
      return { id, type: "bouton", libelle: texte(o.libelle, 80), url: urlSure(o.url) };
    default:
      return null;
  }
}

// Lit le contenu enregistré : une lettre de l'éditeur (JSON), sinon null (texte simple)
export function lireDoc(contenu: string, reseaux: Partial<Record<Reseau, string>> = {}): DocLettre | null {
  if (!contenu.trimStart().startsWith("{")) return null;
  try {
    const o = JSON.parse(contenu) as Record<string, unknown>;
    if (!Array.isArray(o.blocs)) return null;
    const d = docVide(reseaux);
    const blocsBruts = o.blocs as Record<string, unknown>[];
    // Version 1 (premier éditeur) : son bandeau devient le bandeau, le reste du contenu suit
    const ancienBandeau = o.v === 1 ? blocsBruts.find((b) => b?.type === "bandeau") : null;
    const ba = (o.v === 2 ? o.bandeau : ancienBandeau) as Record<string, unknown> | null | undefined;
    const ap = (o.appel ?? {}) as Record<string, unknown>;
    const pi = (o.pied ?? {}) as Record<string, unknown>;
    const rs = (pi.reseaux ?? {}) as Record<string, unknown>;
    return {
      v: 2,
      apercu: texte(o.apercu, 200),
      bandeau: { image: urlSure(ba?.image), titre: texte(ba?.titre, 200), sousTitre: texte(ba?.sousTitre, 300) },
      blocs: blocsBruts.map(lireBloc).filter((b): b is Bloc => b !== null).slice(0, 60),
      appel: o.v === 2
        ? { actif: ap.actif !== false, titre: texte(ap.titre, 200), bouton: texte(ap.bouton, 80), url: urlSure(ap.url) }
        : { ...d.appel, actif: false },
      pied: {
        texte: o.v === 2 ? texte(pi.texte, 1000) : d.pied.texte,
        reseaux: Object.fromEntries(RESEAUX.map((r) => [r, o.v === 2 ? urlSure(rs[r]) : d.pied.reseaux[r]])) as Record<Reseau, string>,
      },
    };
  } catch {
    return null;
  }
}

const remplacer = (t: string, vars: Variables) =>
  t.replace(/\{(prenom|nom|entreprise|email)\}/g, (_, k: keyof Variables) => vars[k] ?? "");

export type OptionsRendu = {
  base: string; // adresse du site, pour le logo, les icônes et les images téléversées
  vars: Variables;
  mention: string; // pourquoi la personne reçoit ce courriel
  desabonnement: string | null; // lien de désabonnement (abonnés à la lettre)
  coordonnees: { adresse: string; email: string; telephone: string; confidentialite: string };
};

// Rendu HTML pour les messageries (tableaux et styles en ligne)
export function versHtml(doc: DocLettre, o: OptionsRendu): string {
  const abs = (u: string) => (u.startsWith("/") ? `${o.base}${u}` : u);
  const lien = `color:${ACCENT};text-decoration:none`;
  const styleTexte = "font-size:15px;line-height:1.6;color:#6b6b6b";
  const riche = (html: string) =>
    remplacer(nettoyerHtml(html), o.vars)
      .replace(/<a href="([^"]*)">/g, (_, u: string) => `<a href="${echapper(abs(u.replace(/&amp;/g, "&")))}" style="${lien}">`)
      .replace(/<p>/g, '<p style="margin:0 0 12px">')
      .replace(/<(ul|ol)>/g, '<$1 style="margin:0 0 12px;padding-left:22px">');
  const ligne = (contenu: string, pad = "0 24px 20px") => `<tr><td style="padding:${pad}">${contenu}</td></tr>`;

  const bloc = (b: Bloc) => {
    switch (b.type) {
      case "titre":
        return ligne(`<h2 style="margin:0;font-size:17px;line-height:1.4;color:#3a3a3a;font-weight:bold">${echapper(remplacer(b.texte, o.vars))}</h2>`, "4px 24px 8px");
      case "texte":
        return ligne(`<div style="${styleTexte}">${riche(b.html)}</div>`);
      case "image": {
        if (!b.url) return "";
        const img = `<img src="${echapper(abs(b.url))}" width="${LARGEUR - 48}" alt="${echapper(b.alt)}" style="display:block;width:100%;max-width:${LARGEUR - 48}px;height:auto;border:0;border-radius:12px">`;
        return ligne(b.lien ? `<a href="${echapper(abs(b.lien))}">${img}</a>` : img);
      }
      case "bouton":
        return ligne(`<div style="text-align:center"><a href="${echapper(abs(b.url) || "#")}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:6px">${echapper(remplacer(b.libelle, o.vars))}</a></div>`, "4px 24px 24px");
    }
  };

  const ba = doc.bandeau;
  const bandeau = `<tr><td style="padding:0 0 28px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td ${ba.image ? `background="${echapper(abs(ba.image))}" ` : ""}style="background-color:${ACCENT};${ba.image ? `background-image:url('${echapper(abs(ba.image))}');background-size:cover;background-position:center;` : ""}border-radius:16px;padding:64px 40px;text-align:right">${ba.titre ? `<div style="font-family:Georgia,'Times New Roman',serif;font-size:40px;line-height:1.1;font-weight:bold;color:#ffffff">${echapper(remplacer(ba.titre, o.vars))}</div>` : ""}${ba.sousTitre ? `<div style="margin-top:10px;font-size:20px;line-height:1.3;font-weight:bold;color:#ffffff">${echapper(remplacer(ba.sousTitre, o.vars))}</div>` : ""}</td></tr></table></td></tr>`;

  const appel = doc.appel.actif
    ? `<tr><td style="background:${ACCENT};padding:32px 24px;text-align:center"><div style="font-size:28px;line-height:1.25;color:#ffffff;margin:0 0 14px">${echapper(remplacer(doc.appel.titre, o.vars))}</div>${doc.appel.bouton ? `<a href="${echapper(abs(doc.appel.url) || "#")}" style="display:inline-block;background:#ffffff;color:${ACCENT};text-decoration:none;font-weight:bold;font-size:16px;padding:8px 10px">${echapper(doc.appel.bouton)}</a>` : ""}</td></tr>`
    : "";

  const reseaux = RESEAUX.filter((r) => doc.pied.reseaux[r])
    .map((r) => `<a href="${echapper(doc.pied.reseaux[r])}" style="display:inline-block;margin:0 5px"><img src="${o.base}/marque/reseaux/${r}.png" width="48" height="48" alt="${r}" style="display:block;border:0;width:48px;height:48px"></a>`)
    .join("");
  const c = o.coordonnees;
  const pied = `<tr><td style="background:#efece0;padding:28px 40px 32px;text-align:center;font-size:12px;line-height:1.5;color:#5a5a5a">${reseaux ? `<div style="margin:0 0 20px">${reseaux}</div>` : ""}<p style="margin:0 0 14px">${enHtml(doc.pied.texte)}</p><p style="margin:0">${c.confidentialite ? `<a href="${echapper(c.confidentialite)}" style="${lien}">Politique de confidentialité</a><br>` : ""}${echapper(c.adresse)}<br><a href="mailto:${echapper(c.email)}" style="${lien}">${echapper(c.email)}</a> | ${echapper(c.telephone)}</p><p style="margin:14px 0 0">© ${new Date().getFullYear()} Chambre de Commerce et de Coopération Canada–Madagascar.<br>Tous droits réservés.</p></td></tr>`;
  const bas = `<tr><td style="background:#f1f1f1;padding:18px 24px;text-align:center;font-size:12px;color:#8a8a8a">${echapper(o.mention)}${o.desabonnement ? ` Pour ne plus recevoir ces courriels, <a href="${echapper(o.desabonnement)}" style="${lien}">cliquez ici</a>.` : ""}</td></tr>`;

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 8px;background:#ffffff;font-family:Arial,Helvetica,sans-serif">
${doc.apercu ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${echapper(remplacer(doc.apercu, o.vars))}</div>` : ""}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:${LARGEUR}px">
<tr><td align="center" style="padding:0 0 18px"><img src="${o.base}/marque/logo-couleur.png" width="190" alt="IMPACT 261" style="display:block;width:190px;height:auto;border:0"></td></tr>
${bandeau}
${doc.blocs.map(bloc).join("\n")}
<tr><td style="height:20px"></td></tr>
${appel}
${pied}
${bas}
</table></td></tr></table></body></html>`;
}

// Version texte (messageries sans HTML)
export function versTexte(doc: DocLettre, o: Pick<OptionsRendu, "vars" | "mention" | "desabonnement" | "coordonnees">): string {
  const brut = (h: string) =>
    remplacer(nettoyerHtml(h), o.vars)
      .replace(/<a href="([^"]*)">([\s\S]*?)<\/a>/g, "$2 ($1)")
      .replace(/<br>|<\/p>|<\/li>/g, "\n")
      .replace(/<li>/g, "- ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();
  const lignes = [
    remplacer(doc.bandeau.titre, o.vars),
    remplacer(doc.bandeau.sousTitre, o.vars),
    "",
    ...doc.blocs.flatMap((b) => {
      switch (b.type) {
        case "titre":
          return [remplacer(b.texte, o.vars), ""];
        case "texte":
          return [brut(b.html), ""];
        case "bouton":
          return b.url ? [`${remplacer(b.libelle, o.vars)} : ${b.url}`, ""] : [];
        default:
          return [];
      }
    }),
    ...(doc.appel.actif ? [doc.appel.titre, doc.appel.url ? `${doc.appel.bouton} : ${doc.appel.url}` : "", ""] : []),
    "—",
    doc.pied.texte,
    `${o.coordonnees.email} · ${o.coordonnees.telephone}`,
    o.mention,
    ...(o.desabonnement ? [`Se désabonner : ${o.desabonnement}`] : []),
  ];
  return lignes.filter((l, i, t) => !(l === "" && t[i - 1] === "")).join("\n");
}
