'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, type Row } from '@/lib/format';

const fDT = (d: string) => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fD = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const ini = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

export default function Messagerie() {
  const [threads, setThreads] = useState<Row[] | null>(null);
  const [cur, setCur] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<Row[]>([]);
  const [text, setText] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const loadThreads = useCallback(async () => {
    try {
      const t = await api<Row[]>('/api/messagerie');
      setThreads(t);
      setCur(c => c ?? t[0]?.id ?? null);
    } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => {
    if (cur) api<Row[]>(`/api/messagerie/${cur}`).then(setMsgs).catch(e => setError(e.message));
  }, [cur]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!cur || !text.trim()) return;
    try {
      const m = await api<Row>(`/api/messagerie/${cur}`, 'POST', { texte: text });
      setMsgs(x => [...x, m]);
      setText('');
      loadThreads();
    } catch (err) { setError((err as Error).message); }
  }

  const th = threads?.find(t => t.id === cur);
  return (
    <>
      <div className="head">
        <div><div className="eyebrow">Communication</div><h1><em>Messagerie</em></h1>
          <p className="muted">Les échanges avec les membres dans le chat du support.</p></div>
        <div className="actions"><button className="btn cta" onClick={() => setCreating(true)}>+ Nouvelle conversation</button></div>
      </div>
      {error && <div className="err">{error}</div>}
      <div className="msg">
        <div className="msg-l">
          {threads?.length === 0 && <div className="empty">Aucune conversation pour l’instant.</div>}
          {threads?.map(t => {
            const who = t.contact || t.membre;
            return (
              <div key={t.id} className={`c${t.id === cur ? ' on' : ''}`} onClick={() => setCur(t.id)}>
                <div className="av" style={{ width: 36, height: 36, background: '#1A2A40' }}>{ini(who)}</div>
                <div className="grow small">
                  <div className="row between" style={{ flexWrap: 'nowrap' }}><b>{who}</b><span className="muted">{fD(t.maj)}</span></div>
                  <div className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.dernier_de_nous ? 'Vous : ' : ''}{t.dernier ?? t.sujet}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="msg-r">
          {th ? (
            <>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
                <b>{th.contact || th.membre}</b> <span className="small muted">· {th.membre} · {th.sujet}</span>
              </div>
              <div className="bubbles">
                {msgs.map(m => (
                  <div key={m.id} className={`bub${m.de_nous ? ' me' : ''}`}>
                    {m.texte}<div className="small" style={{ opacity: .65, marginTop: 3 }}>{fDT(m.created_at)}</div>
                  </div>
                ))}
              </div>
              <form className="composer" onSubmit={send}>
                <input className="inp" placeholder="Votre réponse…" aria-label="Réponse" value={text} onChange={e => setText(e.target.value)} />
                <button className="btn cta">Envoyer</button>
              </form>
            </>
          ) : <div className="empty">Sélectionnez ou créez une conversation.</div>}
        </div>
      </div>
      {creating && <NewThread onClose={() => setCreating(false)} onCreated={id => { setCreating(false); setCur(id); loadThreads(); }} />}
    </>
  );
}

function NewThread({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const [members, setMembers] = useState<Row[]>([]);
  const [v, setV] = useState({ member_id: '', sujet: '', texte: '' });
  const [error, setError] = useState('');
  useEffect(() => { api<Row[]>('/api/members').then(setMembers).catch(e => setError(e.message)); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const t = await api<Row>('/api/messagerie', 'POST', { ...v, member_id: Number(v.member_id) });
      onCreated(t.id);
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-h"><h2>Nouvelle conversation</h2><button type="button" className="btn sm ghost" onClick={onClose} aria-label="Fermer">✕</button></div>
        <div className="modal-b">
          {error && <div className="err">{error}</div>}
          {members.length === 0 && <p className="hint">Ajoutez d’abord un membre dans « Membres ».</p>}
          <div className="field"><label htmlFor="nt-m">Membre *</label>
            <select id="nt-m" className="inp" required value={v.member_id} onChange={e => setV({ ...v, member_id: e.target.value })}>
              <option value="">—</option>{members.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select></div>
          <div className="field"><label htmlFor="nt-s">Sujet *</label>
            <input id="nt-s" className="inp" required value={v.sujet} onChange={e => setV({ ...v, sujet: e.target.value })} /></div>
          <div className="field"><label htmlFor="nt-t">Message *</label>
            <textarea id="nt-t" className="inp" required value={v.texte} onChange={e => setV({ ...v, texte: e.target.value })} /></div>
        </div>
        <div className="modal-f"><button type="button" className="btn" onClick={onClose}>Annuler</button><button className="btn cta">Envoyer</button></div>
      </form>
    </div>
  );
}
