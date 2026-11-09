// Lettre de la newsletter, faite de sections libres (logo, bandeau, titre, texte, image, bouton, encadré
// d'appel, réseaux sociaux, pied, séparateur, espace) : chacune s'ajoute, se déplace, se supprime et se règle
// (taille, couleurs de la palette IMPACT 261, alignement). Lecture sûre, nettoyage du texte mis en forme,
// rendu HTML de courriel et texte brut — partagés par l'éditeur et l'envoi.

export const LARGEUR = 600;
export const POLICE = "Inter, 'Helvetica Neue', Arial, sans-serif";

// Palette de la plateforme (charte IMPACT 261) : seules ces couleurs sont proposées
export const PALETTE = {
  rouge: { hex: "#ad0707", libelle: "Rouge" },
  bordeaux: { hex: "#8b0512", libelle: "Bordeaux" },
  vert: { hex: "#007140", libelle: "Vert" },
  marine: { hex: "#0f1d2c", libelle: "Marine" },
  encre: { hex: "#16202b", libelle: "Encre" },
  ardoise: { hex: "#5b6b7a", libelle: "Gris" },
  blanc: { hex: "#ffffff", libelle: "Blanc" },
  rose: { hex: "#fdeaed", libelle: "Rose pâle" },
  menthe: { hex: "#e3f3ea", libelle: "Vert pâle" },
  ciel: { hex: "#e6ecf4", libelle: "Bleu pâle" },
  brume: { hex: "#f1f4f7", libelle: "Gris pâle" },
} as const;
export type Couleur = keyof typeof PALETTE;
export const COULEURS = Object.keys(PALETTE) as Couleur[];
// Le dégradé signature (rouge → vert), pour les fonds
export const DEGRADE = "linear-gradient(120deg,#ad0707 0%,#5c1220 52%,#007140 100%)";
export type Fond = Couleur | "degrade" | "";
export const hex = (c: Couleur) => PALETTE[c].hex;

export type Align = "left" | "center" | "right";
export const RESEAUX = ["facebook", "youtube", "linkedin", "instagram", "tiktok"] as const;
export type Reseau = (typeof RESEAUX)[number];

type Base = { id: string; fond: Fond; align: Align };
export type Section =
  | (Base & { type: "logo"; image: string; largeur: number })
  | (Base & { type: "bandeau"; image: string; titre: string; sousTitre: string; taille: number; couleur: Couleur })
  | (Base & { type: "titre"; texte: string; taille: number; couleur: Couleur })
  | (Base & { type: "texte"; html: string; taille: number; couleur: Couleur })
  | (Base & { type: "image"; url: string; lien: string; alt: string; largeur: number })
  | (Base & { type: "bouton"; libelle: string; url: string; couleurBouton: Couleur; couleur: Couleur; taille: number })
  | (Base & { type: "appel"; titre: string; bouton: string; url: string; taille: number; couleur: Couleur; couleurBouton: Couleur; couleurTexteBouton: Couleur })
  | (Base & { type: "reseaux"; liens: Record<Reseau, string> })
  | (Base & { type: "pied"; texte: string; confidentialite: string; adresse: string; email: string; telephone: string; copyright: string; couleur: Couleur; taille: number })
  | (Base & { type: "separateur"; couleur: Couleur })
  | (Base & { type: "espace"; hauteur: number });
export type TypeSection = Section["type"];

export const TYPES_SECTION: { type: TypeSection; libelle: string }[] = [
  { type: "logo", libelle: "Logo" },
  { type: "bandeau", libelle: "Bandeau" },
  { type: "titre", libelle: "Titre" },
  { type: "texte", libelle: "Texte" },
  { type: "image", libelle: "Image" },
  { type: "bouton", libelle: "Bouton" },
  { type: "appel", libelle: "Encadré d’appel" },
  { type: "reseaux", libelle: "Réseaux sociaux" },
  { type: "pied", libelle: "Pied de page" },
  { type: "separateur", libelle: "Séparateur" },
  { type: "espace", libelle: "Espace" },
];

export interface DocLettre {
  v: 3;
  apercu: string; // ligne d'aperçu, affichée après l'objet dans la boîte de réception
  fond: Couleur; // fond autour de la lettre
  sections: Section[];
}

export const VARIABLES = [
  { cle: "prenom", libelle: "Prénom" },
  { cle: "nom", libelle: "Nom complet" },
  { cle: "entreprise", libelle: "Entreprise" },
  { cle: "email", libelle: "Courriel" },
] as const;
export type Variables = Partial<Record<(typeof VARIABLES)[number]["cle"], string>>;

const chaine = (v: unknown, max = 5000) => (typeof v === "string" ? v.slice(0, max) : "");
const entier = (v: unknown, min: number, max: number, defaut: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : defaut;
const couleur = (v: unknown, defaut: Couleur): Couleur => (typeof v === "string" && v in PALETTE ? (v as Couleur) : defaut);
const fond = (v: unknown, defaut: Fond): Fond => (v === "degrade" || v === "" ? v : typeof v === "string" && v in PALETTE ? (v as Couleur) : defaut);
const align = (v: unknown, defaut: Align): Align => (v === "left" || v === "center" || v === "right" ? v : defaut);
let compteur = 0;
export const nouvelId = () => `s${Date.now().toString(36)}${(compteur++).toString(36)}`;

// Adresse sûre : http(s), mailto, tel, ou un fichier téléversé sur la plateforme
export function urlSure(v: unknown): string {
  const u = chaine(v, 2000).trim();
  if (/^(https?:\/\/|mailto:|tel:)/i.test(u) || /^\/televersements\/[\w.\-/]+$/.test(u)) return u;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(u)) return `https://${u}`;
  return "";
}

const echapper = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const enHtml = (t: string) => echapper(t).replace(/\n/g, "<br>");

// Texte mis en forme dans l'éditeur : seules ces balises restent, sans attribut (sauf l'adresse d'un lien)
const BALISES: Record<string, string> = {
  b: "strong", strong: "strong", i: "em", em: "em", u: "u", br: "br", p: "p", div: "p", ul: "ul", ol: "ol", li: "li", a: "a",
  span: "span", font: "span",
};
const ALIGNEMENTS = ["left", "center", "right", "justify"];
// Une couleur écrite par le navigateur (#hex, rgb(), ou l'attribut color de <font>), gardée si elle est dans la palette
function couleurPalette(attributs: string): string | null {
  const brut = /color\s*[:=]\s*["']?\s*(#[0-9a-f]{3,6}|rgb\([^)]*\))/i.exec(attributs)?.[1]?.toLowerCase();
  if (!brut) return null;
  let h = brut;
  const rgb = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(brut);
  if (rgb) h = `#${rgb.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
  return Object.values(PALETTE).some((c) => c.hex === h) ? h : null;
}
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
      if (propre === "span") {
        const c = couleurPalette(attributs);
        return c ? `<span style="color:${c}">` : "<span>";
      }
      if (propre === "p") {
        const a = /text-align\s*:\s*(\w+)/i.exec(attributs)?.[1]?.toLowerCase() ?? /align\s*=\s*["']?(\w+)/i.exec(attributs)?.[1]?.toLowerCase();
        return a && ALIGNEMENTS.includes(a) ? `<p style="text-align:${a}">` : "<p>";
      }
      if (propre === "a") {
        const href = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attributs);
        const url = urlSure((href?.[2] ?? href?.[3] ?? href?.[4] ?? "").replace(/&amp;/g, "&"));
        return url ? `<a href="${echapper(url)}">` : "<a>";
      }
      return propre === "br" ? "<br>" : `<${propre}>`;
    });
}

// Coordonnées par défaut du pied de page (modifiables dans chaque lettre)
export const PIED_DEFAUT = {
  confidentialite: "https://www.formation.cancham.mg/contidentialite",
  adresse: "Antananarivo, Madagascar",
  email: "info@cancham.mg",
  telephone: "+261 34 50 280 53",
  copyright: `© ${new Date().getFullYear()} Chambre de Commerce et de Coopération Canada–Madagascar. Tous droits réservés.`,
};

const PIED = "La Chambre de Commerce et de Coopération Canada–Madagascar rassemble les entreprises des deux pays et facilite leurs échanges.";

export function sectionVide(type: TypeSection, reseaux: Partial<Record<Reseau, string>> = {}): Section {
  const id = nouvelId();
  switch (type) {
    case "logo":
      return { id, type, fond: "", align: "center", image: "", largeur: 190 };
    case "bandeau":
      return { id, type, fond: "degrade", align: "left", image: "", titre: "La lettre de la Chambre", sousTitre: "Canada – Madagascar", taille: 34, couleur: "blanc" };
    case "titre":
      return { id, type, fond: "", align: "left", texte: "Un titre de rubrique", taille: 22, couleur: "encre" };
    case "texte":
      return { id, type, fond: "", align: "left", html: "Votre texte ici.", taille: 15, couleur: "ardoise" };
    case "image":
      return { id, type, fond: "", align: "center", url: "", lien: "", alt: "", largeur: 100 };
    case "bouton":
      return { id, type, fond: "", align: "center", libelle: "En savoir plus", url: "", couleurBouton: "rouge", couleur: "blanc", taille: 15 };
    case "appel":
      return { id, type, fond: "marine", align: "center", titre: "Rejoignez-nous au prochain événement", bouton: "Je m’inscris", url: "", taille: 26, couleur: "blanc", couleurBouton: "rouge", couleurTexteBouton: "blanc" };
    case "reseaux":
      return { id, type, fond: "brume", align: "center", liens: { facebook: "", youtube: "", linkedin: "", instagram: "", tiktok: "", ...reseaux } };
    case "pied":
      return { id, type, fond: "brume", align: "center", texte: PIED, ...PIED_DEFAUT, couleur: "ardoise", taille: 12 };
    case "separateur":
      return { id, type, fond: "", align: "center", couleur: "ciel" };
    case "espace":
      return { id, type, fond: "", align: "center", hauteur: 24 };
  }
}

export function docVide(reseaux: Partial<Record<Reseau, string>> = {}): DocLettre {
  const intro = sectionVide("texte") as Extract<Section, { type: "texte" }>;
  intro.html = "Bonjour {prenom},<br><br>Voici les nouvelles du mois : événements, rencontres et opportunités d’affaires entre le Canada et Madagascar.";
  return {
    v: 3,
    apercu: "",
    fond: "brume",
    sections: [sectionVide("logo"), sectionVide("bandeau"), intro, sectionVide("titre"), sectionVide("texte"), sectionVide("appel"), sectionVide("reseaux", reseaux), sectionVide("pied")],
  };
}

// Une lettre écrite en texte simple devient une lettre de ce modèle
export function docDepuisTexte(sujet: string, contenu: string, reseaux: Partial<Record<Reseau, string>> = {}): DocLettre {
  const bandeau = { ...(sectionVide("bandeau") as Extract<Section, { type: "bandeau" }>), titre: sujet || "La lettre de la Chambre" };
  const textes = contenu.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => ({ ...(sectionVide("texte") as Extract<Section, { type: "texte" }>), html: enHtml(p) }));
  return { v: 3, apercu: "", fond: "brume", sections: [sectionVide("logo"), bandeau, ...textes, sectionVide("reseaux", reseaux), sectionVide("pied")] };
}

function lireSection(s: unknown): Section | null {
  if (!s || typeof s !== "object") return null;
  const o = s as Record<string, unknown>;
  const type = o.type as TypeSection;
  if (!TYPES_SECTION.some((t) => t.type === type)) return null;
  const d = sectionVide(type);
  const base = { id: chaine(o.id, 40) || d.id, fond: fond(o.fond, d.fond), align: align(o.align, d.align) };
  switch (d.type) {
    case "logo":
      return { ...d, ...base, image: urlSure(o.image), largeur: entier(o.largeur, 60, 400, d.largeur) };
    case "bandeau":
      return { ...d, ...base, image: urlSure(o.image), titre: chaine(o.titre, 200), sousTitre: chaine(o.sousTitre, 300), taille: entier(o.taille, 18, 56, d.taille), couleur: couleur(o.couleur, d.couleur) };
    case "titre":
      return { ...d, ...base, texte: chaine(o.texte, 300), taille: entier(o.taille, 14, 44, d.taille), couleur: couleur(o.couleur, d.couleur) };
    case "texte":
      return { ...d, ...base, html: nettoyerHtml(typeof o.html === "string" ? o.html : enHtml(chaine(o.texte))), taille: entier(o.taille, 11, 24, d.taille), couleur: couleur(o.couleur, d.couleur) };
    case "image":
      return { ...d, ...base, url: urlSure(o.url), lien: urlSure(o.lien), alt: chaine(o.alt, 200), largeur: entier(o.largeur, 20, 100, d.largeur) };
    case "bouton":
      return { ...d, ...base, libelle: chaine(o.libelle, 80), url: urlSure(o.url), couleurBouton: couleur(o.couleurBouton, d.couleurBouton), couleur: couleur(o.couleur, d.couleur), taille: entier(o.taille, 12, 22, d.taille) };
    case "appel":
      return { ...d, ...base, titre: chaine(o.titre, 200), bouton: chaine(o.bouton, 80), url: urlSure(o.url), taille: entier(o.taille, 16, 40, d.taille), couleur: couleur(o.couleur, d.couleur), couleurBouton: couleur(o.couleurBouton, d.couleurBouton), couleurTexteBouton: couleur(o.couleurTexteBouton, d.couleurTexteBouton) };
    case "reseaux": {
      const l = (o.liens ?? {}) as Record<string, unknown>;
      return { ...d, ...base, liens: Object.fromEntries(RESEAUX.map((r) => [r, urlSure(l[r])])) as Record<Reseau, string> };
    }
    case "pied": {
      const champ = (k: keyof typeof PIED_DEFAUT, max = 200) => (typeof o[k] === "string" ? chaine(o[k], max) : d[k]);
      return {
        ...d, ...base, texte: chaine(o.texte, 1000), confidentialite: typeof o.confidentialite === "string" ? urlSure(o.confidentialite) : d.confidentialite,
        adresse: champ("adresse"), email: champ("email"), telephone: champ("telephone"), copyright: champ("copyright", 300),
        couleur: couleur(o.couleur, d.couleur), taille: entier(o.taille, 10, 16, d.taille),
      };
    }
    case "separateur":
      return { ...d, ...base, couleur: couleur(o.couleur, d.couleur) };
    case "espace":
      return { ...d, ...base, hauteur: entier(o.hauteur, 4, 120, d.hauteur) };
  }
}

// Anciennes versions de l'éditeur (1 et 2) : reprises dans ce modèle
function depuisAncien(o: Record<string, unknown>, reseaux: Partial<Record<Reseau, string>>): DocLettre {
  const blocs = (Array.isArray(o.blocs) ? o.blocs : []) as Record<string, unknown>[];
  const ba = (o.v === 2 ? o.bandeau : blocs.find((b) => b?.type === "bandeau")) as Record<string, unknown> | undefined;
  const sections: Section[] = [sectionVide("logo")];
  if (ba) sections.push(lireSection({ ...sectionVide("bandeau"), image: ba.image, titre: ba.titre, sousTitre: ba.sousTitre })!);
  for (const b of blocs) {
    if (b?.type === "bandeau") continue;
    const s = lireSection({ ...b, id: undefined, fond: "", couleur: undefined, taille: undefined });
    if (s) sections.push(s);
  }
  const ap = o.appel as Record<string, unknown> | undefined;
  if (o.v === 2 && ap && ap.actif !== false) sections.push(lireSection({ ...sectionVide("appel"), titre: ap.titre, bouton: ap.bouton, url: ap.url })!);
  const pi = o.pied as Record<string, unknown> | undefined;
  sections.push(lireSection({ ...sectionVide("reseaux", reseaux), ...(pi?.reseaux ? { liens: pi.reseaux } : {}) })!);
  sections.push(lireSection({ ...sectionVide("pied"), ...(pi?.texte ? { texte: pi.texte } : {}) })!);
  return { v: 3, apercu: chaine(o.apercu, 200), fond: "brume", sections };
}

// Lit le contenu enregistré : une lettre de l'éditeur (JSON), sinon null (texte simple)
export function lireDoc(contenu: string, reseaux: Partial<Record<Reseau, string>> = {}): DocLettre | null {
  if (!contenu.trimStart().startsWith("{")) return null;
  try {
    const o = JSON.parse(contenu) as Record<string, unknown>;
    if (o.v === 1 || o.v === 2) return depuisAncien(o, reseaux);
    if (o.v !== 3 || !Array.isArray(o.sections)) return null;
    return {
      v: 3,
      apercu: chaine(o.apercu, 200),
      fond: couleur(o.fond, "brume"),
      sections: o.sections.map(lireSection).filter((s): s is Section => s !== null).slice(0, 80),
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

// Fond d'une section, pour un courriel (couleur de repli quand le dégradé n'est pas affiché)
export function styleFond(f: Fond, image = "", abs: (u: string) => string = (u) => u): string {
  if (image) return `background-color:${hex("rouge")};background-image:url('${echapper(abs(image))}');background-size:cover;background-position:center;`;
  if (f === "degrade") return `background-color:${hex("rouge")};background-image:${DEGRADE};`;
  return f ? `background-color:${hex(f)};` : "";
}

// Rendu HTML pour les messageries (tableaux et styles en ligne)
export function versHtml(doc: DocLettre, o: OptionsRendu): string {
  const abs = (u: string) => (u.startsWith("/") ? `${o.base}${u}` : u);
  const lien = `color:${hex("rouge")};text-decoration:none`;
  const riche = (html: string) =>
    remplacer(nettoyerHtml(html), o.vars)
      .replace(/<a href="([^"]*)">/g, (_, u: string) => `<a href="${echapper(abs(u.replace(/&amp;/g, "&")))}" style="${lien}">`)
      .replace(/<p>/g, '<p style="margin:0 0 12px">')
      .replace(/<p style="text-align:(\w+)">/g, '<p style="margin:0 0 12px;text-align:$1">')
      .replace(/<(ul|ol)>/g, '<$1 style="margin:0 0 12px;padding-left:22px">');
  const v = (t: string) => echapper(remplacer(t, o.vars));
  const cellule = (s: Section, contenu: string, pad = "12px 32px") =>
    `<tr><td align="${s.align}" style="${styleFond(s.fond)}padding:${pad};text-align:${s.align}">${contenu}</td></tr>`;

  const section = (s: Section): string => {
    switch (s.type) {
      case "logo":
        return cellule(s, `<img src="${echapper(s.image ? abs(s.image) : `${o.base}/marque/logo-couleur.png`)}" width="${s.largeur}" alt="Logo" style="display:inline-block;width:${s.largeur}px;max-width:100%;height:auto;border:0">`, "24px 32px 18px");
      case "bandeau":
        return `<tr><td style="padding:0 0 24px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="${s.align}" ${s.image ? `background="${echapper(abs(s.image))}" ` : ""}style="${styleFond(s.fond, s.image, abs)}border-radius:16px;padding:56px 40px;text-align:${s.align}">${s.titre ? `<div style="font-size:${s.taille}px;line-height:1.12;font-weight:800;letter-spacing:-0.02em;color:${hex(s.couleur)}">${v(s.titre)}</div>` : ""}${s.sousTitre ? `<div style="margin-top:10px;font-size:${Math.round(s.taille * 0.5)}px;line-height:1.35;font-weight:600;color:${hex(s.couleur)}">${v(s.sousTitre)}</div>` : ""}</td></tr></table></td></tr>`;
      case "titre":
        return cellule(s, `<h2 style="margin:0;font-size:${s.taille}px;line-height:1.3;font-weight:700;letter-spacing:-0.015em;color:${hex(s.couleur)}">${v(s.texte)}</h2>`, "16px 32px 6px");
      case "texte":
        return cellule(s, `<div style="font-size:${s.taille}px;line-height:1.65;color:${hex(s.couleur)}">${riche(s.html)}</div>`);
      case "image": {
        if (!s.url) return "";
        const l = Math.round(((LARGEUR - 64) * s.largeur) / 100);
        const img = `<img src="${echapper(abs(s.url))}" width="${l}" alt="${echapper(s.alt)}" style="display:inline-block;width:100%;max-width:${l}px;height:auto;border:0;border-radius:12px">`;
        return cellule(s, s.lien ? `<a href="${echapper(abs(s.lien))}">${img}</a>` : img);
      }
      case "bouton":
        return cellule(s, `<a href="${echapper(abs(s.url) || "#")}" style="display:inline-block;background:${hex(s.couleurBouton)};color:${hex(s.couleur)};text-decoration:none;font-weight:700;font-size:${s.taille}px;padding:13px 26px;border-radius:8px">${v(s.libelle)}</a>`, "14px 32px 22px");
      case "appel":
        return cellule(s, `<div style="font-size:${s.taille}px;line-height:1.25;font-weight:700;letter-spacing:-0.015em;color:${hex(s.couleur)};margin:0 0 16px">${v(s.titre)}</div>${s.bouton ? `<a href="${echapper(abs(s.url) || "#")}" style="display:inline-block;background:${hex(s.couleurBouton)};color:${hex(s.couleurTexteBouton)};text-decoration:none;font-weight:700;font-size:15px;padding:11px 22px;border-radius:8px">${echapper(s.bouton)}</a>` : ""}`, "34px 32px");
      case "reseaux": {
        const liens = RESEAUX.filter((r) => s.liens[r])
          .map((r) => `<a href="${echapper(s.liens[r])}" style="display:inline-block;margin:0 5px"><img src="${o.base}/marque/reseaux/${r}.png" width="44" height="44" alt="${r}" style="display:block;border:0;width:44px;height:44px"></a>`)
          .join("");
        return liens ? cellule(s, liens, "24px 32px 8px") : "";
      }
      case "pied":
        return cellule(s, `<div style="font-size:${s.taille}px;line-height:1.55;color:${hex(s.couleur)}">${s.texte ? `<p style="margin:0 0 12px">${enHtml(s.texte)}</p>` : ""}<p style="margin:0">${s.confidentialite ? `<a href="${echapper(s.confidentialite)}" style="${lien}">Politique de confidentialité</a><br>` : ""}${s.adresse ? `${echapper(s.adresse)}<br>` : ""}${s.email ? `<a href="mailto:${echapper(s.email)}" style="${lien}">${echapper(s.email)}</a>` : ""}${s.email && s.telephone ? " | " : ""}${echapper(s.telephone)}</p>${s.copyright ? `<p style="margin:12px 0 0">${echapper(s.copyright)}</p>` : ""}</div>`, "12px 40px 28px");
      case "separateur":
        return cellule(s, `<div style="border-top:1px solid ${hex(s.couleur)};height:1px;line-height:1px;font-size:1px">&nbsp;</div>`, "14px 32px");
      case "espace":
        return `<tr><td style="${styleFond(s.fond)}height:${s.hauteur}px;line-height:${s.hauteur}px;font-size:1px">&nbsp;</td></tr>`;
    }
  };

  const bas = `<tr><td style="padding:16px 24px;text-align:center;font-size:11.5px;line-height:1.5;color:${hex("ardoise")}">${echapper(o.mention)}${o.desabonnement ? ` Pour ne plus recevoir ces courriels, <a href="${echapper(o.desabonnement)}" style="${lien}">cliquez ici</a>.` : ""}</td></tr>`;

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:24px 8px;background:${hex(doc.fond)};font-family:${POLICE}">
${doc.apercu ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${v(doc.apercu)}</div>` : ""}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:${LARGEUR}px;background:#ffffff;border-radius:14px;overflow:hidden">
${doc.sections.map(section).join("\n")}
</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:${LARGEUR}px">${bas}</table>
</td></tr></table></body></html>`;
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
  const r = (t: string) => remplacer(t, o.vars);
  const lignes = doc.sections.flatMap((s) => {
    switch (s.type) {
      case "bandeau":
        return [r(s.titre), r(s.sousTitre), ""];
      case "titre":
        return [r(s.texte), ""];
      case "texte":
        return [brut(s.html), ""];
      case "bouton":
        return s.url ? [`${r(s.libelle)} : ${s.url}`, ""] : [];
      case "appel":
        return [r(s.titre), s.url ? `${s.bouton} : ${s.url}` : "", ""];
      case "pied":
        return ["—", s.texte, s.adresse, [s.email, s.telephone].filter(Boolean).join(" · "), s.copyright, ""];
      case "separateur":
        return ["—", ""];
      default:
        return [];
    }
  });
  return [...lignes, o.mention, ...(o.desabonnement ? [`Se désabonner : ${o.desabonnement}`] : [])]
    .filter((l, i, t) => !(l === "" && t[i - 1] === ""))
    .join("\n");
}
