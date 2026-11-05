'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Row } from '@/lib/format';
import { MAX_FICHIER_MO, mediaUrl } from '@/lib/bibliotheque';
import Icon from '../Icon';

export type Media = { id: number; nom: string; type: string; taille: number; fmt: string; libelle: string };

// Envoi d'un fichier de la bibliothèque, avec la progression (les vidéos peuvent peser 100 Mo)
export function envoyer(file: File, onProgress?: (pct: number) => void): Promise<Media> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FICHIER_MO * 1024 * 1024) return reject(new Error(`« ${file.name} » dépasse ${MAX_FICHIER_MO} Mo.`));
    const x = new XMLHttpRequest();
    x.open('POST', '/api/ressources/medias');
    x.upload.onprogress = e => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    x.onload = () => {
      let b: Row = {};
      try { b = JSON.parse(x.responseText); } catch { /* réponse vide */ }
      if (x.status >= 200 && x.status < 300) resolve(b as Media); else reject(new Error(b.error || `Envoi refusé (${x.status})`));
    };
    x.onerror = () => reject(new Error('L’envoi s’est interrompu. Vérifiez la connexion et réessayez.'));
    const f = new FormData();
    f.set('file', file);
    x.send(f);
  });
}

// Format d'une ressource d'après le fichier choisi (même règle que le serveur)
export function formatDe(type: string): string | null {
  if (type === 'application/pdf') return 'pdf';
  if (/^application\/(msword|vnd\.openxmlformats-officedocument\.|vnd\.ms-(excel|powerpoint)|vnd\.oasis\.opendocument\.|rtf)/.test(type)) return 'docx';
  if (/^video\/(mp4|webm|quicktime)$/.test(type)) return 'video';
  if (/^image\/(png|jpe?g|gif|webp|avif)$/.test(type)) return 'image';
  return null;
}

// Image tirée d'une vidéo (10 %, 25 % ou 50 % de la durée, la première qui n'est pas unie) pour servir de couverture
export function imageDeVideo(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    const moments = [0.1, 0.25, 0.5];
    let essai = 0;
    const toile = document.createElement('canvas');
    const fin = (e?: Error, f?: File) => { v.removeAttribute('src'); URL.revokeObjectURL(url); if (f) resolve(f); else reject(e); };
    v.onloadedmetadata = () => {
      const k = Math.min(1, 1280 / (v.videoWidth || 1280));
      toile.width = Math.round((v.videoWidth || 1280) * k); toile.height = Math.round((v.videoHeight || 720) * k);
      v.currentTime = (v.duration || 1) * moments[0];
    };
    v.onseeked = () => {
      const c = toile.getContext('2d', { willReadFrequently: true });
      if (!c) return fin(new Error('Capture impossible'));
      c.drawImage(v, 0, 0, toile.width, toile.height);
      if (unie(c, toile) && ++essai < moments.length) { v.currentTime = (v.duration || 1) * moments[essai]; return; }
      toile.toBlob(b => (b ? fin(undefined, new File([b], 'couverture.jpg', { type: 'image/jpeg' })) : fin(new Error('Capture impossible'))), 'image/jpeg', 0.82);
    };
    v.onerror = () => fin(new Error('Vidéo illisible par le navigateur'));
  });
}
function unie(c: CanvasRenderingContext2D, t: HTMLCanvasElement) {
  const { data } = c.getImageData(0, 0, t.width, t.height);
  let min = 255, max = 0;
  for (let i = 0; i < data.length; i += 4 * 97) { const l = (data[i] + data[i + 1] + data[i + 2]) / 3; if (l < min) min = l; if (l > max) max = l; }
  return max - min < 18;
}

/* ===== Arborescence des dossiers ===== */
export type Noeud = Row & { profondeur: number };
// Dossiers dans l'ordre de l'arbre, chacun avec son niveau (0 à la racine)
export function arbo(dossiers: Row[]): Noeud[] {
  const out: Noeud[] = [];
  const parcourir = (parent: number | null, n: number) => dossiers.filter(d => d.parent_id === parent)
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).forEach(d => { out.push({ ...d, profondeur: n }); parcourir(d.id, n + 1); });
  parcourir(null, 0);
  return out;
}
export function chemin(dossiers: Row[], id: number | null): Row[] {
  const out: Row[] = [];
  for (let d = dossiers.find(x => x.id === id), n = 0; d && n < 20; d = dossiers.find(x => x.id === d!.parent_id), n++) out.unshift(d);
  return out;
}
export const descendants = (dossiers: Row[], id: number): number[] => dossiers.filter(d => d.parent_id === id).flatMap(d => [d.id, ...descendants(dossiers, d.id)]);
export const hauteur = (dossiers: Row[], id: number): number => Math.max(0, ...dossiers.filter(d => d.parent_id === id).map(d => 1 + hauteur(dossiers, d.id)));

// Liste déroulante des dossiers, indentée selon l'arbre
export function ChoixDossier({ id, dossiers, valeur, onChange, exclure = [], racine = 'Racine de la bibliothèque', desactive }: {
  id: string; dossiers: Noeud[]; valeur: number | null; onChange: (v: number | null) => void; exclure?: number[]; racine?: string; desactive?: (d: Noeud) => boolean;
}) {
  return (
    <select id={id} className="inp" value={valeur ?? ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">{racine}</option>
      {dossiers.filter(d => !exclure.includes(d.id)).map(d => (
        <option key={d.id} value={d.id} disabled={desactive?.(d)}>{`${'   '.repeat(d.profondeur)}${d.profondeur ? '└ ' : ''}${d.nom}${d.restreint ? ' · accès réservé' : ''}`}</option>
      ))}
    </select>
  );
}

/* ===== Champ image (couverture, portrait) : envoyée tout de suite, gardée par son numéro ===== */
export function ChampImage({ libelle, aide, valeur, onChange, rond, apercuAuto }: {
  libelle: string; aide?: string; valeur: number | null; onChange: (id: number | null) => void; rond?: boolean; apercuAuto?: string | null;
}) {
  const [pct, setPct] = useState<number | null>(null);
  const [erreur, setErreur] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const vue = mediaUrl(valeur) ?? apercuAuto ?? null;
  async function choisir(f: File) {
    setErreur(''); setPct(0);
    try { onChange((await envoyer(f, setPct)).id); } catch (e) { setErreur((e as Error).message); } finally { setPct(null); }
  }
  return (
    <div className="field">
      <label>{libelle}</label>
      <div className={`ci${rond ? ' rond' : ''}`}>
        <button type="button" className="ci-vue" onClick={() => input.current?.click()} aria-label={vue ? `Remplacer : ${libelle}` : `Choisir : ${libelle}`}>
          {vue ? <img src={vue} alt="" /> : <span><Icon name="image" size={rond ? 20 : 22} />{!rond && 'Aucune image'}</span>}
          {pct !== null && <span className="ci-pct">{pct} %</span>}
        </button>
        <div className="ci-act">
          <button type="button" className="btn sm" disabled={pct !== null} onClick={() => input.current?.click()}><Icon name="upload" size={14} /> {valeur ? 'Remplacer' : 'Choisir une image'}</button>
          {valeur && <button type="button" className="btn sm ghost" onClick={() => onChange(null)}>Retirer</button>}
          {aide && <span className="hint">{aide}</span>}
          {erreur && <span className="hint err-t">{erreur}</span>}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { const f = e.target.files?.[0]; if (f) choisir(f); e.target.value = ''; }} />
      </div>
    </div>
  );
}

/* ===== Choix d'entreprises (accès réservé d'un dossier, accès à une ressource payante) ===== */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function ChoixEntreprises({ membres, choisis, onChange, exclure = [], hauteurMax = 260 }: {
  membres: Row[]; choisis: number[]; onChange: (ids: number[]) => void; exclure?: number[]; hauteurMax?: number;
}) {
  const [term, setTerm] = useState('');
  // Les entreprises déjà cochées à l'ouverture passent en tête (l'ordre ne bouge plus ensuite)
  const [deja] = useState(() => new Set(choisis));
  const liste = useMemo(() => membres.filter(m => !exclure.includes(m.id) && (!term || fold(m.nom).includes(fold(term))))
    .sort((x, y) => Number(deja.has(y.id)) - Number(deja.has(x.id))), [membres, exclure, term, deja]);
  const basculer = (id: number) => onChange(choisis.includes(id) ? choisis.filter(x => x !== id) : [...choisis, id]);
  return (
    <div className="ce">
      <label className="search-inp ce-search"><Icon name="search" size={15} />
        <input className="inp" type="search" placeholder="Chercher une entreprise…" aria-label="Chercher une entreprise" value={term} onChange={e => setTerm(e.target.value)} /></label>
      <div className="ce-list" style={{ maxHeight: hauteurMax }}>
        {liste.length ? liste.map(m => (
          <label key={m.id} className="ce-row">
            <input type="checkbox" checked={choisis.includes(m.id)} onChange={() => basculer(m.id)} />
            <span className="grow">{m.nom}</span>
            {m.statut !== 'a_jour' && <span className="hint">cotisation {m.statut === 'retard' ? 'en retard' : 'en attente'}</span>}
          </label>
        )) : <p className="small muted ce-empty">{term ? 'Aucune entreprise ne correspond.' : 'Toutes les entreprises sont déjà dans la liste.'}</p>}
      </div>
      <div className="row between small">
        <span className="muted">{choisis.length} entreprise{choisis.length > 1 ? 's' : ''} choisie{choisis.length > 1 ? 's' : ''}</span>
        {choisis.length > 0 && <button type="button" className="linkish" onClick={() => onChange([])}>Tout décocher</button>}
      </div>
    </div>
  );
}

// Libère les aperçus locaux (URL.createObjectURL) quand le composant disparaît
export function useApercus() {
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach(u => URL.revokeObjectURL(u)), []);
  return (f: File) => { const u = URL.createObjectURL(f); urls.current.push(u); return u; };
}
