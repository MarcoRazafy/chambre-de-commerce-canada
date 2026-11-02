'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { Row } from '@/lib/format';
import { chat, chatChanged, size, type Person } from '@/lib/chat';
import { toast } from '@/lib/toast';
import Avatar, { ThreadAvatar } from '../Avatar';
import Icon from '../Icon';
import StatusBadge from '../StatusBadge';
import PeoplePicker from './PeoplePicker';

const STATUT: Record<string, string> = { a_jour: 'À jour', retard: 'En retard', attente: 'En attente de paiement', demande: 'Demande', refusee: 'Refusée' };

// Panneau de droite : participants, fiche du membre, fichiers partagés, actions sur la conversation
export default function InfoPanel({ d, me, onSwitch, onClose }: { d: Row; me: { id: number; role: string }; onSwitch: (id: number | null) => void; onClose: () => void }) {
  const [adding, setAdding] = useState<Person[] | null>(null);
  const [titre, setTitre] = useState<string | null>(null);
  const files = d.messages.flatMap((m: Row) => m.fichiers ?? []);
  const canManage = d.created_by === me.id || me.role === 'Administrateur';
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast(ok); chatChanged(); } catch (e) { toast((e as Error).message, 'error'); } };

  async function add() {
    if (!adding?.length) return;
    try {
      const r = await chat.addPeople(d.id, adding.filter(p => p.kind === 'user').map(p => p.id), adding.filter(p => p.kind === 'member').map(p => p.id));
      setAdding(null);
      chatChanged();
      if (r.id !== d.id) { toast('Nouveau groupe créé avec ces personnes.'); onSwitch(r.id); } else toast('Personnes ajoutées.');
    } catch (e) { toast((e as Error).message, 'error'); }
  }

  return (
    <div className="info-panel">
      <div className="info-h"><b>Informations</b><button className="tb-btn" title="Fermer" onClick={onClose}><Icon name="close" size={18} /></button></div>
      <div className="info-top">
        <ThreadAvatar t={d} meId={me.id} size={64} />
        {titre === null ? (
          <div className="row" style={{ justifyContent: 'center' }}><b>{d.titre}</b>
            {d.type !== 'equipe' && <button className="tb-btn" title="Renommer" onClick={() => setTitre(d.sujet ?? '')}><Icon name="edit" size={16} /></button>}</div>
        ) : (
          <form className="row" onSubmit={async e => { e.preventDefault(); await run(() => chat.patch(d.id, { sujet: titre }), 'Conversation renommée.'); setTitre(null); }}>
            <input className="inp grow" value={titre} autoFocus placeholder="Nom de la conversation" onChange={e => setTitre(e.target.value)} aria-label="Nom de la conversation" />
            <button className="btn sm cta">OK</button>
          </form>
        )}
      </div>

      {d.membre && (
        <section className="info-sec">
          <h3>Membre</h3>
          <div className="row"><StatusBadge value={d.membre.statut} label={STATUT[d.membre.statut] ?? d.membre.statut} /><span className="small muted">{[d.membre.secteur, d.membre.ville].filter(Boolean).join(' · ')}</span></div>
          {d.membre.description && <p className="small">{d.membre.description}</p>}
          {d.membre.contacts.map((c: Row, i: number) => (
            <div key={i} className="small"><b>{c.nom}</b>{c.fonction ? `, ${c.fonction}` : ''}<br />{c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}{c.tel ? ` · ${c.tel}` : ''}</div>
          ))}
          <Link className="btn sm" href={`/membres/${d.membre.id}`}>Ouvrir la fiche</Link>
        </section>
      )}

      <section className="info-sec">
        <h3>{d.type === 'membre' ? 'Visibilité' : `Participants (${d.participants.length})`}</h3>
        {d.type === 'membre' && <p className="small muted">Toute l’équipe voit cette conversation et peut y répondre.</p>}
        {d.participants.map((p: Row) => (
          <div key={p.kind + p.id} className="person">
            <Avatar kind={p.kind} id={p.id} size={32} />
            <span className="grow">{p.kind === 'member' ? <Link href={`/membres/${p.id}`}><b>{p.nom}</b></Link> : <b>{p.nom}{p.id === me.id && p.kind === 'user' ? ' (vous)' : ''}</b>}
              <span className="small muted">{p.kind === 'member' ? 'Membre' : p.fonction || p.role}</span></span>
            {d.type === 'groupe' && (canManage || (p.kind === 'user' && p.id === me.id)) && (
              <button className="btn ghost sm" onClick={() => {
                const self = p.kind === 'user' && p.id === me.id;
                if (!confirm(self ? 'Quitter ce groupe ?' : `Retirer ${p.nom} du groupe ?`)) return;
                run(() => chat.removePerson(d.id, p.kind, p.id), self ? 'Vous avez quitté le groupe.' : `${p.nom} a été retiré.`).then(() => self && onSwitch(null));
              }}>{p.kind === 'user' && p.id === me.id ? 'Quitter' : 'Retirer'}</button>
            )}
          </div>
        ))}
        {adding === null ? (
          <button className="btn sm" onClick={() => setAdding([])}><Icon name="userplus" size={16} /> Ajouter des personnes</button>
        ) : (
          <div className="info-add">
            <PeoplePicker value={adding} onChange={setAdding} exclude={d.participants} autoFocus />
            {d.type !== 'groupe' && <p className="small muted">Un nouveau groupe sera créé avec les personnes actuelles et celles-ci.</p>}
            <div className="row"><button className="btn sm" onClick={() => setAdding(null)}>Annuler</button><button className="btn sm cta" disabled={!adding.length} onClick={add}>Ajouter</button></div>
          </div>
        )}
      </section>

      <section className="info-sec">
        <h3>Fichiers partagés ({files.length})</h3>
        {files.length === 0 && <p className="small muted">Aucun fichier pour l’instant.</p>}
        <div className="info-imgs">{files.filter((f: Row) => f.type.startsWith('image/')).map((f: Row) => (
          <a key={f.id} href={`/api/messagerie/fichiers/${f.id}`} target="_blank" rel="noreferrer"><img src={`/api/messagerie/fichiers/${f.id}`} alt={f.nom} loading="lazy" /></a>))}</div>
        {files.filter((f: Row) => !f.type.startsWith('image/')).map((f: Row) => (
          <a key={f.id} className="msg-file" href={`/api/messagerie/fichiers/${f.id}?dl=1`}><Icon name={f.type.startsWith('video/') ? 'video' : 'doc'} size={20} /><span className="grow"><b>{f.nom}</b><span className="small muted">{size(f.taille)}</span></span></a>
        ))}
      </section>

      <section className="info-sec info-actions">
        <button className="btn ghost sm" onClick={() => run(() => chat.patch(d.id, { important: !d.important }), d.important ? 'Retirée des importants.' : 'Marquée comme importante.')}><Icon name="fav" size={16} fill={d.important} /> {d.important ? 'Retirer des importants' : 'Marquer comme importante'}</button>
        <button className="btn ghost sm" onClick={() => run(() => chat.patch(d.id, { non_lu: true }), 'Marquée comme non lue.').then(() => onSwitch(null))}><Icon name="mail" size={16} /> Marquer comme non lue</button>
        <button className="btn ghost sm" onClick={() => run(() => chat.patch(d.id, { archived: !d.archived }), d.archived ? 'Conversation désarchivée.' : 'Conversation archivée.').then(() => !d.archived && onSwitch(null))}><Icon name="archive" size={16} /> {d.archived ? 'Désarchiver' : 'Archiver'}</button>
        {canManage && <button className="btn ghost sm danger" onClick={() => { if (confirm('Supprimer définitivement cette conversation et ses fichiers ?')) run(() => chat.remove(d.id), 'Conversation supprimée.').then(() => onSwitch(null)); }}><Icon name="trash" size={16} /> Supprimer la conversation</button>}
      </section>
    </div>
  );
}
