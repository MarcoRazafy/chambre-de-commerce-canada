'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, type Row } from '@/lib/format';

type Sugg = { a: Row; b: Row; score: number; why: string[] };
const flag = (p: string) => (p === 'CA' ? 'Canada' : 'Madagascar');

export default function Annuaire() {
  const [members, setMembers] = useState<Row[] | null>(null);
  const [sugg, setSugg] = useState<Sugg[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([api<Row[]>('/api/members'), api<Sugg[]>('/api/suggestions')]);
      setMembers(m.filter(x => ['a_jour', 'retard', 'attente'].includes(x.statut)));
      setSugg(s);
    } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function decide(s: Sugg, statut: 'relation' | 'ignoree') {
    try {
      await api('/api/connections', 'POST', { member_a: s.a.id, member_b: s.b.id, statut });
      load();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <>
      <div className="head"><div><div className="eyebrow">Adhérents</div><h1><em>Annuaire</em></h1>
        <p className="muted">Les membres adhérents et les mises en relation suggérées : ce qu’un membre recherche, rapproché de ce qu’un autre propose.</p></div></div>
      {error && <div className="err">{error}</div>}
      <div className="new-zone">
        <span className="new-label">Suggestions IA</span>
        {sugg.length === 0 ? <p className="small muted">Aucune suggestion. Elles apparaissent quand les besoins d’un membre correspondent aux offres d’un autre.</p> : (
          <div className="grid g2">
            {sugg.map(s => (
              <div className="sugg" key={s.a.id + '-' + s.b.id}>
                <div className="pair">
                  <div className="who"><div><b>{s.a.nom}</b><span className="small muted">{flag(s.a.pays)}</span></div></div>
                  <span className="score">{s.score} %</span>
                  <div className="who"><div><b>{s.b.nom}</b><span className="small muted">{flag(s.b.pays)}</span></div></div>
                </div>
                <div className="why">{s.why.map(w => <span key={w}>{w}</span>)}</div>
                <div className="row">
                  <button className="btn sm green" onClick={() => decide(s, 'relation')}>Mettre en relation</button>
                  <button className="btn sm ghost" onClick={() => decide(s, 'ignoree')}>Ignorer</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {members?.length === 0 && <div className="card"><div className="empty">Aucun membre adhérent pour l’instant.</div></div>}
      <div className="mgrid">
        {members?.map(m => (
          <div className="card mcard" key={m.id}>
            <div><h3>{m.nom}</h3><p className="small muted">{[m.ville, flag(m.pays)].filter(Boolean).join(', ')}</p></div>
            {m.description && <p className="small">{m.description}</p>}
            {m.offres.length > 0 && <div className="tags">{m.offres.map((o: string) => <span className="tag" key={o}>{o}</span>)}</div>}
          </div>
        ))}
      </div>
    </>
  );
}
