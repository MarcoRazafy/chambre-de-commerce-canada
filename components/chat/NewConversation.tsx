'use client';
import { useState } from 'react';
import { chat, chatChanged, type Person } from '@/lib/chat';
import Icon from '../Icon';
import Composer from './Composer';
import PeoplePicker from './PeoplePicker';

// Nouveau message : un destinataire = conversation directe ; plusieurs = groupe (avec un nom facultatif)
export default function NewConversation({ initial = [], compact, onCreated, onClose, onBack }: { initial?: Person[]; compact?: boolean; onCreated: (id: number) => void; onClose?: () => void; onBack?: () => void }) {
  const [to, setTo] = useState<Person[]>(initial);
  const [sujet, setSujet] = useState('');

  async function send(texte: string, files: File[]) {
    if (!to.length) throw new Error('Choisissez au moins un destinataire');
    const t = await chat.create({ user_ids: to.filter(p => p.kind === 'user').map(p => p.id), member_ids: to.filter(p => p.kind === 'member').map(p => p.id), sujet });
    await chat.send(t.id, texte, files);
    chatChanged();
    onCreated(t.id);
  }

  return (
    <div className="conv new-conv">
      <header className="conv-h">{onBack && <button className="tb-btn conv-back" aria-label="Retour aux conversations" onClick={onBack}><Icon name="back" size={20} /></button>}<b className="grow">Nouveau message</b>{onClose && <button className="tb-btn" title="Fermer" onClick={onClose}><Icon name="close" size={18} /></button>}</header>
      <div className="new-to">
        <PeoplePicker value={to} onChange={setTo} autoFocus={!initial.length} />
        {to.length > 1 && <input className="inp" placeholder="Nom du groupe (facultatif)" aria-label="Nom du groupe" value={sujet} onChange={e => setSujet(e.target.value)} />}
        {to.some(p => p.kind === 'member') && !compact && <p className="small muted">Les membres recevront ce message par courriel.</p>}
      </div>
      <div className="grow" />
      <Composer compact={compact} onSend={send} autoFocus={!!initial.length} placeholder={to.length > 1 ? 'Premier message du groupe…' : 'Rédigez un message…'} />
    </div>
  );
}
