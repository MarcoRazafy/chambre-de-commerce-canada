'use client';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { RESOURCES } from '@/lib/resources';
import { api, display, tone, type Row } from '@/lib/format';
import { ROW_ACTIONS, runAction } from '@/lib/ui-actions';
import ResourcePage, { EditModal } from '../ResourcePage';
import IntroModal from '../IntroModal';

type Sugg = { a: Row; b: Row; score: number; why: string[] };
const R = RESOURCES.members;

// Fiche membre : informations, contacts, factures, rendez-vous, inscriptions, conversations, suggestions
export default function MemberDetail({ id }: { id: number }) {
  const [m, setM] = useState<Row | null>(null);
  const [refs, setRefs] = useState<Record<string, Row[]>>({});
  const [threads, setThreads] = useState<Row[]>([]);
  const [sugg, setSugg] = useState<Sugg[]>([]);
  const [intro, setIntro] = useState<Sugg | null>(null);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [v, setV] = useState(0);   // force le rechargement des tableaux après une action

  const load = useCallback(async () => {
    try {
      const [mm, sect, form, th, sg] = await Promise.all([
        api<Row>(`/api/members/${id}`), api<Row[]>('/api/secteurs'), api<Row[]>('/api/formules'), api<Row[]>('/api/messagerie'), api<Sugg[]>(`/api/suggestions?member=${id}`)]);
      setM(mm);
      setRefs({ secteurs: sect, formules: form });
      setThreads(th.filter(t => t.member_id === id));
      setSugg(sg);
      setV(x => x + 1);
    } catch (e) { setError((e as Error).message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function act(action: string, question?: string) {
    if (question && !confirm(question)) return;
    try { setMsg(await runAction(action, { id })); setError(''); load(); } catch (e) { setError((e as Error).message); }
  }

  if (!m) return error ? <div className="err">{error}</div> : <div className="empty">Chargement…</div>;
  const f = (name: string) => display(R.fields.find(x => x.name === name)!, m, refs, t => RESOURCES[t].label);
  return (
    <>
      <div className="head">
        <div><div className="eyebrow"><Link href="/membres">Membres</Link></div><h1><em>{m.nom}</em></h1>
          <p className="muted">{[m.ville, f('pays'), f('secteur_id')].filter(x => x && x !== '—').join(' · ')}</p></div>
        <div className="actions">
          {ROW_ACTIONS.members.filter(a => a.show(m)).map(a => <button key={a.action} className="btn" onClick={() => act(a.action, a.confirm)}>{a.label}</button>)}
          <button className="btn cta" onClick={() => setEditing(true)}>Modifier</button>
        </div>
      </div>
      {error && <div className="err">{error}</div>}
      {msg && <div className="chip c-green" style={{ alignSelf: 'flex-start', whiteSpace: 'normal' }}>{msg}</div>}
      <div className="grid g21">
        <div className="card">
          <h2>Informations</h2>
          <dl className="kv">
            {R.fields.filter(x => !['nom', 'ville', 'pays', 'secteur_id'].includes(x.name)).map(x => <Fragment key={x.name}><dt>{x.label}</dt><dd>{x.name === 'statut' ? <span className={`chip ${tone(m.statut)}`}>{display(x, m, refs, t => RESOURCES[t].label)}</span> : display(x, m, refs, t => RESOURCES[t].label)}</dd></Fragment>)}
          </dl>
        </div>
        <div className="card">
          <h2>Conversations</h2>
          {threads.length === 0 ? <p className="small muted">Aucune conversation.</p> : (
            <div className="list">{threads.map(t => (
              <Link key={t.id} href="/messagerie" className="it" style={{ textDecoration: 'none' }}>
                <div className="grow small"><b>{t.sujet}</b><div className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.dernier ?? ''}</div></div>
              </Link>))}</div>
          )}
          <h2>Rapprochements suggérés</h2>
          {sugg.length === 0 ? <p className="small muted">Aucune suggestion pour ce membre.</p> : sugg.map(s => {
            const other = s.a.id === id ? s.b : s.a;
            return (
              <div className="sugg" key={other.id}>
                <div className="row between"><b>{other.nom}</b><span className="score">{s.score} %</span></div>
                <div className="why">{s.why.map(w => <span key={w}>{w}</span>)}</div>
                <button className="btn sm green" style={{ alignSelf: 'flex-start' }} onClick={() => setIntro(s)}>Mettre en relation</button>
              </div>
            );
          })}
        </div>
      </div>
      <ResourcePage key={'c' + v} table="contacts" bare preset={{ member_id: id }} />
      <ResourcePage key={'i' + v} table="invoices" bare preset={{ member_id: id }} />
      <ResourcePage key={'r' + v} table="rendez_vous" bare preset={{ member_id: id }} />
      <ResourcePage key={'e' + v} table="event_registrations" bare preset={{ member_id: id }} />
      {editing && <EditModal table="members" row={m} refs={refs} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
      {intro && <IntroModal a={intro.a as never} b={intro.b as never} why={intro.why} onClose={() => setIntro(null)} onDone={t => { setIntro(null); setMsg(t); load(); }} />}
    </>
  );
}
