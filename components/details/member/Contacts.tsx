'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import Avatar, { avatarChanged } from '../../Avatar';
import Icon from '../../Icon';
import ModalBackdrop from '../../ModalBackdrop';

// Ajout ou modification d'un contact : portrait, nom, fonction, courriel, téléphone, contact principal
function ContactForm({ memberId, c, only, onClose, onSaved }: { memberId: number; c: Row | null; only: boolean; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<Row>({ nom: c?.nom ?? '', fonction: c?.fonction ?? '', email: c?.email ?? '', tel: c?.tel ?? '', principal: c?.principal ?? only });
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...v, member_id: memberId, principal: only && c ? true : !!v.principal };
      const saved = c ? await api<Row>(`/api/contacts/${c.id}`, 'PATCH', body) : await api<Row>('/api/contacts', 'POST', body);
      if (photo) {
        const f = new FormData(); f.set('file', photo);
        const res = await fetch(`/api/avatar/contact/${saved.id ?? c?.id}`, { method: 'PUT', body: f });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Portrait non enregistré');
        avatarChanged();
      }
      toast(c ? 'Contact modifié.' : `${v.nom} a été ajouté aux contacts.`);
      onSaved();
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <form className="modal" style={{ width: 'min(100%, 520px)' }} onSubmit={submit}>
        <div className="modal-h"><h2>{c ? 'Modifier le contact' : 'Ajouter un contact'}</h2><button type="button" className="btn sm ghost" aria-label="Fermer" onClick={onClose}>✕</button></div>
        <div className="modal-b">
          {error && <div className="err">{error}</div>}
          <div className="ct-photo">
            {photo ? <img src={URL.createObjectURL(photo)} alt="" /> : c ? <Avatar kind="contact" id={c.id} size={64} nom={c.nom} /> : <span className="ct-ph-empty"><Icon name="user" size={26} /></span>}
            <div><button type="button" className="btn sm" onClick={() => input.current?.click()}>{photo || c ? 'Changer le portrait' : 'Choisir un portrait'}</button>
              <span className="hint">Facultatif. À défaut, les initiales font l’avatar.</span></div>
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
          </div>
          <div className="field"><label htmlFor="ct-n">Nom et prénom *</label><input id="ct-n" className="inp" required value={v.nom} onChange={e => setV({ ...v, nom: e.target.value })} /></div>
          <div className="field"><label htmlFor="ct-f">Fonction</label><input id="ct-f" className="inp" value={v.fonction} onChange={e => setV({ ...v, fonction: e.target.value })} placeholder="Par exemple : Responsable export" /></div>
          <div className="form-grid">
            <div className="field"><label htmlFor="ct-e">Courriel *</label><input id="ct-e" type="email" className="inp" required value={v.email} onChange={e => setV({ ...v, email: e.target.value })} /></div>
            <div className="field"><label htmlFor="ct-t">Téléphone</label><input id="ct-t" type="tel" className="inp" value={v.tel} onChange={e => setV({ ...v, tel: e.target.value })} placeholder="+261 34 00 000 00" /></div>
          </div>
          <label className="fs-switch">
            <input type="checkbox" className="switch" checked={!!v.principal} disabled={only && !!c} onChange={e => setV({ ...v, principal: e.target.checked })} />
            <span><b>Contact principal</b><small>{only && c ? 'Seul contact de l’entreprise : cette personne le reste tant qu’une autre n’a pas été ajoutée.' : 'C’est elle que la chambre joint en premier. L’ancien référent perd ce rôle, sans quitter la liste.'}</small></span>
          </label>
        </div>
        <div className="modal-f"><button type="button" className="btn" onClick={onClose}>Annuler</button><button className="btn cta" disabled={busy}>{busy ? 'Enregistrement…' : c ? 'Enregistrer' : 'Ajouter le contact'}</button></div>
      </form>
    </ModalBackdrop>
  );
}

// Section « Contacts » : les personnes déclarées par le membre, le contact principal en premier
export default function Contacts({ memberId, physique }: { memberId: number; physique?: boolean }) {
  const [list, setList] = useState<Row[] | null>(null);
  const [editing, setEditing] = useState<Row | null | 'new'>(null);
  const load = useCallback(() => api<Row[]>(`/api/contacts?member_id=${memberId}`)
    .then(r => setList(r.sort((a, b) => Number(b.principal) - Number(a.principal) || a.id - b.id))).catch(() => setList([])), [memberId]);
  useEffect(() => { load(); }, [load]);

  async function remove(c: Row) {
    if ((list?.length ?? 0) <= 1) return toast('Une entreprise doit garder au moins un contact.', 'error');
    if (!confirm(`Retirer ${c.nom} des contacts de l’entreprise ?`)) return;
    try { await api(`/api/contacts/${c.id}`, 'DELETE'); toast('Contact retiré.'); load(); } catch (e) { toast((e as Error).message, 'error'); }
  }

  return (
    <section className="card">
      <div className="row between"><div><h2>{physique ? 'Contact' : 'Contacts'}</h2><p className="small muted">Les personnes déclarées par le membre. Le contact principal est joint en premier.</p></div>
        <button className="btn sm" onClick={() => setEditing('new')}><Icon name="userplus" size={14} /> Ajouter un contact</button></div>
      {list && list.length === 0 && <p className="small muted">Aucun contact déclaré par ce membre.</p>}
      {list && list.length > 0 && (
        <ul className="ct-grid">
          {list.map(c => (
            <li key={c.id} className={c.principal ? 'main' : ''}>
              <Avatar kind="contact" id={c.id} size={52} nom={c.nom} />
              <div className="ct-id">
                <b>{c.nom}</b>{c.principal && <span className="ct-main">Contact principal</span>}
                {c.fonction && <span className="ct-fn">{c.fonction}</span>}
                {c.email && <a href={`mailto:${c.email}`}><Icon name="mail" size={13} />{c.email}</a>}
                {c.tel && <a href={`tel:${c.tel.replace(/\s/g, '')}`}><Icon name="chat" size={13} />{c.tel}</a>}
              </div>
              <div className="ct-act">
                <button type="button" className="btn sm ghost nl-icon" aria-label={`Modifier ${c.nom}`} title="Modifier" onClick={() => setEditing(c)}><Icon name="edit" size={15} /></button>
                {list.length > 1 && <button type="button" className="btn sm ghost nl-icon" aria-label={`Retirer ${c.nom}`} title="Retirer" onClick={() => remove(c)}><Icon name="trash" size={15} /></button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <ContactForm memberId={memberId} c={editing === 'new' ? null : editing} only={(list?.length ?? 0) <= (editing === 'new' ? 0 : 1)} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </section>
  );
}
