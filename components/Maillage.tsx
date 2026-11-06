'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/format';
import { toast } from '@/lib/toast';
import Avatar from './Avatar';
import Icon from './Icon';
import IntroModal from './IntroModal';

type Flow = { tag: string; from: number; to: number };
export type Sugg = { a: { id: number; nom: string; pays: string }; b: { id: number; nom: string; pays: string }; score: number; why: string[]; flows: Flow[]; shared: string[]; bridge: boolean };
const level = (s: number) => (s >= 90 ? 'Excellente' : s >= 75 ? 'Très bonne' : 'Bonne');
const flag = (p: string) => (p === 'CA' ? 'Canada' : 'Madagascar');

// Rapprochements pertinents : seulement quand un membre a exprimé un besoin qu'un autre membre propose
export default function Maillage({ onCount }: { onCount?: (n: number) => void }) {
  const [sugg, setSugg] = useState<Sugg[] | null>(null);
  const [intro, setIntro] = useState<Sugg | null>(null);
  const [nSugg, setNSugg] = useState(6);
  const [error, setError] = useState('');
  const load = useCallback(() => api<Sugg[]>('/api/suggestions').then(s => { setSugg(s); onCount?.(s.length); setError(''); }).catch(e => setError(e.message)), [onCount]);
  useEffect(() => { load(); }, [load]);

  async function ignore(s: Sugg) {
    try {
      await api('/api/connections', 'POST', { member_a: Math.min(s.a.id, s.b.id), member_b: Math.max(s.a.id, s.b.id), statut: 'ignoree' });
      toast('Rapprochement écarté : il ne sera plus proposé.');
      load();
    } catch (e) { setError((e as Error).message); }
  }

  // Les meilleures suggestions d'abord, en variant les membres : chacun apparaît au plus une fois par série de 6
  const ordered = (() => {
    const rest = [...(sugg ?? [])], out: Sugg[] = [];
    while (rest.length) {
      const seen = new Set<number>();
      for (let i = 0; i < rest.length;) {
        const s = rest[i];
        if (seen.has(s.a.id) || seen.has(s.b.id) || seen.size >= 12) { i++; continue; }
        seen.add(s.a.id); seen.add(s.b.id); out.push(s); rest.splice(i, 1);
      }
    }
    return out;
  })();

  if (sugg === null && !error) return <div className="card"><div className="skeleton"><span /><span /><span /></div></div>;
  return (
    <>
      {error && <div className="err">{error}</div>}
      <section className="new-zone">
        <div className="row between"><span className="new-label">Rapprochements pertinents{sugg && sugg.length > 0 && ` · ${sugg.length}`}</span>
          {sugg && sugg.length > 0 && <span className="small muted">Seulement quand un membre a exprimé un besoin qu’un autre membre propose. 3 rapprochements au plus par membre.</span>}</div>
        {sugg !== null && sugg.length === 0 ? <p className="small muted">Pas de rapprochement pertinent pour l’instant. Renseignez ce que chaque membre recherche et propose pour en voir apparaître.</p> : (
          <div className="mgrid2">
            {ordered.slice(0, nSugg).map(s => {
              const nom = (id: number) => (id === s.a.id ? s.a.nom : s.b.nom);
              return (
                // Suggestion : les deux membres reliés par le score, puis ce que l'un propose à l'autre
                <article className="match" key={s.a.id + '-' + s.b.id}>
                  <div className="match-pair">
                    {[s.a, s.b].map((p, i) => (
                      <Link key={p.id} href={`/membres/${p.id}`} className={`match-who${i ? ' right' : ''}`}>
                        <Avatar kind="member" id={p.id} size={48} nom={p.nom} />
                        <span className="match-txt"><b>{p.nom}</b><span><Icon name="pin" size={12} />{flag(p.pays)}</span></span>
                      </Link>
                    ))}
                    <span className="match-score" style={{ '--p': s.score } as React.CSSProperties} aria-label={`Correspondance ${s.score} %`}>
                      <b>{s.score}<small>%</small></b>
                    </span>
                  </div>
                  <div className="match-meta">
                    <span className="match-level">{level(s.score)} correspondance</span>
                    {s.bridge && <span className="match-bridge">Pont Canada – Madagascar</span>}
                  </div>
                  <ul className="match-flows">
                    {s.flows.slice(0, 3).map(f => (
                      <li key={f.tag + f.from}>
                        <span className="match-tag">{f.tag}</span>
                        <span className="match-dir"><span>{nom(f.from)}</span><Icon name="back" size={12} /><span>{nom(f.to)}</span></span>
                      </li>
                    ))}
                    {s.flows.length > 3 && <li className="match-more">+ {s.flows.length - 3} autre{s.flows.length > 4 ? 's' : ''} échange{s.flows.length > 4 ? 's' : ''} possible{s.flows.length > 4 ? 's' : ''}</li>}
                    {s.shared.length > 0 && <li className="match-shared">Même secteur : {s.shared.join(', ')}</li>}
                  </ul>
                  <div className="match-actions">
                    <button className="btn sm cta" onClick={() => setIntro(s)}><Icon name="spark" size={16} />Mettre en relation</button>
                    <button className="btn sm ghost" onClick={() => ignore(s)}>Ignorer</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {ordered.length > nSugg && <button type="button" className="btn sm" onClick={() => setNSugg(n => n + 6)}>Voir d’autres rapprochements ({ordered.length - nSugg})</button>}
      </section>
      {intro && <IntroModal a={intro.a as never} b={intro.b as never} why={intro.why} onClose={() => setIntro(null)} onDone={t => { setIntro(null); toast(t); load(); }} />}
    </>
  );
}
