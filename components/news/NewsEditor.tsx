'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Person } from '@/lib/chat';
import { size } from '@/lib/chat';
import { fromStored, isVideo, mediaUrl, news, toStored, type News } from '@/lib/news-client';
import Icon from '../Icon';
import ModalBackdrop from '../ModalBackdrop';
import MentionInput from './MentionInput';

const CATEGORIES = ['Vie de la chambre', 'Programmation', 'Opportunités'];
const MAX = 25 * 1024 * 1024;
const today = () => new Date().toISOString().slice(0, 10);

// Création ou modification d'une actualité : texte avec mentions, mots-clés, plusieurs photos et vidéos
export default function NewsEditor({ n, onClose, onSaved }: { n: News | null; onClose: () => void; onSaved: (id: number) => void }) {
  const start = useMemo(() => fromStored(n?.contenu ?? ''), [n]);
  const [titre, setTitre] = useState(n?.titre ?? '');
  const [categorie, setCategorie] = useState(n?.categorie ?? CATEGORIES[0]);
  const [date, setDate] = useState(n?.date_pub?.slice(0, 10) ?? today());
  const [publie, setPublie] = useState(n?.publie ?? true);
  const [text, setText] = useState(start.text);
  const [mentions, setMentions] = useState<Person[]>(start.mentions);
  const [tags, setTags] = useState<string[]>(n?.tags ?? []);
  const [tagDraft, setTagDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [removed, setRemoved] = useState<number[]>([]);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // Aperçus des nouveaux fichiers (adresses locales libérées à la fermeture)
  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(u => URL.revokeObjectURL(u)), [previews]);

  function add(list: FileList | File[]) {
    const ok = [...list].filter(f => /^(image|video)\//.test(f.type));
    const big = ok.find(f => f.size > MAX);
    if (big) setError(`« ${big.name} » dépasse 25 Mo.`);
    else if (ok.length < [...list].length) setError('Seules les photos et les vidéos sont acceptées.');
    else setError('');
    setFiles(f => [...f, ...ok.filter(x => x.size <= MAX)]);
  }
  function addTag(v: string) {
    const t = v.trim().replace(/^#+/, '').replace(/\s+/g, '-');
    if (t && /^[\p{L}\d_-]{1,40}$/u.test(t) && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData();
    f.set('titre', titre);
    f.set('categorie', categorie);
    f.set('date_pub', date);
    f.set('publie', String(publie));
    f.set('contenu', toStored(text, mentions));
    f.set('tags', JSON.stringify(tagDraft.trim() ? [...tags, tagDraft] : tags));
    f.set('remove', JSON.stringify(removed));
    files.forEach(x => f.append('files', x));
    try { const r = await news.save(n?.id ?? null, f); onSaved(r.id); }
    catch (err) { setError((err as Error).message); setBusy(false); }
  }

  const existing = (n?.medias ?? []).filter(m => !removed.includes(m.id));
  return (
    <ModalBackdrop onClose={onClose}>
      <form className="modal news-editor" onSubmit={submit}>
        <div className="modal-h"><div><h2>{n ? 'Modifier l’actualité' : 'Nouvelle actualité'}</h2></div><button type="button" className="btn sm ghost" onClick={onClose} aria-label="Fermer">✕</button></div>
        <div className="modal-b">
          {error && <div className="err">{error}</div>}
          <div className="field"><label htmlFor="ne-titre">Titre *</label><input id="ne-titre" className="inp" required maxLength={200} value={titre} onChange={e => setTitre(e.target.value)} autoFocus={!n} /></div>
          <div className="form-grid">
            <div className="field"><label htmlFor="ne-cat">Catégorie</label>
              <select id="ne-cat" className="inp" value={categorie} onChange={e => setCategorie(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div className="field"><label htmlFor="ne-date">Date</label><input id="ne-date" type="date" className="inp" value={date} onChange={e => setDate(e.target.value)} /></div>
          </div>
          <div className="field">
            <label htmlFor="ne-texte">Texte</label>
            <MentionInput value={text} onChange={setText} mentions={mentions} onMentions={setMentions} rows={6} label="Texte de l’actualité"
              placeholder="Quoi de neuf à la Chambre ? Tapez @ pour mentionner un collègue ou un membre, # pour un mot-clé." />
          </div>
          <div className="field">
            <label htmlFor="ne-tag">Mots-clés</label>
            <div className="tag-input">
              {tags.map(t => <span key={t} className="hashtag on">#{t}<button type="button" aria-label={`Retirer ${t}`} onClick={() => setTags(tags.filter(x => x !== t))}>×</button></span>)}
              <input id="ne-tag" value={tagDraft} placeholder={tags.length ? '' : 'MECC9, Export, Tourisme…'} onChange={e => setTagDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagDraft); } if (e.key === 'Backspace' && !tagDraft) setTags(tags.slice(0, -1)); }}
                onBlur={() => tagDraft && addTag(tagDraft)} />
            </div>
            <span className="hint">Entrée ou virgule pour ajouter. Un clic sur un mot-clé filtre les actualités.</span>
          </div>
          <div className="field">
            <label>Photos et vidéos</label>
            <div className={`media-drop${drag ? ' over' : ''}`} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}>
              <div className="media-thumbs">
                {existing.map(m => (
                  <span key={m.id} className="media-thumb">
                    {isVideo(m.type) ? <video src={mediaUrl(m.id) + '#t=0.5'} preload="metadata" muted /> : <img src={mediaUrl(m.id)} alt="" />}
                    <button type="button" aria-label={`Retirer ${m.nom}`} onClick={() => setRemoved([...removed, m.id])}>×</button>
                  </span>
                ))}
                {files.map((f, i) => (
                  <span key={i} className="media-thumb new" title={`${f.name} · ${size(f.size)}`}>
                    {isVideo(f.type) ? <video src={previews[i]} muted /> : <img src={previews[i]} alt="" />}
                    <button type="button" aria-label={`Retirer ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}>×</button>
                  </span>
                ))}
                <button type="button" className="media-add" onClick={() => input.current?.click()}><Icon name="image" size={22} /><span>Ajouter</span></button>
              </div>
              <span className="hint">Glissez des photos ou des vidéos ici, ou cliquez sur Ajouter. 25 Mo au plus par fichier.</span>
              <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={e => { if (e.target.files) add(e.target.files); e.target.value = ''; }} />
            </div>
          </div>
          <label className="row" style={{ gap: 10 }}><input type="checkbox" className="switch" checked={publie} onChange={e => setPublie(e.target.checked)} />Publiée (sinon reste en brouillon)</label>
        </div>
        <div className="modal-f">
          <button type="button" className="btn" onClick={onClose}>Annuler</button>
          <button className="btn cta" disabled={busy}>{busy ? 'Envoi…' : n ? 'Enregistrer' : publie ? 'Publier' : 'Enregistrer le brouillon'}</button>
        </div>
      </form>
    </ModalBackdrop>
  );
}
