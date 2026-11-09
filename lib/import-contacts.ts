// Import de contacts depuis un fichier CSV : lecture du fichier, correspondance entre les colonnes
// du fichier et les informations attendues, puis contrôle de chaque ligne avant l'envoi.

export const LIGNES_IMPORT_MAX = 2000;
const ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CHAMPS_IMPORT = [
  { cle: "entreprise", libelle: "Entreprise", requis: true, synonymes: ["entreprise", "societe", "company", "organisation", "organization", "raison sociale", "membre"] },
  { cle: "nom", libelle: "Nom du contact", requis: true, synonymes: ["nom", "contact", "name", "nom complet", "full name", "prenom nom", "representant"] },
  { cle: "email", libelle: "Courriel", requis: true, synonymes: ["email", "e-mail", "courriel", "mail", "adresse"] },
  { cle: "fonction", libelle: "Fonction", requis: false, synonymes: ["fonction", "poste", "titre", "title", "role", "job"] },
  { cle: "tel", libelle: "Téléphone", requis: false, synonymes: ["telephone", "tel", "phone", "mobile", "portable", "gsm"] },
  { cle: "secteur", libelle: "Secteur", requis: false, synonymes: ["secteur", "activite", "industrie", "industry", "sector", "domaine"] },
  { cle: "ville", libelle: "Ville", requis: false, synonymes: ["ville", "city", "localite", "commune"] },
  { cle: "tags", libelle: "Tags", requis: false, synonymes: ["tags", "tag", "etiquettes", "etiquette", "labels", "groupes"] },
] as const;

export type CleImport = (typeof CHAMPS_IMPORT)[number]["cle"];
// Pour chaque information, l'index de la colonne du fichier (-1 : ne pas importer)
export type Correspondance = Record<CleImport, number>;

export type LigneImport = {
  entreprise: string;
  nom: string;
  email: string;
  fonction: string;
  tel: string;
  secteur: string;
  ville: string;
  tags: string[];
};

const simple = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();

// Lit un CSV (séparateur « ; », « , » ou tabulation, guillemets doublés) : en-têtes puis lignes
export function lireCsv(brut: string): { entetes: string[]; lignes: string[][] } {
  const texte = brut.replace(/^﻿/, "");
  const premiere = texte.split(/\r?\n/, 1)[0] ?? "";
  const compte = (c: string) => premiere.split(c).length - 1;
  const sep = [";", ",", "\t"].sort((a, b) => compte(b) - compte(a))[0];

  const lignes: string[][] = [];
  let ligne: string[] = [], cellule = "", guillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guillemets) {
      if (c === '"' && texte[i + 1] === '"') { cellule += '"'; i++; }
      else if (c === '"') guillemets = false;
      else cellule += c;
    } else if (c === '"' && cellule === "") guillemets = true;
    else if (c === sep) { ligne.push(cellule.trim()); cellule = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texte[i + 1] === "\n") i++;
      ligne.push(cellule.trim()); cellule = "";
      if (ligne.some(Boolean)) lignes.push(ligne);
      ligne = [];
      if (lignes.length > LIGNES_IMPORT_MAX) break;
    } else cellule += c;
  }
  ligne.push(cellule.trim());
  if (ligne.some(Boolean)) lignes.push(ligne);

  const [entetes = [], ...reste] = lignes;
  return { entetes, lignes: reste.slice(0, LIGNES_IMPORT_MAX) };
}

// Devine la colonne de chaque information d'après les en-têtes du fichier (une colonne ne sert qu'une fois)
export function devinerCorrespondance(entetes: string[]): Correspondance {
  const prises = new Set<number>();
  const sortie = {} as Correspondance;
  const propres = entetes.map(simple);
  for (const champ of CHAMPS_IMPORT) {
    let trouve = -1;
    for (const passe of ["exact", "contient"] as const) {
      trouve = propres.findIndex(
        (e, i) => !prises.has(i) && champ.synonymes.some((s) => (passe === "exact" ? e === s : e.includes(s))),
      );
      if (trouve >= 0) break;
    }
    if (trouve >= 0) prises.add(trouve);
    sortie[champ.cle] = trouve;
  }
  return sortie;
}

export type LignePreparee = { numero: number; ligne: LigneImport | null; erreur: string | null };

// Construit chaque ligne selon la correspondance, et dit ce qui manque
export function preparerLignes(lignes: string[][], c: Correspondance): LignePreparee[] {
  const vus = new Set<string>();
  return lignes.map((cellules, i) => {
    const val = (cle: CleImport) => (c[cle] >= 0 ? (cellules[c[cle]] ?? "").trim() : "");
    const numero = i + 2; // la ligne 1 du fichier : les en-têtes
    const email = val("email").toLowerCase();
    const ligne: LigneImport = {
      entreprise: val("entreprise").slice(0, 120),
      nom: val("nom").slice(0, 120),
      email,
      fonction: val("fonction").slice(0, 120),
      tel: val("tel").slice(0, 40),
      secteur: val("secteur").slice(0, 80),
      ville: val("ville").slice(0, 80),
      tags: [...new Set(val("tags").split(/[,;|]/).map((t) => t.trim().replace(/\s+/g, " ").slice(0, 60)).filter(Boolean))].slice(0, 20),
    };
    const manque = [!ligne.entreprise && "entreprise", !ligne.nom && "nom du contact", !email && "courriel"].filter(Boolean);
    if (manque.length) return { numero, ligne: null, erreur: `Manque : ${manque.join(", ")}` };
    if (!ADRESSE.test(email)) return { numero, ligne: null, erreur: `« ${email} » n’est pas un courriel valide` };
    if (vus.has(email)) return { numero, ligne: null, erreur: `${email} apparaît déjà plus haut dans le fichier` };
    vus.add(email);
    return { numero, ligne, erreur: null };
  });
}

// Contrôle côté serveur d'une ligne reçue (on ne fait pas confiance au navigateur)
export function ligneValide(l: unknown): LigneImport | null {
  if (!l || typeof l !== "object") return null;
  const o = l as Record<string, unknown>;
  const t = (k: string, max: number) => (typeof o[k] === "string" ? (o[k] as string).trim().slice(0, max) : "");
  const email = t("email", 200).toLowerCase();
  const ligne: LigneImport = {
    entreprise: t("entreprise", 120),
    nom: t("nom", 120),
    email,
    fonction: t("fonction", 120),
    tel: t("tel", 40),
    secteur: t("secteur", 80),
    ville: t("ville", 80),
    tags: Array.isArray(o.tags)
      ? [...new Set(o.tags.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, 60)).filter(Boolean))].slice(0, 20)
      : [],
  };
  return ligne.entreprise && ligne.nom && ADRESSE.test(email) ? ligne : null;
}
