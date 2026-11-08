'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import Icon from '../../Icon';
import ModalBackdrop from '../../ModalBackdrop';

const MAX = 5;
const photoUrl = (id: number) => `/api/produits/photos/${id}`;

// Ajout ou modification d'une offre : titre, nature, prix en clair, description, jusqu'à 5 photos (la première sert de vignette)
function OffreForm({ memberId, espace, p, onClose, onSaved }: { memberId?: number; espace?: boolean; p: Row | null; onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState(p?.label ?? '');
  const [type, setType] = useState(p?.type ?? 'service');
  const [prix, setPrix] = useState(p?.prix ?? '');
  const [description, setDescription] = useState(p?.description ?? '');
  const [retirer, setRetirer] = useState<number[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const kept = (p?.photos ?? []).filter((x: number) => !retirer.includes(x));
  const room = MAX - kept.length;
  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(u => URL.revokeObjectURL(u)), [previews]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData();
    f.set('label', label); f.set('type', type); f.set('prix', prix); f.set('description', description);
    f.set('retirer', JSON.stringify(retirer));
    files.slice(0, room).forEach(x => f.append('photos', x));
    const res = await fetch(espace ? (p ? `/api/espace/produits/${p.id}` : '/api/espace/produits') : p ? `/api/produits/${p.id}` : `/api/membres/${memberId}/produits`, { method: p ? 'PATCH' : 'POST', body: f });
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || 'Enregistrement impossible'); setBusy(false); return; }
    toast(p ? 'Offre modifiée.' : 'Offre ajoutée au catalogue.');
    onSaved();
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <form className="modal" style={{ width: 'min(100%, 620px)' }} onSubmit={submit}>
        <div className="modal-h"><h2>{p ? 'Modifier l’offre' : 'Ajouter une offre'}</h2><button type="button" className="btn sm ghost" aria-label="Fermer" onClick={onClose}>✕</button></div>
        <div className="modal-b">
          {error && <div className="err">{error}</div>}
          <div className="field"><label htmlFor="of-l">Titre *</label><input id="of-l" className="inp" required maxLength={160} value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex. Huile essentielle de ravintsara" autoFocus /></div>
          <div className="form-grid">
            <div className="field"><label htmlFor="of-t">Nature</label>
              <select id="of-t" className="inp" value={type} onChange={e => setType(e.target.value)}><option value="service">Service</option><option value="produit">Produit</option></select></div>
            <div className="field"><label htmlFor="of-p">Prix indicatif</label><input id="of-p" className="inp" value={prix} onChange={e => setPrix(e.target.value)} placeholder="25 000 Ar le flacon, Sur devis…" />
              <span className="hint">Facultatif, en clair.</span></div>
          </div>
          <div className="field"><label htmlFor="of-d">Description</label><textarea id="of-d" className="inp" rows={5} value={description} onChange={e => setDescription(e.target.value)} />
            <span className="hint">Ce que l’offre comprend, pour qui, à quelles conditions, délais.</span></div>
          <div className="field">
            <label>Photos ({Math.max(0, room - files.length)}/{MAX} restantes)</label>
            <div className="of-photos">
              {(p?.photos ?? []).map((id: number, i: number) => (
                <button type="button" key={id} className={`of-ph${retirer.includes(id) ? ' gone' : ''}`} onClick={() => setRetirer(r => r.includes(id) ? r.filter(x => x !== id) : [...r, id])}
                  aria-label={retirer.includes(id) ? 'Garder cette photo' : 'Retirer cette photo'}>
                  <img src={photoUrl(id)} alt="" />{i === 0 && !retirer.includes(id) && <span className="of-thumb">Vignette</span>}<span className="of-x"><Icon name="close" size={14} /></span>
                </button>
              ))}
              {previews.map((u, i) => (
                <button type="button" key={u} className="of-ph new" onClick={() => setFiles(f => f.filter((_, j) => j !== i))} aria-label="Retirer cette nouvelle photo">
                  <img src={u} alt="" /><span className="of-x"><Icon name="close" size={14} /></span></button>
              ))}
              {room - files.length > 0 && (
                <label className="of-add"><Icon name="image" size={22} /><span>Ajouter</span>
                  <input type="file" accept="image/*" multiple hidden onChange={e => { const list = [...(e.target.files ?? [])]; setFiles(f => [...f, ...list].slice(0, room)); e.target.value = ''; }} /></label>
              )}
            </div>
            <span className="hint">Cliquez sur une photo pour la retirer. La première sert de vignette dans l’annuaire.</span>
          </div>
        </div>
        <div className="modal-f"><button type="button" className="btn" onClick={onClose}>Annuler</button><button className="btn cta" disabled={busy}>{busy ? 'Enregistrement…' : p ? 'Enregistrer' : 'Ajouter l’offre'}</button></div>
      </form>
    </ModalBackdrop>
  );
}

// Fiche d'une offre : galerie, prix, description
function OffreView({ p, onClose }: { p: Row; onClose: () => void }) {
  const [i, setI] = useState(0);
  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal" style={{ width: 'min(100%, 680px)' }} role="dialog" aria-label={p.label}>
        <div className="modal-h"><div><span className="dcard-sector">{p.type === 'produit' ? 'Produit' : 'Service'}</span><h2>{p.label}</h2></div><button type="button" className="btn sm ghost" aria-label="Fermer" onClick={onClose}>✕</button></div>
        <div className="modal-b">
          {p.photos.length > 0 && (
            <div className="of-gal">
              <img src={photoUrl(p.photos[i])} alt="" />
              {p.photos.length > 1 && <div className="of-dots">{p.photos.map((id: number, j: number) => <button key={id} type="button" className={j === i ? 'on' : ''} aria-label={`Photo ${j + 1}`} onClick={() => setI(j)} />)}</div>}
            </div>
          )}
          {p.prix && <p className="of-price">{p.prix}</p>}
          {p.description ? p.description.split(/\n{2,}/).map((t: string, j: number) => <p key={j} className="mabout-text">{t}</p>) : <p className="small muted">Aucune description pour le moment.</p>}
        </div>
      </div>
    </ModalBackdrop>
  );
}

// Section « Produits & services » de la fiche membre : cartes défilantes, ajout, modification, retrait.
// espace : le membre gère son propre catalogue ; liste : catalogue d'un autre membre, en lecture seule (annuaire)
export default function Produits({ memberId, espace, liste }: { memberId?: number; espace?: boolean; liste?: Row[] }) {
  const [list, setList] = useState<Row[] | null>(liste ?? null);
  const lecture = !!liste;
  const [editing, setEditing] = useState<Row | null | 'new'>(null);
  const [view, setView] = useState<Row | null>(null);
  const load = useCallback(() => { if (!lecture) api<Row[]>(espace ? '/api/espace/produits' : `/api/membres/${memberId}/produits`).then(setList).catch(() => setList([])); }, [memberId, espace, lecture]);
  useEffect(() => { load(); }, [load]);
  // Espace membre : /espace/profil#ajouter-service (depuis la recherche) ouvre directement le formulaire
  useEffect(() => {
    if (!espace || list === null || window.location.hash !== '#ajouter-service') return;
    document.getElementById('produits')?.scrollIntoView({ block: 'start' });
    setEditing('new'); history.replaceState(null, '', window.location.pathname);
  }, [espace, list]);

  async function remove(p: Row) {
    if (!confirm(`Retirer « ${p.label} » du catalogue ? Elle disparaîtra de la fiche et de l’annuaire.`)) return;
    try { await api(espace ? `/api/espace/produits/${p.id}` : `/api/produits/${p.id}`, 'DELETE'); toast('Offre retirée.'); load(); } catch (e) { toast((e as Error).message, 'error'); }
  }

  return (
    <section className="card" id={espace ? 'produits' : undefined}>
      <div className="row between"><div><h2>Produits &amp; services</h2><p className="small muted">{list ? `${list.length} offre${list.length > 1 ? 's' : ''} au catalogue${espace ? ' · visibles par les autres membres dans l’annuaire' : lecture ? '' : ' du membre'}` : '…'}</p></div>
        {!lecture && <button className="btn sm" onClick={() => setEditing('new')}><Icon name="plus" size={14} /> {espace ? 'Ajouter un service' : 'Ajouter'}</button>}</div>
      {list && list.length === 0 && <p className="small muted">{espace ? 'Aucune offre au catalogue. Ajoutez vos produits et services : les autres membres les voient dans l’annuaire.' : 'Aucune offre au catalogue pour le moment.'}</p>}
      {list && list.length > 0 && (
        <div className="of-rail">
          {list.map(p => (
            <article key={p.id} className="of-card">
              <button type="button" className="of-cover" onClick={() => setView(p)} aria-label={`Voir ${p.label}`}>
                {p.photos[0] ? <img src={photoUrl(p.photos[0])} alt="" loading="lazy" /> : <span className="ev-cover-empty"><Icon name={p.type === 'produit' ? 'store' : 'gift'} size={26} /></span>}
                {p.photos.length > 1 && <span className="of-count"><Icon name="image" size={12} />{p.photos.length}</span>}
              </button>
              <div className="of-body">
                <span className="dcard-sector">{p.type === 'produit' ? 'Produit' : 'Service'}</span>
                <b>{p.label}</b>
                {p.prix && <span className="of-p">{p.prix}</span>}
                {p.description && <p className="of-desc">{p.description}</p>}
                <button type="button" className="of-more" onClick={() => setView(p)}>Voir le détail</button>
              </div>
              {!lecture && <div className="of-act">
                <button type="button" className="btn sm ghost" onClick={() => setEditing(p)}><Icon name="edit" size={14} /> Modifier</button>
                <button type="button" className="btn sm ghost rg-reject" onClick={() => remove(p)}>Retirer</button>
              </div>}
            </article>
          ))}
        </div>
      )}
      {editing && <OffreForm memberId={memberId} espace={espace} p={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {view && <OffreView p={view} onClose={() => setView(null)} />}
    </section>
  );
}
