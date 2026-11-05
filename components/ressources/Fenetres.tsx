'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import { PROFONDEUR_MAX, quand } from '@/lib/bibliotheque';
import Icon from '../Icon';
import ModalBackdrop from '../ModalBackdrop';
import { ChampImage, ChoixDossier, ChoixEntreprises, arbo, descendants, hauteur } from './outils';

// Menu « ⋯ » : s'ouvre sous le bouton, se referme au clic à côté ou avec Échap
export function Menu({ libelle, children, classe = '' }: { libelle: string; children: (fermer: () => void) => ReactNode; classe?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [haut, setHaut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Près du bas de l'écran, le menu s'ouvre vers le haut
  const basculer = () => {
    const r = ref.current?.getBoundingClientRect();
    setHaut(!!r && window.innerHeight - r.bottom < 340 && r.top > 340);
    setOuvert(o => !o);
  };
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOuvert(false); };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false);
    document.addEventListener('mousedown', clic); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', clic); document.removeEventListener('keydown', esc); };
  }, [ouvert]);
  return (
    <div className={`rmenu ${classe}`} ref={ref} onClick={e => e.stopPropagation()}>
      <button type="button" className="btn sm ghost nl-icon" aria-label={libelle} title={libelle} aria-expanded={ouvert} onClick={basculer}><Icon name="more" size={18} /></button>
      {ouvert && <div className={`rmenu-pop${haut ? ' up' : ''}`} role="menu">{children(() => setOuvert(false))}</div>}
    </div>
  );
}
export const Choix = ({ icone, children, onClick, danger, disabled }: { icone: string; children: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }) => (
  <button type="button" role="menuitem" className={danger ? 'danger' : ''} disabled={disabled} onClick={onClick}><Icon name={icone} size={16} />{children}</button>
);

/* ===== Dossier : création, réglages, accès ===== */
export function DossierFenetre({ dossier, parentId, dossiers, membres, vue = 'tout', onClose, onSaved }: {
  dossier?: Row; parentId: number | null; dossiers: Row[]; membres: Row[]; vue?: 'tout' | 'acces'; onClose: () => void; onSaved: (id?: number) => void;
}) {
  const [nom, setNom] = useState<string>(dossier?.nom ?? '');
  const [parent, setParent] = useState<number | null>(dossier ? dossier.parent_id : parentId);
  const [restreint, setRestreint] = useState<boolean>(dossier?.restreint ?? false);
  const [acces, setAcces] = useState<number[]>((dossier?.acces ?? []).map((a: Row) => a.member_id));
  const [cover, setCover] = useState<number | null>(dossier?.cover ?? null);
  const [auteur, setAuteur] = useState({ auteur_nom: dossier?.auteur_nom ?? '', auteur_role: dossier?.auteur_role ?? '', auteur_bio: dossier?.auteur_bio ?? '' });
  const [photo, setPhoto] = useState<number | null>(dossier?.auteur_photo ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const noeuds = useMemo(() => arbo(dossiers), [dossiers]);
  // Un dossier ne se range ni en lui-même, ni dans ses sous-dossiers, ni au-delà de 5 niveaux
  const exclure = dossier ? [dossier.id, ...descendants(dossiers, dossier.id)] : [];
  const h = dossier ? hauteur(dossiers, dossier.id) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (restreint && !acces.length) return setError('Choisissez au moins une entreprise, ou ouvrez le dossier à tous les membres.');
    setBusy(true); setError('');
    const body = vue === 'acces' ? { restreint, acces } : { nom, parent_id: parent, restreint, acces, cover, auteur_photo: photo, ...auteur };
    try {
      if (dossier) await api(`/api/ressources/dossiers/${dossier.id}`, 'PATCH', body);
      const d = dossier ? null : await api<Row>('/api/ressources/dossiers', 'POST', body);
      toast(dossier ? (vue === 'acces' ? 'Accès du dossier enregistré.' : 'Dossier enregistré.') : `Dossier « ${nom.trim()} » créé.`);
      onSaved(d?.id);
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  const champsAcces = (
    <>
      <div className="seg rf-seg" role="radiogroup" aria-label="Qui voit ce dossier">
        <button type="button" role="radio" aria-checked={!restreint} className={!restreint ? 'on' : ''} onClick={() => setRestreint(false)}>Tous les membres</button>
        <button type="button" role="radio" aria-checked={restreint} className={restreint ? 'on' : ''} onClick={() => setRestreint(true)}><Icon name="lock" size={14} /> Entreprises choisies</button>
      </div>
      <p className="hint">{restreint ? 'Seules les entreprises cochées voient ce dossier et ce qu’il contient.' : 'Tous les membres à jour de leur cotisation voient ce dossier.'}</p>
      {restreint && <ChoixEntreprises membres={membres} choisis={acces} onChange={setAcces} />}
    </>
  );

  return (
    <ModalBackdrop onClose={onClose}>
      <form className="modal" style={{ width: 'min(100%, 640px)' }} onSubmit={submit}>
        <div className="modal-h"><h2>{vue === 'acces' ? 'Qui voit ce dossier' : dossier ? 'Réglages du dossier' : 'Nouveau dossier'}</h2>
          <button type="button" className="btn sm ghost" aria-label="Fermer" onClick={onClose}>✕</button></div>
        <div className="modal-b">
          {error && <div className="err">{error}</div>}
          {vue === 'acces' ? <><p className="small muted">{dossier?.nom}</p>{champsAcces}</> : (
            <>
              <div className="field"><label htmlFor="df-n">Nom du dossier *</label>
                <input id="df-n" className="inp" required maxLength={80} autoFocus value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex. Missions économiques" /></div>
              <div className="field"><label htmlFor="df-p">Rangé dans</label>
                <ChoixDossier id="df-p" dossiers={noeuds} valeur={parent} onChange={setParent} exclure={exclure} desactive={d => d.profondeur + 2 + h > PROFONDEUR_MAX} />
                <span className="hint">La bibliothèque compte {PROFONDEUR_MAX} niveaux de dossiers au plus.{dossier ? ' Changer de dossier déplace tout son contenu avec lui.' : ''}</span></div>
              <fieldset className="df-set"><legend>Accès</legend>{champsAcces}</fieldset>
              <ChampImage libelle="Couverture" valeur={cover} onChange={setCover} aide="Facultatif. L’image du dossier, en tête de sa page. Paysage de préférence." />
              <fieldset className="df-set"><legend>Auteur</legend>
                <div className="form-grid">
                  <div className="field"><label htmlFor="df-an">Nom</label><input id="df-an" className="inp" maxLength={120} value={auteur.auteur_nom} onChange={e => setAuteur({ ...auteur, auteur_nom: e.target.value })} placeholder="Ex. Alice Ratisbonne" />
                    <span className="hint">Vide : le dossier n’affiche pas d’auteur.</span></div>
                  <div className="field"><label htmlFor="df-ar">Fonction</label><input id="df-ar" className="inp" maxLength={160} value={auteur.auteur_role} onChange={e => setAuteur({ ...auteur, auteur_role: e.target.value })} placeholder="Ex. Directrice exécutive" /></div>
                </div>
                <div className="field"><label htmlFor="df-ab">Présentation</label><textarea id="df-ab" className="inp" rows={3} maxLength={800} value={auteur.auteur_bio} onChange={e => setAuteur({ ...auteur, auteur_bio: e.target.value })} placeholder="Quelques lignes sur son parcours et ce qu’elle ou il apporte à ce dossier." /></div>
                <ChampImage libelle="Portrait" valeur={photo} onChange={setPhoto} rond aide="Facultatif. Un portrait cadré sur le visage." />
              </fieldset>
            </>
          )}
        </div>
        <div className="modal-f"><button type="button" className="btn" onClick={onClose}>Annuler</button>
          <button className="btn cta" disabled={busy}>{busy ? 'Enregistrement…' : dossier ? 'Enregistrer' : <><Icon name="folderplus" size={15} /> Créer le dossier</>}</button></div>
      </form>
    </ModalBackdrop>
  );
}

/* ===== Accès aux ressources payantes ===== */
// Une ressource : la liste de qui y a accès, retrait, ajout. Plusieurs ressources cochées : ouverture groupée.
export function AccesFenetre({ ressources, membres, onClose, onChanged }: { ressources: Row[]; membres: Row[]; onClose: () => void; onChanged: () => void }) {
  const seule = ressources.length === 1 ? ressources[0] : null;
  const payantes = ressources.filter(r => r.type === 'payant');
  const [choisis, setChoisis] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [acces, setAcces] = useState<Row[]>(seule?.acces ?? []);

  async function run(op: 'ouvrir' | 'retirer', membresIds: number[]) {
    setBusy(true);
    try {
      await api('/api/ressources/actions', 'POST', { op, ids: payantes.map(r => r.id), membres: membresIds });
      if (seule) {
        setAcces(a => op === 'retirer' ? a.filter(x => !membresIds.includes(x.member_id))
          : [...a, ...membres.filter(m => membresIds.includes(m.id)).map(m => ({ member_id: m.id, nom: m.nom, ouvert_par: 'Vous', date: new Date().toISOString() }))].sort((x, y) => x.nom.localeCompare(y.nom, 'fr')));
        setChoisis([]);
      }
      toast(op === 'ouvrir' ? `Accès ouvert à ${membresIds.length} entreprise${membresIds.length > 1 ? 's' : ''}.` : 'Accès retiré.');
      onChanged();
      if (!seule) onClose();
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal" style={{ width: 'min(100%, 620px)' }} role="dialog" aria-label="Accès aux ressources payantes">
        <div className="modal-h"><h2>{seule ? 'Qui a accès à cette ressource' : 'Ouvrir l’accès à des entreprises'}</h2>
          <button type="button" className="btn sm ghost" aria-label="Fermer" onClick={onClose}>✕</button></div>
        <div className="modal-b">
          {seule ? <p className="small muted">{seule.titre}</p> : (
            <p className="small muted">L’accès s’ouvre pour {payantes.length} ressource{payantes.length > 1 ? 's' : ''} payante{payantes.length > 1 ? 's' : ''} parmi les {ressources.length} cochées.
              {payantes.length < ressources.length && ' Les ressources gratuites sont écartées : tout membre à jour les lit déjà.'}</p>
          )}
          {seule && (
            <div className="ac-box">
              <div className="ac-head"><Icon name="users" size={15} /><b>{acces.length} entreprise{acces.length > 1 ? 's' : ''} y {acces.length > 1 ? 'ont' : 'a'} accès</b></div>
              {acces.length ? (
                <ul className="ac-list">
                  {acces.map(a => (
                    <li key={a.member_id}><span className="grow"><b>{a.nom}</b><small>Ouvert par {a.ouvert_par ?? 'l’équipe'} · {quand(a.date)}</small></span>
                      <button type="button" className="btn sm ghost nl-icon" disabled={busy} aria-label={`Retirer l’accès de ${a.nom}`} title="Retirer" onClick={() => run('retirer', [a.member_id])}><Icon name="trash" size={14} /></button></li>
                  ))}
                </ul>
              ) : <p className="small muted ac-empty">Personne n’y a encore accès.</p>}
            </div>
          )}
          {payantes.length ? <ChoixEntreprises membres={membres} choisis={choisis} onChange={setChoisis} exclure={acces.map(a => a.member_id)} hauteurMax={220} />
            : <p className="small muted">Aucune des ressources cochées n’est payante.</p>}
        </div>
        <div className="modal-f"><button type="button" className="btn" onClick={onClose}>Fermer</button>
          <button type="button" className="btn cta" disabled={busy || !choisis.length || !payantes.length} onClick={() => run('ouvrir', choisis)}>
            <Icon name="userplus" size={15} /> {choisis.length ? `Ouvrir l’accès à ${choisis.length} entreprise${choisis.length > 1 ? 's' : ''}` : 'Ouvrir l’accès'}</button></div>
      </div>
    </ModalBackdrop>
  );
}
