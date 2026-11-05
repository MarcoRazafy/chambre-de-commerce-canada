'use client';
import { useMemo, useState } from 'react';
import { api, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import { CATS, FMTS, FMT_ICON, MAX_FICHIER_MO, mediaUrl } from '@/lib/bibliotheque';
import Icon from '../Icon';
import { ChampImage, ChoixDossier, arbo, envoyer, formatDe, imageDeVideo, useApercus, type Media } from './outils';

const ACCEPT = 'application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp';
const sansExtension = (n: string) => n.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_-]+/g, ' ').trim();

// Ressource fichier : PDF, DOCX, vidéo ou photo, lue par le lecteur du navigateur.
// La couverture se tire de la vidéo, la photo sert de couverture d'elle-même, le PDF et le DOCX en reçoivent une à la main.
export default function RessourceFichier({ ressource, dossiers, dossierParDefaut, onSaved, onCancel }: {
  ressource?: Row; dossiers: Row[]; dossierParDefaut: number | null; onSaved: (id: number) => void; onCancel: () => void;
}) {
  const [fichier, setFichier] = useState<Media | null>(null);
  const [local, setLocal] = useState<{ nom: string; apercu: string; fmt: string } | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [titre, setTitre] = useState<string>(ressource?.titre ?? '');
  const [cat, setCat] = useState<string>(ressource?.cat ?? 'guide');
  const [payant, setPayant] = useState(ressource?.type === 'payant');
  const [prix, setPrix] = useState<string>(ressource?.prix ? String(ressource.prix) : '50000');
  const [dossier, setDossier] = useState<number | null>(ressource ? ressource.dossier_id : dossierParDefaut);
  const [description, setDescription] = useState<string>(ressource?.description ?? '');
  const [cover, setCover] = useState<number | null>(ressource?.cover ?? null);
  const [capture, setCapture] = useState(false);
  const [survol, setSurvol] = useState(false);
  const [erreur, setErreur] = useState('');
  const [busy, setBusy] = useState(false);
  const apercu = useApercus();
  const noeuds = useMemo(() => arbo(dossiers), [dossiers]);

  const fmt = ressource?.fmt ?? local?.fmt ?? null;
  const present = fichier ?? (ressource?.fichier ? { nom: ressource.fichier_nom, libelle: ressource.taille } : null);

  async function choisir(f: File) {
    const nf = formatDe(f.type);
    if (!nf) return setErreur(`« ${f.name} » : déposez un PDF, un document Word / Excel / PowerPoint, une vidéo MP4 / WebM / MOV ou une photo JPEG / PNG / WebP.`);
    if (ressource && nf !== ressource.fmt) return setErreur(`Cette ressource est au format ${FMTS[ressource.fmt]} : déposez un fichier du même format, ou créez une nouvelle ressource.`);
    setErreur(''); setFichier(null); setLocal({ nom: f.name, apercu: apercu(f), fmt: nf }); setPct(0);
    if (!titre.trim()) setTitre(sansExtension(f.name));
    // Couverture tirée de la vidéo pendant l'envoi
    if (nf === 'video' && !cover) {
      setCapture(true);
      imageDeVideo(f).then(img => envoyer(img)).then(m => setCover(c => c ?? m.id)).catch(() => {}).finally(() => setCapture(false));
    }
    try { setFichier(await envoyer(f, setPct)); } catch (e) { setErreur((e as Error).message); setLocal(null); } finally { setPct(null); }
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (!fmt || (!present && !ressource)) return setErreur('Déposez d’abord le fichier de la ressource.');
    setErreur(''); setBusy(true);
    try {
      const body = { titre, cat, fmt, type: payant ? 'payant' : 'gratuit', prix: Number(prix), dossier_id: dossier, description, cover, fichier: fichier?.id ?? ressource?.fichier ?? null };
      const r = ressource ? await api<Row>(`/api/ressources/${ressource.id}`, 'PATCH', body) : await api<Row>('/api/ressources', 'POST', body);
      toast(ressource ? 'Ressource enregistrée.' : 'Ressource ajoutée à la bibliothèque.');
      onSaved(r.id);
    } catch (err) { setErreur((err as Error).message); setBusy(false); }
  }

  const vue = local?.apercu ?? mediaUrl(ressource?.fichier);
  return (
    <form className="rf" onSubmit={enregistrer}>
      <section className="card rf-file">
        <h2>Fichier</h2>
        {present || local ? (
          <div className="rf-current">
            <span className="tile-ic"><Icon name={FMT_ICON[fmt ?? 'pdf']} size={18} fill /></span>
            <div className="grow"><b>{local?.nom ?? present?.nom ?? 'Fichier'}</b>
              <span className="small muted">{FMTS[fmt ?? 'pdf']}{fichier ? ` · ${fichier.libelle}` : present?.libelle ? ` · ${present.libelle}` : ''}</span>
              {pct !== null && <span className="ep-up"><span>Envoi… {pct} %</span><span className="ep-bar"><span style={{ width: `${pct}%` }} /></span></span>}</div>
            <label className="btn sm"><Icon name="upload" size={14} /> Remplacer
              <input type="file" hidden accept={ACCEPT} onChange={e => { const f = e.target.files?.[0]; if (f) choisir(f); e.target.value = ''; }} /></label>
          </div>
        ) : (
          <label className={`ep-drop rf-drop${survol ? ' on' : ''}`} onDragOver={e => { e.preventDefault(); setSurvol(true); }} onDragLeave={() => setSurvol(false)}
            onDrop={e => { e.preventDefault(); setSurvol(false); const f = e.dataTransfer.files[0]; if (f) choisir(f); }}>
            <Icon name="upload" size={28} />
            <b>{ressource ? 'Fichier manquant : déposez-le ici' : 'Déposez le fichier ici, ou cliquez pour le choisir'}</b>
            <span>PDF, DOCX (et autres documents Office), vidéo MP4 / WebM / MOV, photo JPEG / PNG / WebP · {MAX_FICHIER_MO} Mo au plus</span>
            <input type="file" hidden accept={ACCEPT} onChange={e => { const f = e.target.files?.[0]; if (f) choisir(f); e.target.value = ''; }} />
          </label>
        )}
        {vue && fmt === 'video' && <div className="pr-video rf-preview"><video src={vue} controls preload="metadata" /></div>}
        {vue && fmt === 'image' && <img className="rf-preview rf-img" src={vue} alt="" />}
      </section>

      <section className="card">
        <h2>Présentation</h2>
        {erreur && <div className="err" role="alert">{erreur}</div>}
        <div className="field"><label htmlFor="rf-t">Titre *</label><input id="rf-t" className="inp" required maxLength={200} value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex. Guide de l’export vers le Canada" /></div>
        <div className="form-grid">
          <div className="field"><label htmlFor="rf-c">Catégorie</label>
            <select id="rf-c" className="inp" value={cat} onChange={e => setCat(e.target.value)}>{Object.entries(CATS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label htmlFor="rf-d">Dossier</label><ChoixDossier id="rf-d" dossiers={noeuds} valeur={dossier} onChange={setDossier} /></div>
          <div className="field"><label htmlFor="rf-a">Accès</label>
            <select id="rf-a" className="inp" value={payant ? 'payant' : 'gratuit'} onChange={e => setPayant(e.target.value === 'payant')}>
              <option value="gratuit">Gratuit, inclus dans l’adhésion</option><option value="payant">Payant</option></select></div>
          {payant && <div className="field"><label htmlFor="rf-p">Prix (Ariary)</label><input id="rf-p" className="inp" type="number" min={1} step={500} required value={prix} onChange={e => setPrix(e.target.value)} /></div>}
        </div>
        <div className="field"><label htmlFor="rf-desc">Description</label>
          <textarea id="rf-desc" className="inp" rows={4} maxLength={600} value={description} onChange={e => setDescription(e.target.value)} placeholder="Ce que le document contient, pour qui, à quoi il sert." />
          <span className="hint">{description.length}/600</span></div>
        {fmt === 'image' && !cover
          ? <p className="small muted"><Icon name="image" size={14} /> La photo sert de couverture. Vous pouvez en choisir une autre ci-dessous.</p> : null}
        <ChampImage libelle="Couverture" valeur={cover} onChange={setCover}
          aide={capture ? 'Image tirée de la vidéo…' : fmt === 'video' ? 'Tirée automatiquement de la vidéo ; remplacez-la si besoin.' : fmt === 'image' ? 'Facultatif.' : 'Conseillée pour un PDF ou un DOCX : la carte l’affiche.'} />
        {payant && <p className="small muted"><Icon name="lock" size={14} /> Les entreprises qui ont accès à cette ressource payante se choisissent depuis la bibliothèque ou sa fiche.</p>}
      </section>

      <div className="rf-foot">
        <button type="button" className="btn" onClick={onCancel}>Annuler</button>
        <button className="btn cta" disabled={busy || pct !== null}>{busy ? 'Enregistrement…' : ressource ? 'Enregistrer' : 'Ajouter à la bibliothèque'}</button>
      </div>
    </form>
  );
}
