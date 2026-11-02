'use client';
import { useState } from 'react';
import { runAction } from '@/lib/ui-actions';

type M = { id: number; nom: string };

// Mise en relation : message envoyé aux deux membres (conversation + courriel)
export default function IntroModal({ a, b, why, onClose, onDone }: { a: M; b: M; why: string[]; onClose: () => void; onDone: (msg: string) => void }) {
  const [text, setText] = useState(
    `Nous avons le plaisir de vous mettre en relation : ${a.nom} et ${b.nom}.\n\n${why.map(w => '• ' + w).join('\n')}\n\nN’hésitez pas à prendre contact directement. Nous restons disponibles pour faciliter vos échanges.\n\nL’équipe de la CanCham`);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { onDone(await runAction('introduce', { a: a.id, b: b.id, message: text })); }
    catch (err) { setError((err as Error).message); setBusy(false); }
  }

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-h"><h2>Mettre en relation</h2><button type="button" className="btn sm ghost" onClick={onClose} aria-label="Fermer">✕</button></div>
        <div className="modal-b">
          {error && <div className="err">{error}</div>}
          <p className="small muted">Ce message ouvre une conversation avec chacun des deux membres dans la messagerie et leur est envoyé par courriel.</p>
          <textarea className="inp" style={{ minHeight: 220 }} required value={text} onChange={e => setText(e.target.value)} aria-label="Message d’introduction" />
        </div>
        <div className="modal-f">
          <button type="button" className="btn" onClick={onClose}>Annuler</button>
          <button className="btn cta" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer l’introduction'}</button>
        </div>
      </form>
    </div>
  );
}
