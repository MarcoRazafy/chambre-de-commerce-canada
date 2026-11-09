// Lettre composée en blocs (éditeur visuel de la newsletter) : description, lecture sûre, rendu en HTML
// de courriel (tableaux, styles en ligne) et en texte brut. Utilisé par l'éditeur (aperçu) et par l'envoi.

export type Align = "left" | "center" | "right";
export type Police = "Arial" | "Helvetica" | "Georgia" | "Verdana" | "Trebuchet MS" | "Times New Roman";
export const POLICES: Police[] = ["Arial", "Helvetica", "Georgia", "Verdana", "Trebuchet MS", "Times New Roman"];
export const LARGEURS = [560, 600, 680] as const;

export type Bloc =
  | { id: string; type: "bandeau"; image: string; titre: string; sousTitre: string; fond: string; couleur: string; align: Align }
  | { id: string; type: "titre"; texte: string; taille: number; couleur: string; align: Align; fondSection: string }
  | { id: string; type: "texte"; texte: string; taille: number; couleur: string; align: Align; fondSection: string }
  | { id: string; type: "image"; url: string; alt: string; lien: string; largeur: number; align: Align; fondSection: string }
  | { id: string; type: "bouton"; libelle: string; url: string; fond: string; couleur: string; align: Align; fondSection: string }
  | { id: string; type: "colonnes"; gauche: Colonne; droite: Colonne; fondSection: string }
  | { id: string; type: "separateur"; couleur: string }
  | { id: string; type: "espace"; hauteur: number };

export type Colonne = { image: string; texte: string };
export type TypeBloc = Bloc["type"];

export interface DocLettre {
  v: 1;
  apercu: string; // ligne d'aperçu, affichée après l'objet dans la boîte de réception
  fond: string;
  police: Police;
  largeur: number;
  couleurLiens: string;
  blocs: Bloc[];
}

export const VARIABLES = [
  { cle: "prenom", libelle: "Prénom" },
  { cle: "nom", libelle: "Nom complet" },
  { cle: "entreprise", libelle: "Entreprise" },
  { cle: "email", libelle: "Courriel" },
] as const;
export type Variables = Partial<Record<(typeof VARIABLES)[number]["cle"], string>>;

const COULEUR = /^#[0-9a-f]{6}$/i;
const couleur = (v: unknown, defaut: string) => (typeof v === "string" && COULEUR.test(v) ? v : defaut);
const texte = (v: unknown, max = 5000) => (typeof v === "string" ? v.slice(0, max) : "");
const entier = (v: unknown, min: number, max: number, defaut: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : defaut;
const align = (v: unknown): Align => (v === "left" || v === "right" || v === "center" ? v : "left");
let compteur = 0;
export const nouvelId = () => `b${Date.now().toString(36)}${(compteur++).toString(36)}`;

// Adresse sûre : http(s), mailto, tel, ou un fichier téléversé sur la plateforme
export function urlSure(v: unknown): string {
  const u = texte(v, 2000).trim();
  if (/^(https?:\/\/|mailto:|tel:)/i.test(u) || /^\/televersements\/[\w.\-/]+$/.test(u)) return u;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(u)) return `https://${u}`;
  return "";
}

export function blocVide(type: TypeBloc): Bloc {
  const id = nouvelId();
  switch (type) {
    case "bandeau":
      return { id, type, image: "", titre: "Titre de la lettre", sousTitre: "", fond: "#0f1d2c", couleur: "#ffffff", align: "center" };
    case "titre":
      return { id, type, texte: "Un titre", taille: 24, couleur: "#0f1d2c", align: "left", fondSection: "" };
    case "texte":
      return { id, type, texte: "Bonjour {prenom},\n\nVotre texte ici.", taille: 15, couleur: "#3d4b5c", align: "left", fondSection: "" };
    case "image":
      return { id, type, url: "", alt: "", lien: "", largeur: 100, align: "center", fondSection: "" };
    case "bouton":
      return { id, type, libelle: "En savoir plus", url: "", fond: "#ad0707", couleur: "#ffffff", align: "center", fondSection: "" };
    case "colonnes":
      return { id, type, gauche: { image: "", texte: "Colonne de gauche" }, droite: { image: "", texte: "Colonne de droite" }, fondSection: "" };
    case "separateur":
      return { id, type, couleur: "#e3e8ee" };
    case "espace":
      return { id, type, hauteur: 24 };
  }
}

export function docVide(): DocLettre {
  return {
    v: 1,
    apercu: "",
    fond: "#f3f5f8",
    police: "Arial",
    largeur: 600,
    couleurLiens: "#ad0707",
    blocs: [blocVide("bandeau"), blocVide("texte"), blocVide("bouton")],
  };
}

// Une lettre écrite avant l'éditeur visuel (texte simple) devient un bandeau et un bloc de texte
export function docDepuisTexte(sujet: string, contenu: string): DocLettre {
  const d = docVide();
  return { ...d, blocs: [{ ...(blocVide("bandeau") as Extract<Bloc, { type: "bandeau" }>), titre: sujet }, { ...(blocVide("texte") as Extract<Bloc, { type: "texte" }>), texte: contenu }] };
}

function lireBloc(b: unknown): Bloc | null {
  if (!b || typeof b !== "object") return null;
  const o = b as Record<string, unknown>;
  const id = texte(o.id, 40) || nouvelId();
  const fondSection = o.fondSection ? couleur(o.fondSection, "") : "";
  switch (o.type) {
    case "bandeau":
      return { id, type: "bandeau", image: urlSure(o.image), titre: texte(o.titre, 200), sousTitre: texte(o.sousTitre, 300), fond: couleur(o.fond, "#0f1d2c"), couleur: couleur(o.couleur, "#ffffff"), align: align(o.align) };
    case "titre":
    case "texte":
      return { id, type: o.type, texte: texte(o.texte), taille: entier(o.taille, 11, 44, o.type === "titre" ? 24 : 15), couleur: couleur(o.couleur, "#3d4b5c"), align: align(o.align), fondSection };
    case "image":
      return { id, type: "image", url: urlSure(o.url), alt: texte(o.alt, 200), lien: urlSure(o.lien), largeur: entier(o.largeur, 20, 100, 100), align: align(o.align), fondSection };
    case "bouton":
      return { id, type: "bouton", libelle: texte(o.libelle, 80), url: urlSure(o.url), fond: couleur(o.fond, "#ad0707"), couleur: couleur(o.couleur, "#ffffff"), align: align(o.align), fondSection };
    case "colonnes": {
      const col = (c: unknown): Colonne => {
        const x = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
        return { image: urlSure(x.image), texte: texte(x.texte, 2000) };
      };
      return { id, type: "colonnes", gauche: col(o.gauche), droite: col(o.droite), fondSection };
    }
    case "separateur":
      return { id, type: "separateur", couleur: couleur(o.couleur, "#e3e8ee") };
    case "espace":
      return { id, type: "espace", hauteur: entier(o.hauteur, 4, 120, 24) };
    default:
      return null;
  }
}

// Lit le contenu enregistré : une lettre en blocs (JSON), sinon null (ancienne lettre en texte simple)
export function lireDoc(contenu: string): DocLettre | null {
  if (!contenu.trimStart().startsWith("{")) return null;
  try {
    const o = JSON.parse(contenu) as Record<string, unknown>;
    if (o.v !== 1 || !Array.isArray(o.blocs)) return null;
    return {
      v: 1,
      apercu: texte(o.apercu, 200),
      fond: couleur(o.fond, "#f3f5f8"),
      police: POLICES.includes(o.police as Police) ? (o.police as Police) : "Arial",
      largeur: (LARGEURS as readonly number[]).includes(o.largeur as number) ? (o.largeur as number) : 600,
      couleurLiens: couleur(o.couleurLiens, "#ad0707"),
      blocs: o.blocs.map(lireBloc).filter((b): b is Bloc => b !== null).slice(0, 60),
    };
  } catch {
    return null;
  }
}

const echapper = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const remplacer = (t: string, vars: Variables) =>
  t.replace(/\{(prenom|nom|entreprise|email)\}/g, (_, k: keyof Variables) => vars[k] ?? "");

// Mise en forme légère : **gras**, *italique*, __souligné__, [texte](lien), lignes « - » en liste
export function miseEnForme(brut: string, vars: Variables, couleurLiens: string, base: string): string {
  const absolu = (u: string) => (u.startsWith("/") ? `${base}${u}` : u);
  const ligne = (l: string) =>
    echapper(remplacer(l, vars))
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t: string, u: string) => {
        const url = urlSure(u.replace(/&amp;/g, "&"));
        return url ? `<a href="${echapper(absolu(url))}" style="color:${couleurLiens};text-decoration:underline">${t}</a>` : t;
      })
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<u>$1</u>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");

  return brut
    .split(/\n{2,}/)
    .map((para) => {
      const lignes = para.split("\n");
      if (lignes.every((l) => /^\s*[-•]\s+/.test(l))) {
        return `<ul style="margin:0 0 12px;padding-left:22px">${lignes.map((l) => `<li style="margin:0 0 4px">${ligne(l.replace(/^\s*[-•]\s+/, ""))}</li>`).join("")}</ul>`;
      }
      return `<p style="margin:0 0 12px">${lignes.map(ligne).join("<br>")}</p>`;
    })
    .join("");
}

export type OptionsRendu = {
  base: string; // adresse du site, pour les images téléversées
  logo: string; // HTML de l'en-tête (logo)
  vars: Variables;
  pied: string[]; // lignes de bas de courriel (désabonnement, coordonnées)
};

// Rendu HTML pour les messageries (tableaux et styles en ligne)
export function versHtml(doc: DocLettre, o: OptionsRendu): string {
  const img = (u: string) => (u.startsWith("/") ? `${o.base}${u}` : u);
  const fmt = (t: string) => miseEnForme(t, o.vars, doc.couleurLiens, o.base);
  const section = (contenu: string, fondSection = "", pad = "12px 32px") =>
    `<tr><td style="padding:${pad};${fondSection ? `background:${fondSection};` : ""}">${contenu}</td></tr>`;

  const blocs = doc.blocs
    .map((b) => {
      switch (b.type) {
        case "bandeau":
          return `<tr><td align="${b.align}" style="background:${b.fond};${b.image ? `background-image:url('${echapper(img(b.image))}');background-size:cover;background-position:center;` : ""}padding:36px 32px;color:${b.couleur};text-align:${b.align}">${b.titre ? `<h1 style="margin:0;font-size:28px;line-height:1.25;color:${b.couleur}">${echapper(remplacer(b.titre, o.vars))}</h1>` : ""}${b.sousTitre ? `<p style="margin:8px 0 0;font-size:15px;line-height:1.5;color:${b.couleur};opacity:.9">${echapper(remplacer(b.sousTitre, o.vars))}</p>` : ""}</td></tr>`;
        case "titre":
          return section(`<h2 style="margin:0;font-size:${b.taille}px;line-height:1.3;color:${b.couleur};text-align:${b.align}">${echapper(remplacer(b.texte, o.vars))}</h2>`, b.fondSection, "16px 32px 4px");
        case "texte":
          return section(`<div style="font-size:${b.taille}px;line-height:1.6;color:${b.couleur};text-align:${b.align}">${fmt(b.texte)}</div>`, b.fondSection);
        case "image": {
          if (!b.url) return "";
          const largeur = Math.round(((doc.largeur - 64) * b.largeur) / 100);
          const balise = `<img src="${echapper(img(b.url))}" width="${largeur}" alt="${echapper(b.alt)}" style="display:block;width:100%;max-width:${largeur}px;height:auto;border:0;border-radius:8px">`;
          return section(`<table role="presentation" cellspacing="0" cellpadding="0" align="${b.align}" style="margin:${b.align === "center" ? "0 auto" : "0"}"><tr><td>${b.lien ? `<a href="${echapper(img(b.lien))}">${balise}</a>` : balise}</td></tr></table>`, b.fondSection);
        }
        case "bouton":
          return section(`<div style="text-align:${b.align}"><a href="${echapper(img(b.url) || "#")}" style="display:inline-block;background:${b.fond};color:${b.couleur};text-decoration:none;font-weight:bold;font-size:15px;padding:13px 26px;border-radius:8px">${echapper(remplacer(b.libelle, o.vars))}</a></div>`, b.fondSection, "16px 32px");
        case "colonnes": {
          const col = (c: Colonne) =>
            `<td class="col" width="50%" valign="top" style="padding:0 8px;font-size:14px;line-height:1.6;color:#3d4b5c">${c.image ? `<img src="${echapper(img(c.image))}" alt="" style="display:block;width:100%;height:auto;border-radius:8px;margin:0 0 10px">` : ""}${fmt(c.texte)}</td>`;
          return section(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 -8px"><tr>${col(b.gauche)}${col(b.droite)}</tr></table>`, b.fondSection);
        }
        case "separateur":
          return section(`<div style="border-top:1px solid ${b.couleur};height:1px;line-height:1px">&nbsp;</div>`, "", "12px 32px");
        case "espace":
          return `<tr><td style="height:${b.hauteur}px;line-height:${b.hauteur}px;font-size:1px">&nbsp;</td></tr>`;
      }
    })
    .join("\n");

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@media (max-width:620px){.col{display:block!important;width:100%!important;padding:0 0 14px!important}}</style></head>
<body style="margin:0;padding:24px 12px;background:${doc.fond};font-family:'${doc.police}',Arial,sans-serif">
${doc.apercu ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${echapper(remplacer(doc.apercu, o.vars))}</div>` : ""}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:${doc.largeur}px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0f1d2c;padding:18px 32px">${o.logo}</td></tr>
${blocs}
<tr><td style="height:16px"></td></tr>
<tr><td style="padding:16px 32px;background:#f7f9fb;font-size:12px;line-height:1.5;color:#8a97a6">${o.pied.map(echapper).join("<br>")}</td></tr>
</table></td></tr></table></body></html>`;
}

// Version texte (messageries sans HTML)
export function versTexte(doc: DocLettre, vars: Variables, pied: string[]): string {
  const brut = (t: string) => remplacer(t, vars).replace(/\*\*|__|\*/g, "").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)");
  const lignes = doc.blocs.flatMap((b) => {
    switch (b.type) {
      case "bandeau":
        return [brut(b.titre), b.sousTitre ? brut(b.sousTitre) : "", ""];
      case "titre":
      case "texte":
        return [brut(b.texte), ""];
      case "bouton":
        return b.url ? [`${brut(b.libelle)} : ${b.url}`, ""] : [];
      case "colonnes":
        return [brut(b.gauche.texte), "", brut(b.droite.texte), ""];
      case "separateur":
        return ["—", ""];
      default:
        return [];
    }
  });
  return [...lignes, "—", ...pied].filter((l, i, t) => !(l === "" && t[i - 1] === "")).join("\n");
}
