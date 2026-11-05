// Blocs d'une ressource « Page », repris de CanCham Connect : titre, texte riche, photo, vidéo.
// Partagé entre le navigateur (éditeur, lecture) et le serveur (validation avant enregistrement).
// Les photos et vidéos déposées sont désignées par le numéro de leur fichier (table res_medias).

export type Taille = 'petit' | 'grand' | 'tres-grand';
export type Alignement = 'centre' | 'droite';

export interface Passage { t: string; g?: true; i?: true; s?: true; lien?: string; couleur?: string; taille?: Taille }
export type Ligne = { genre: 'p'; passages: Passage[]; alignement?: Alignement } | { genre: 'ul' | 'ol'; items: Passage[][] };

export interface BlocTitre { type: 'titre'; texte: string; niveau: 2 | 3; alignement?: Alignement; couleur?: string }
export interface BlocTexte { type: 'texte'; lignes: Ligne[] }
export interface BlocPhoto { type: 'photo'; media: number; legende?: string }
export type BlocVideo = { type: 'video'; source: 'fichier'; media: number } | { type: 'video'; source: 'lien'; url: string };
export type Bloc = BlocTitre | BlocTexte | BlocPhoto | BlocVideo;
export type TypeBloc = Bloc['type'];

export const PLAFOND_BLOCS = 80;
export const PLAFOND_TEXTE = 30000;

export const PALETTE_TEXTE = [
  { nom: 'Rouge CanCham', valeur: '#ad0707' },
  { nom: 'Vert CanCham', valeur: '#007140' },
  { nom: 'Bleu nuit', valeur: '#0f1d2c' },
  { nom: 'Bleu', valeur: '#163254' },
  { nom: 'Rouge clair', valeur: '#d32020' },
  { nom: 'Vert clair', valeur: '#14a05f' },
  { nom: 'Gris', valeur: '#5f6b7a' },
] as const;

export const TAILLES: { valeur: Taille | ''; nom: string }[] = [
  { valeur: 'petit', nom: 'Petit' }, { valeur: '', nom: 'Normal' }, { valeur: 'grand', nom: 'Grand' }, { valeur: 'tres-grand', nom: 'Très grand' },
];

const COULEUR = /^#[0-9a-f]{6}$/;
const idMedia = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null);

// Lien sûr : adresse web, courriel, téléphone ou chemin interne ; rien d'autre (pas de javascript:)
export function lienSur(saisie: string): string | null {
  const lien = saisie.trim();
  if (!lien || lien.length > 500 || /[\s<>"]/.test(lien)) return null;
  if (lien.startsWith('/')) return lien.startsWith('//') ? null : lien;
  if (/^(mailto:|tel:)[^\s]+$/i.test(lien)) return lien;
  const complet = /^[a-z][a-z0-9+.-]*:/i.test(lien) ? lien : `https://${lien}`;
  try {
    const url = new URL(complet);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch { return null; }
}

// Vidéo en lien : YouTube, Vimeo ou Google Drive, lue dans la page par leur lecteur intégré
export function lienVideo(saisie: string): { plateforme: 'youtube' | 'vimeo' | 'drive'; integration: string } | null {
  let url: URL;
  try { const lien = saisie.trim(); url = new URL(/^https?:\/\//i.test(lien) ? lien : `https://${lien}`); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const hote = url.hostname.toLowerCase().replace(/^(www|m)\./, '');
  const morceaux = url.pathname.split('/').filter(Boolean);

  if (hote === 'youtu.be' || /^youtube(-nocookie)?\.com$/.test(hote)) {
    const id = hote === 'youtu.be' ? morceaux[0]
      : morceaux[0] === 'watch' ? url.searchParams.get('v')
      : ['embed', 'shorts', 'live', 'v'].includes(morceaux[0] ?? '') ? morceaux[1] : null;
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return { plateforme: 'youtube', integration: `https://www.youtube-nocookie.com/embed/${id}?rel=0` };
  }
  if (hote === 'vimeo.com' || hote === 'player.vimeo.com') {
    const i = morceaux.findIndex(m => /^\d{6,12}$/.test(m));
    if (i < 0) return null;
    const cle = url.searchParams.get('h') ?? morceaux[i + 1] ?? '';
    return { plateforme: 'vimeo', integration: `https://player.vimeo.com/video/${morceaux[i]}${/^[0-9a-f]{6,20}$/i.test(cle) ? `?h=${cle}` : ''}` };
  }
  if (hote === 'drive.google.com' || hote === 'docs.google.com') {
    const d = morceaux.indexOf('d');
    const id = morceaux[0] === 'file' && d > 0 ? morceaux[d + 1]
      : morceaux[0] === 'open' || morceaux[0] === 'uc' ? url.searchParams.get('id') : null;
    if (!id || !/^[A-Za-z0-9_-]{15,100}$/.test(id)) return null;
    const cle = url.searchParams.get('resourcekey') ?? '';
    return { plateforme: 'drive', integration: `https://drive.google.com/file/d/${id}/preview${/^[A-Za-z0-9_-]{1,60}$/.test(cle) ? `?resourcekey=${cle}` : ''}` };
  }
  return null;
}

const objet = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
// eslint-disable-next-line no-control-regex
const propre = (t: string) => t.replace(/[\u0000-\u0009\u000b-\u001f\u007f\u2028\u2029]/g, '');
const alignementDe = (v: unknown): Alignement | undefined => (v === 'centre' || v === 'droite' ? v : undefined);
function couleurDe(v: unknown) {
  if (typeof v !== 'string') return undefined;
  const c = v.toLowerCase();
  return COULEUR.test(c) ? c : undefined;
}
const memesMarques = (a: Passage, b: Passage) => a.g === b.g && a.i === b.i && a.s === b.s && a.lien === b.lien && a.couleur === b.couleur && a.taille === b.taille;

function lirePassages(valeur: unknown, budget: { reste: number }): Passage[] | null {
  if (!Array.isArray(valeur)) return null;
  const passages: Passage[] = [];
  for (const brut of valeur) {
    const p = objet(brut);
    if (!p || typeof p.t !== 'string') return null;
    const t = propre(p.t).slice(0, Math.max(0, budget.reste));
    budget.reste -= t.length;
    if (!t) continue;
    const passage: Passage = { t };
    if (p.g === true) passage.g = true;
    if (p.i === true) passage.i = true;
    if (p.s === true) passage.s = true;
    if (typeof p.lien === 'string') { const lien = lienSur(p.lien); if (lien) passage.lien = lien; }
    const couleur = couleurDe(p.couleur);
    if (couleur) passage.couleur = couleur;
    if (p.taille === 'petit' || p.taille === 'grand' || p.taille === 'tres-grand') passage.taille = p.taille;
    const dernier = passages[passages.length - 1];
    if (dernier && memesMarques(dernier, passage)) dernier.t += t; else passages.push(passage);
  }
  return passages;
}

const aDuTexte = (passages: Passage[]) => passages.some(p => p.t.trim());

function lireLignes(valeur: unknown): Ligne[] | null {
  if (!Array.isArray(valeur)) return null;
  const budget = { reste: PLAFOND_TEXTE };
  const lignes: Ligne[] = [];
  for (const brut of valeur) {
    const l = objet(brut);
    if (!l) return null;
    if (l.genre === 'p') {
      const passages = lirePassages(l.passages, budget);
      if (!passages) return null;
      const alignement = alignementDe(l.alignement);
      lignes.push({ genre: 'p', passages, ...(alignement ? { alignement } : {}) });
    } else if (l.genre === 'ul' || l.genre === 'ol') {
      if (!Array.isArray(l.items)) return null;
      const items: Passage[][] = [];
      for (const item of l.items) {
        const passages = lirePassages(item, budget);
        if (!passages) return null;
        if (aDuTexte(passages)) items.push(passages);
      }
      if (items.length) lignes.push({ genre: l.genre, items });
    } else return null;
  }
  const vide = (l: Ligne) => l.genre === 'p' && !aDuTexte(l.passages);
  while (lignes.length && vide(lignes[0])) lignes.shift();
  while (lignes.length && vide(lignes[lignes.length - 1])) lignes.pop();
  return lignes;
}

// Relecture stricte d'un contenu reçu : tout ce qui n'est pas reconnu est refusé, les blocs vides sont écartés
export function lireBlocs(valeur: unknown): { blocs: Bloc[]; erreur?: undefined } | { erreur: string } {
  const illisible = { erreur: 'Le contenu de la page est illisible.' };
  if (!Array.isArray(valeur)) return illisible;
  if (valeur.length > PLAFOND_BLOCS) return { erreur: `Une page compte ${PLAFOND_BLOCS} blocs au plus.` };
  const blocs: Bloc[] = [];
  for (const brut of valeur) {
    const b = objet(brut);
    if (!b) return illisible;
    if (b.type === 'titre') {
      if (typeof b.texte !== 'string') return illisible;
      const texte = propre(b.texte).replace(/\s+/g, ' ').trim().slice(0, 200);
      if (!texte) continue;
      const alignement = alignementDe(b.alignement), couleur = couleurDe(b.couleur);
      blocs.push({ type: 'titre', texte, niveau: b.niveau === 3 ? 3 : 2, ...(alignement ? { alignement } : {}), ...(couleur ? { couleur } : {}) });
    } else if (b.type === 'texte') {
      const lignes = lireLignes(b.lignes);
      if (!lignes) return illisible;
      if (lignes.length) blocs.push({ type: 'texte', lignes });
    } else if (b.type === 'photo') {
      const media = idMedia(b.media);
      if (!media) continue;
      const legende = typeof b.legende === 'string' ? propre(b.legende).replace(/\s+/g, ' ').trim().slice(0, 300) : '';
      blocs.push({ type: 'photo', media, ...(legende ? { legende } : {}) });
    } else if (b.type === 'video') {
      if (b.source === 'lien') {
        if (typeof b.url !== 'string') return illisible;
        const url = b.url.trim().slice(0, 500);
        if (!url) continue;
        if (!lienVideo(url)) return { erreur: 'Lien de vidéo non reconnu : collez l’adresse d’une vidéo YouTube, Vimeo ou Google Drive.' };
        blocs.push({ type: 'video', source: 'lien', url });
      } else if (b.source === 'fichier') {
        const media = idMedia(b.media);
        if (!media) continue;
        blocs.push({ type: 'video', source: 'fichier', media });
      } else return illisible;
    } else return illisible;
  }
  return { blocs };
}

export function blocsEnregistres(contenu: unknown): Bloc[] {
  const lecture = lireBlocs(contenu);
  return lecture.erreur === undefined ? lecture.blocs : [];
}

export const mediasDesBlocs = (blocs: Bloc[]) =>
  blocs.flatMap(b => (b.type === 'photo' || (b.type === 'video' && b.source === 'fichier') ? [b.media] : []));

export const premierePhoto = (blocs: Bloc[]) => blocs.find((b): b is BlocPhoto => b.type === 'photo')?.media ?? null;

// Étiquette de taille d'une page : « 3 min de lecture · 2 vidéos »
export function etiquettePage(blocs: Bloc[]): string {
  let mots = 0, photos = 0, videos = 0;
  const compter = (t: string) => t.split(/\s+/).filter(Boolean).length;
  for (const b of blocs) {
    if (b.type === 'titre') mots += compter(b.texte);
    else if (b.type === 'photo') photos++;
    else if (b.type === 'video') videos++;
    else for (const l of b.lignes) for (const p of l.genre === 'p' ? l.passages : l.items.flat()) mots += compter(p.t);
  }
  const parties: string[] = [];
  if (mots >= 40) parties.push(`${Math.max(1, Math.round(mots / 200))} min de lecture`);
  if (videos) parties.push(`${videos} vidéo${videos > 1 ? 's' : ''}`);
  if (photos && parties.length < 2) parties.push(`${photos} photo${photos > 1 ? 's' : ''}`);
  return parties.join(' · ') || 'Page';
}
