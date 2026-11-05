'use client';
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type DragEvent } from 'react';
import { api, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import { PLAFOND_BLOCS, blocsEnregistres, lienVideo, type Alignement, type Bloc, type Ligne, type TypeBloc } from '@/lib/blocs';
import { CATS, mediaUrl } from '@/lib/bibliotheque';
import Icon from '../Icon';
import ChoixCouleur from './ChoixCouleur';
import TexteRiche from './TexteRiche';
import { PieceJointe, VideoEnLien } from './PageRessource';
import { ChampImage, ChoixDossier, arbo, envoyer, formatDe, useApercus } from './outils';

// Fichier d'un bloc photo / vidéo : numéro une fois envoyé, aperçu local et progression pendant l'envoi
type Envoi = { media: number | null; apercu?: string; pct?: number; erreur?: string; local?: File; nom?: string; taille?: string };
type ETitre = { cle: string; type: 'titre'; texte: string; niveau: 2 | 3; alignement?: Alignement; couleur?: string };
type ETexte = { cle: string; type: 'texte'; lignes: Ligne[] };
type EPhoto = { cle: string; type: 'photo'; legende: string } & Envoi;
type EVideo = { cle: string; type: 'video'; source: 'fichier' | 'lien'; url: string } & Envoi;
type EFichier = { cle: string; type: 'fichier' } & Envoi;
type Edite = ETitre | ETexte | EPhoto | EVideo | EFichier;

const CATALOGUE: { type: TypeBloc; nom: string; icone: string }[] = [
  { type: 'titre', nom: 'Titre', icone: 'heading' }, { type: 'texte', nom: 'Texte', icone: 'text' },
  { type: 'photo', nom: 'Photo', icone: 'image' }, { type: 'video', nom: 'Vidéo', icone: 'video' },
  { type: 'fichier', nom: 'Pièce jointe', icone: 'attach' },
];
const NOM = Object.fromEntries(CATALOGUE.map(c => [c.type, c.nom])) as Record<TypeBloc, string>;
const MARQUE = 'application/x-alliee-bloc';
const ALIGNEMENTS: { valeur: Alignement | undefined; nom: string; icone: string }[] = [
  { valeur: undefined, nom: 'Aligner à gauche', icone: 'alignleft' }, { valeur: 'centre', nom: 'Centrer', icone: 'aligncenter' }, { valeur: 'droite', nom: 'Aligner à droite', icone: 'alignright' },
];
const ALIGN_CSS: Record<Alignement, 'center' | 'right'> = { centre: 'center', droite: 'right' };

const versEdite = (b: Bloc, cle: string): Edite =>
  b.type === 'titre' || b.type === 'texte' ? { cle, ...b }
  : b.type === 'photo' ? { cle, type: 'photo', media: b.media, legende: b.legende ?? '' }
  : b.type === 'fichier' ? { cle, type: 'fichier', media: b.media, nom: b.nom, taille: b.taille }
  : b.source === 'lien' ? { cle, type: 'video', source: 'lien', media: null, url: b.url }
  : { cle, type: 'video', source: 'fichier', media: b.media, url: '' };
const neuf = (type: TypeBloc, cle: string): Edite =>
  type === 'titre' ? { cle, type, texte: '', niveau: 2 } : type === 'texte' ? { cle, type, lignes: [] }
  : type === 'photo' ? { cle, type, media: null, legende: '' } : type === 'fichier' ? { cle, type, media: null }
  : { cle, type: 'video', source: 'fichier', media: null, url: '' };
const estVide = (b: Edite) => b.type === 'titre' ? !b.texte.trim() : b.type === 'texte' ? !b.lignes.length : !b.local && !b.media && !(b.type === 'video' && b.url.trim());
const versBloc = (b: Edite) =>
  b.type === 'titre' ? { type: 'titre', texte: b.texte, niveau: b.niveau, alignement: b.alignement, couleur: b.couleur }
  : b.type === 'texte' ? { type: 'texte', lignes: b.lignes }
  : b.type === 'photo' ? { type: 'photo', media: b.media, legende: b.legende }
  : b.type === 'fichier' ? { type: 'fichier', media: b.media, nom: b.nom, taille: b.taille }
  : b.source === 'lien' ? { type: 'video', source: 'lien', url: b.url } : { type: 'video', source: 'fichier', media: b.media };

// Éditeur d'une ressource « Page », repris de CanCham Connect : colonne de réglages, feuille de blocs à composer
export default function EditeurPage({ ressource, dossiers, dossierParDefaut, onSaved, onCancel }: {
  ressource?: Row; dossiers: Row[]; dossierParDefaut: number | null; onSaved: (id: number) => void; onCancel: () => void;
}) {
  const [blocs, setBlocs] = useState<Edite[]>(() => blocsEnregistres(ressource?.contenu).map((b, i) => versEdite(b, `b${i}`)));
  const [titre, setTitre] = useState<string>(ressource?.titre ?? '');
  const [cat, setCat] = useState<string>(ressource?.cat ?? 'guide');
  const [payant, setPayant] = useState(ressource?.type === 'payant');
  const [prix, setPrix] = useState<string>(ressource?.prix ? String(ressource.prix) : '50000');
  const [dossier, setDossier] = useState<number | null>(ressource ? ressource.dossier_id : dossierParDefaut);
  const [description, setDescription] = useState<string>(ressource?.description ?? '');
  const [cover, setCover] = useState<number | null>(ressource?.cover ?? null);
  const [actif, setActif] = useState<string | null>(null);
  const [glisse, setGlisse] = useState<{ nouveau: TypeBloc } | { cle: string } | 'fichier' | null>(null);
  const [cible, setCible] = useState<number | null>(null);
  const [saisie, setSaisie] = useState<string | null>(null);
  const [erreur, setErreur] = useState('');
  const [modifie, setModifie] = useState(false);
  const [busy, setBusy] = useState(false);
  const compteur = useRef(0);
  const toile = useRef<HTMLDivElement>(null);
  const aMontrer = useRef<string | null>(null);
  const apercu = useApercus();
  const noeuds = useMemo(() => arbo(dossiers), [dossiers]);

  const enCours = blocs.some(b => 'local' in b && b.local && !b.media && !b.erreur);
  const echec = blocs.some(b => 'erreur' in b && b.erreur);
  const premiere = blocs.find((b): b is EPhoto => b.type === 'photo' && !!(b.media || b.apercu));

  const changer = (f: (a: Edite[]) => Edite[]) => { setBlocs(f); setModifie(true); };
  const modifier = (cle: string, p: Partial<Edite>) => changer(a => a.map(b => (b.cle === cle ? ({ ...b, ...p } as Edite) : b)));
  const majEnvoi = (cle: string, p: Partial<Envoi>) => setBlocs(a => a.map(b => (b.cle === cle ? ({ ...b, ...p } as Edite) : b)));

  // Envoi immédiat du fichier d'un bloc, avec reprise possible en cas d'échec
  function televerser(cle: string, f: File) {
    majEnvoi(cle, { local: f, apercu: apercu(f), pct: 0, erreur: undefined, media: null, nom: f.name });
    setModifie(true);
    envoyer(f, pct => majEnvoi(cle, { pct }))
      .then(m => majEnvoi(cle, { media: m.id, pct: undefined, taille: m.libelle }))
      .catch(e => majEnvoi(cle, { erreur: (e as Error).message, pct: undefined }));
  }

  function inserer(bloc: (cle: string) => Edite, rang: number, fichier?: File) {
    if (blocs.length >= PLAFOND_BLOCS) return setErreur(`Une page compte ${PLAFOND_BLOCS} blocs au plus.`);
    const cle = `n${compteur.current++}`;
    changer(a => [...a.slice(0, rang), bloc(cle), ...a.slice(rang)]);
    setActif(cle);
    aMontrer.current = cle;
    if (fichier) queueMicrotask(() => televerser(cle, fichier));
  }
  const deplacer = (cle: string, rang: number) => changer(a => {
    const de = a.findIndex(b => b.cle === cle);
    const vise = Math.max(0, Math.min(rang, a.length)), vers = vise > de ? vise - 1 : vise;
    if (de < 0 || vers === de) return a;
    const reste = a.filter(b => b.cle !== cle);
    return [...reste.slice(0, vers), a[de], ...reste.slice(vers)];
  });
  const retirer = (b: Edite) => { if (estVide(b) || confirm(`Retirer ce bloc « ${NOM[b.type]} » ?`)) changer(a => a.filter(x => x.cle !== b.cle)); };

  const finir = () => { setGlisse(null); setCible(null); setSaisie(null); };
  function viser(e: DragEvent) {
    const fichiers = e.dataTransfer.types.includes('Files');
    if (!glisse && !fichiers) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = glisse && typeof glisse === 'object' && 'cle' in glisse ? 'move' : 'copy';
    if (!glisse) setGlisse('fichier');
    const els = Array.from(toile.current?.querySelectorAll<HTMLElement>(':scope > [data-bloc]') ?? []);
    let rang = els.length;
    for (let i = 0; i < els.length; i++) { const r = els[i].getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { rang = i; break; } }
    if (rang !== cible) setCible(rang);
  }
  function deposer(e: DragEvent) {
    e.preventDefault();
    const rang = cible ?? blocs.length;
    if (glisse && typeof glisse === 'object') {
      if ('nouveau' in glisse) { const t = glisse.nouveau; inserer(cle => neuf(t, cle), rang); } else deplacer(glisse.cle, rang);
    } else {
      const refus: string[] = [];
      Array.from(e.dataTransfer.files).forEach((f, i) => {
        const fmt = formatDe(f.type);
        if (fmt === 'image') inserer(cle => neuf('photo', cle), rang + i, f);
        else if (fmt === 'video') inserer(cle => neuf('video', cle), rang + i, f);
        else if (fmt) inserer(cle => neuf('fichier', cle), rang + i, f);
        else refus.push(`« ${f.name} » : déposez une photo, une vidéo, un PDF ou un document Office.`);
      });
      if (refus.length) setErreur(refus.join(' '));
    }
    finir();
  }

  useEffect(() => {
    const retenir = (e: globalThis.DragEvent) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); };
    window.addEventListener('dragover', retenir); window.addEventListener('drop', retenir);
    return () => { window.removeEventListener('dragover', retenir); window.removeEventListener('drop', retenir); };
  }, []);
  useEffect(() => {
    if (!modifie || busy) return;
    const prevenir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', prevenir);
    return () => window.removeEventListener('beforeunload', prevenir);
  }, [modifie, busy]);
  useEffect(() => {
    const cle = aMontrer.current;
    if (!cle) return;
    aMontrer.current = null;
    const el = toile.current?.querySelector<HTMLElement>(`[data-bloc="${cle}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    el?.querySelector<HTMLElement>('textarea, [contenteditable], input[type=url]')?.focus({ preventScroll: true });
  }, [blocs]);

  async function enregistrer() {
    if (!titre.trim()) return setErreur('Donnez un titre à la ressource.');
    setErreur(''); setBusy(true);
    try {
      const body = { titre, cat, fmt: 'page', type: payant ? 'payant' : 'gratuit', prix: Number(prix), dossier_id: dossier, description, cover, contenu: blocs.map(versBloc) };
      const r = ressource ? await api<Row>(`/api/ressources/${ressource.id}`, 'PATCH', body) : await api<Row>('/api/ressources', 'POST', body);
      setModifie(false);
      toast(ressource ? 'Page enregistrée.' : 'Page publiée dans la bibliothèque.');
      onSaved(r.id);
    } catch (e) { setErreur((e as Error).message); setBusy(false); }
  }

  const tirage = glisse && typeof glisse === 'object' && 'cle' in glisse ? glisse.cle : null;

  return (
    <div className="ep">
      <aside className="ep-side">
        <section className="card ep-cover">
          <ChampImage libelle="Couverture" valeur={cover} onChange={v => { setCover(v); setModifie(true); }}
            apercuAuto={premiere ? premiere.apercu ?? mediaUrl(premiere.media) : null}
            aide={cover ? undefined : premiere ? 'La première photo de la page sert de couverture.' : 'Sans couverture, la première photo de la page en tient lieu.'} />
        </section>

        <section className="card">
          <h2 className="ep-h">Réglages</h2>
          <div className="field"><label htmlFor="ep-cat">Catégorie</label>
            <select id="ep-cat" className="inp" value={cat} onChange={e => { setCat(e.target.value); setModifie(true); }}>
              {Object.entries(CATS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label htmlFor="ep-type">Accès</label>
            <select id="ep-type" className="inp" value={payant ? 'payant' : 'gratuit'} onChange={e => { setPayant(e.target.value === 'payant'); setModifie(true); }}>
              <option value="gratuit">Inclus dans l’adhésion</option><option value="payant">Payant</option></select></div>
          {payant && <div className="field"><label htmlFor="ep-prix">Prix (Ariary)</label>
            <input id="ep-prix" className="inp" type="number" min={1} step={500} value={prix} onChange={e => { setPrix(e.target.value); setModifie(true); }} />
            <span className="hint">Les entreprises qui y ont accès se choisissent depuis la bibliothèque.</span></div>}
          <div className="field"><label htmlFor="ep-dos">Dossier</label>
            <ChoixDossier id="ep-dos" dossiers={noeuds} valeur={dossier} onChange={v => { setDossier(v); setModifie(true); }} />
            <span className="hint">Vide, elle reste à la racine de la bibliothèque.</span></div>
          <div className="field"><label htmlFor="ep-desc">Description</label>
            <textarea id="ep-desc" className="inp" rows={3} maxLength={600} value={description} onChange={e => { setDescription(e.target.value); setModifie(true); }} />
            <span className="hint">{description.length}/600 · la carte en montre les premières lignes.</span></div>
        </section>

        <section className="card ep-save">
          <button type="button" className="btn cta" disabled={busy || enCours} onClick={enregistrer}>
            <Icon name="ok" size={16} /> {busy ? 'Enregistrement…' : ressource ? 'Enregistrer la page' : 'Publier la page'}</button>
          <button type="button" className="btn ghost" onClick={() => (!modifie || confirm('Quitter sans enregistrer les changements ?')) && onCancel()}>Annuler</button>
          <p className={`small ep-state${echec ? ' bad' : ''}`}>{echec ? 'Un envoi a échoué : relancez-le dans son bloc.' : enCours ? 'Envoi des fichiers en cours…' : `${blocs.length} bloc${blocs.length > 1 ? 's' : ''} sur ${PLAFOND_BLOCS}`}</p>
        </section>
      </aside>

      <div className="ep-main">
        {erreur && <div className="err ep-err" role="alert">{erreur}</div>}
        <div className="ep-sheet">
          <ChampAuto value={titre} maxLength={200} placeholder="Titre de la ressource" aria-label="Titre de la ressource" className="ep-titre"
            onChange={e => { setTitre(e.target.value); setModifie(true); }} />

          <div ref={toile} className="ep-canvas" onDragOver={viser} onDrop={deposer}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) { setCible(null); if (glisse === 'fichier') setGlisse(null); } }}>
            {!blocs.length && (
              <div className={`ep-empty${glisse ? ' on' : ''}`}>
                <Icon name="plus" size={26} /><b>La page est vide</b>
                <span>Glissez ici un bloc de la colonne de gauche, ou une photo, une vidéo, un document depuis votre ordinateur.</span>
              </div>
            )}
            {blocs.map((b, i) => {
              const ici = actif === b.cle;
              return (
                <Fragment key={b.cle}>
                  <Repere visible={!!glisse && cible === i} />
                  <div data-bloc={b.cle} draggable={saisie === b.cle} className={`ep-bloc${ici ? ' on' : ''}${tirage === b.cle ? ' drag' : ''}`}
                    onDragStart={e => { if (saisie !== b.cle) return; setGlisse({ cle: b.cle }); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData(MARQUE, b.cle); }}
                    onDragEnd={finir} onMouseDownCapture={() => setActif(b.cle)} onFocusCapture={() => setActif(b.cle)}>
                    <div className="ep-tools">
                      <span role="button" tabIndex={0} className="ep-grip" title="Glisser pour déplacer"
                        aria-label={`Déplacer le bloc « ${NOM[b.type]} » : glissez, ou flèches haut et bas`}
                        onMouseDown={() => setSaisie(b.cle)} onMouseUp={() => setSaisie(null)}
                        onKeyDown={e => { const pas = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 2 : 0; if (pas) { e.preventDefault(); deplacer(b.cle, i + pas); } }}>
                        <Icon name="grip" size={15} /></span>
                      <span className="ep-kind">{NOM[b.type]}</span>
                      <Commande libelle="Monter le bloc" disabled={i === 0} onClick={() => deplacer(b.cle, i - 1)}><Icon name="arrowup" size={14} /></Commande>
                      <Commande libelle="Descendre le bloc" disabled={i === blocs.length - 1} onClick={() => deplacer(b.cle, i + 2)}><Icon name="arrowdown" size={14} /></Commande>
                      <Commande libelle="Retirer le bloc" danger onClick={() => retirer(b)}><Icon name="trash" size={14} /></Commande>
                    </div>
                    {b.type === 'titre' ? <BlocTitre bloc={b} actif={ici} onChange={p => modifier(b.cle, p)} />
                      : b.type === 'texte' ? <TexteRiche lignes={b.lignes} actif={ici} onChange={lignes => modifier(b.cle, { lignes })} />
                      : b.type === 'fichier' ? <BlocPieceJointe bloc={b} onFichier={f => televerser(b.cle, f)} onRefus={setErreur} />
                      : b.type === 'photo' ? <BlocPhoto bloc={b} onChange={p => modifier(b.cle, p)} onFichier={f => televerser(b.cle, f)} onRefus={setErreur} />
                      : <BlocVideo bloc={b} onChange={p => modifier(b.cle, p)} onFichier={f => televerser(b.cle, f)} onRefus={setErreur} />}
                  </div>
                </Fragment>
              );
            })}
            {blocs.length > 0 && <Repere visible={!!glisse && cible === blocs.length} />}
          </div>

          <div className="ep-add">
            {CATALOGUE.map(c => (
              <button key={c.type} type="button" draggable title="Cliquez pour l’ajouter à la fin, ou glissez-le dans la page" onClick={() => inserer(cle => neuf(c.type, cle), blocs.length)} onDragEnd={finir}
                onDragStart={e => { setGlisse({ nouveau: c.type }); e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData(MARQUE, c.type); }}>
                <Icon name={c.icone} size={14} /> {c.nom}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const Repere = ({ visible }: { visible: boolean }) => <div className="ep-mark" aria-hidden="true"><span className={visible ? 'on' : ''} /></div>;

function Commande({ libelle, danger, children, ...a }: { libelle: string; danger?: boolean } & ComponentProps<'button'>) {
  return <button type="button" title={libelle} aria-label={libelle} {...a} className={`ep-cmd${danger ? ' danger' : ''}`}>{children}</button>;
}

// Champ de titre qui grandit avec son texte, sans retour à la ligne
function ChampAuto({ className = '', ...a }: ComponentProps<'textarea'>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const ajuster = () => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } };
  useLayoutEffect(ajuster);
  return <textarea ref={ref} rows={1} {...a} className={`ep-auto ${className}`} onInput={e => { ajuster(); a.onInput?.(e); }} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} />;
}

function BlocTitre({ bloc, actif, onChange }: { bloc: ETitre; actif: boolean; onChange: (p: Partial<ETitre>) => void }) {
  return (
    <>
      {actif && (
        <div className="tr-bar">
          <div className="tr-tools">
            <button type="button" className={`tr-pill${bloc.niveau === 2 ? ' on' : ''}`} aria-pressed={bloc.niveau === 2} onClick={() => onChange({ niveau: 2 })}>Grand titre</button>
            <button type="button" className={`tr-pill${bloc.niveau === 3 ? ' on' : ''}`} aria-pressed={bloc.niveau === 3} onClick={() => onChange({ niveau: 3 })}>Sous-titre</button>
            <span className="tr-sep" aria-hidden="true" />
            {ALIGNEMENTS.map(a => (
              <button key={a.nom} type="button" title={a.nom} aria-label={a.nom} aria-pressed={bloc.alignement === a.valeur}
                className={`tr-btn${bloc.alignement === a.valeur ? ' on' : ''}`} onClick={() => onChange({ alignement: a.valeur })}><Icon name={a.icone} size={16} /></button>
            ))}
          </div>
          <div className="tr-sub"><ChoixCouleur libelle="Couleur du titre" actuelle={bloc.couleur ?? null} onChoisir={c => onChange({ couleur: c ?? undefined })} /></div>
        </div>
      )}
      <ChampAuto value={bloc.texte} maxLength={200} placeholder={bloc.niveau === 2 ? 'Titre' : 'Sous-titre'} aria-label={bloc.niveau === 2 ? 'Titre' : 'Sous-titre'}
        onChange={e => onChange({ texte: e.target.value })} className={bloc.niveau === 2 ? 'pr-h2' : 'pr-h3'}
        style={{ ...(bloc.couleur ? { color: bloc.couleur } : {}), ...(bloc.alignement ? { textAlign: ALIGN_CSS[bloc.alignement] } : {}) }} />
    </>
  );
}

function ZoneDepot({ accept, icone, invite, aide, onFichier }: { accept: string; icone: string; invite: string; aide: string; onFichier: (f: File) => void }) {
  const [survol, setSurvol] = useState(false);
  return (
    <label className={`ep-drop${survol ? ' on' : ''}`}
      onDragOver={e => { if (!e.dataTransfer.types.includes('Files')) return; e.preventDefault(); e.stopPropagation(); setSurvol(true); }}
      onDragLeave={() => setSurvol(false)}
      onDrop={e => { if (!e.dataTransfer.types.includes('Files')) return; e.preventDefault(); e.stopPropagation(); setSurvol(false); const f = e.dataTransfer.files[0]; if (f) onFichier(f); }}>
      <Icon name={icone} size={26} /><b>{invite}</b><span>{aide}</span>
      <input type="file" accept={accept} hidden onChange={e => { const f = e.target.files?.[0]; if (f) onFichier(f); e.target.value = ''; }} />
    </label>
  );
}

function Suivi({ b, onReessayer }: { b: Envoi; onReessayer: () => void }) {
  if (b.erreur) return <div className="ep-up bad" role="status"><Icon name="alert" size={15} /> {b.erreur}{b.local && <button type="button" className="btn sm" onClick={onReessayer}>Réessayer</button>}</div>;
  if (b.pct === undefined) return null;
  return <div className="ep-up" role="status" aria-live="polite"><span>Envoi… {b.pct} %</span><span className="ep-bar"><span style={{ width: `${b.pct}%` }} /></span></div>;
}

const Remplacer = ({ accept, libelle, onFichier }: { accept: string; libelle: string; onFichier: (f: File) => void }) => (
  <label className="btn sm ep-replace"><Icon name="upload" size={13} /> {libelle}
    <input type="file" accept={accept} hidden onChange={e => { const f = e.target.files?.[0]; if (f) onFichier(f); e.target.value = ''; }} /></label>
);

const PHOTOS = 'image/jpeg,image/png,image/webp';
const DOCUMENTS = 'application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf';

// Pièce jointe : un document que le lecteur ouvre ou télécharge depuis la page
function BlocPieceJointe({ bloc, onFichier, onRefus }: { bloc: EFichier; onFichier: (f: File) => void; onRefus: (m: string) => void }) {
  const choisir = (f: File) => (formatDe(f.type) === 'pdf' || formatDe(f.type) === 'docx' ? onFichier(f)
    : onRefus(`« ${f.name} » : une pièce jointe est un PDF ou un document Word, Excel, PowerPoint. Les photos et vidéos ont leur propre bloc.`));
  if (!bloc.media && !bloc.local) return <ZoneDepot accept={DOCUMENTS} icone="attach" invite="Choisir un document" aide="PDF, Word, Excel, PowerPoint, 100 Mo au plus. Ou glissez-le ici." onFichier={choisir} />;
  return (
    <>
      <PieceJointe url={bloc.apercu ?? mediaUrl(bloc.media)!} nom={bloc.nom} taille={bloc.taille ?? (bloc.pct !== undefined ? 'Envoi…' : undefined)}
        actions={<Remplacer accept={DOCUMENTS} libelle="Remplacer" onFichier={choisir} />} />
      <Suivi b={bloc} onReessayer={() => bloc.local && onFichier(bloc.local)} />
    </>
  );
}
const VIDEOS = 'video/mp4,video/webm,video/quicktime';

function BlocPhoto({ bloc, onChange, onFichier, onRefus }: { bloc: EPhoto; onChange: (p: Partial<EPhoto>) => void; onFichier: (f: File) => void; onRefus: (m: string) => void }) {
  const vue = bloc.apercu ?? mediaUrl(bloc.media);
  const choisir = (f: File) => (formatDe(f.type) === 'image' ? onFichier(f) : onRefus(`« ${f.name} » n’est pas une photo : JPEG, PNG ou WebP.`));
  if (!vue) return <ZoneDepot accept={PHOTOS} icone="image" invite="Choisir une photo" aide="JPEG, PNG ou WebP, 15 Mo au plus. Ou glissez-la ici." onFichier={choisir} />;
  return (
    <figure className="ep-photo">
      <div className="ep-photo-img"><img src={vue} alt="" draggable={false} /><Remplacer accept={PHOTOS} libelle="Remplacer" onFichier={choisir} /></div>
      <Suivi b={bloc} onReessayer={() => bloc.local && onFichier(bloc.local)} />
      <input className="ep-legend" value={bloc.legende} maxLength={300} placeholder="Légende (facultative)" aria-label="Légende de la photo" onChange={e => onChange({ legende: e.target.value })} />
    </figure>
  );
}

function BlocVideo({ bloc, onChange, onFichier, onRefus }: { bloc: EVideo; onChange: (p: Partial<EVideo>) => void; onFichier: (f: File) => void; onRefus: (m: string) => void }) {
  const vue = bloc.apercu ?? mediaUrl(bloc.media);
  const lien = bloc.url.trim(), video = lien ? lienVideo(lien) : null;
  const choisir = (f: File) => (formatDe(f.type) === 'video' ? onFichier(f) : onRefus(`« ${f.name} » : envoyez une vidéo MP4, WebM ou MOV.`));
  return (
    <>
      <div className="seg ep-src">
        <button type="button" className={bloc.source === 'fichier' ? 'on' : ''} aria-pressed={bloc.source === 'fichier'} onClick={() => onChange({ source: 'fichier' })}>Déposer un fichier</button>
        <button type="button" className={bloc.source === 'lien' ? 'on' : ''} aria-pressed={bloc.source === 'lien'} onClick={() => onChange({ source: 'lien' })}>Coller un lien</button>
      </div>
      {bloc.source === 'lien' ? (
        <>
          <input type="url" inputMode="url" className="inp" value={bloc.url} maxLength={500} placeholder="Lien YouTube, Vimeo ou Google Drive" aria-label="Lien de la vidéo" onChange={e => onChange({ url: e.target.value })} />
          {!lien ? <p className="hint ep-hint">YouTube, Vimeo ou Google Drive : la vidéo se lit dans la page, sans quitter la plateforme.</p>
            : video ? (
              <div className="ep-hint">
                <VideoEnLien url={lien} titre="Aperçu de la vidéo" />
                {video.plateforme === 'drive' && <p className="hint"><Icon name="alert" size={13} /> Dans Google Drive, partagez le fichier à « Tous les utilisateurs disposant du lien ». Sinon, une demande d’accès s’affiche à la place de la vidéo.</p>}
              </div>
            ) : <p className="hint err-t ep-hint">Lien non reconnu : collez l’adresse d’une vidéo YouTube, Vimeo ou Google Drive.</p>}
        </>
      ) : vue ? (
        <>
          <div className="pr-video"><video src={vue} controls playsInline preload="metadata" /></div>
          <Suivi b={bloc} onReessayer={() => bloc.local && onFichier(bloc.local)} />
          <Remplacer accept={VIDEOS} libelle="Remplacer la vidéo" onFichier={choisir} />
        </>
      ) : <ZoneDepot accept={VIDEOS} icone="video" invite="Choisir une vidéo" aide="MP4, WebM ou MOV, 100 Mo au plus. Ou glissez-la ici." onFichier={choisir} />}
    </>
  );
}

