'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, imageUrl, type Row } from '@/lib/format';
import { runAction } from '@/lib/ui-actions';
import { toast } from '@/lib/toast';
import Avatar from './Avatar';
import IntroModal from './IntroModal';

type Sugg = { a: Row; b: Row; score: number; why: string[] };
const flag = (p: string) => (p === 'CA' ? 'Canada' : 'Madagascar');

export default function Annuaire() {
  const [members, setMembers] = useState<Row[] | null>(null);
  const [sugg, setSugg] = useState<Sugg[]>([]);
  const [intro, setIntro] = useState<Sugg | null>(null);
  const [term, setTerm] = useState('');
  const [nSugg, setNSugg] = useState(6);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([api<Row[]>('/api/members'), api<Sugg[]>('/api/suggestions')]);
      setMembers(m.filter(x => ['a_jour', 'retard', 'attente'].includes(x.statut)));
      setSugg(s);
    } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function ignore(s: Sugg) {
    try {
      await api('/api/connections', 'POST', { member_a: Math.min(s.a.id, s.b.id), member_b: Math.max(s.a.id, s.b.id), statut: 'ignoree' });
      load();
    } catch (e) { setError((e as Error).message); }
  }

  // Les meilleures suggestions d'abord, en variant les membres : chacun apparaît au plus une fois par série de 6
  const ordered = (() => {
    const rest = [...sugg], out: Sugg[] = [];
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

  const shown = (members ?? []).filter(m => !term || [m.nom, m.ville, m.activite, m.description, m.recherche, ...m.offres, ...m.besoins].join(' ').toLowerCase().includes(term.toLowerCase()));
  return (
    <>
      <div className="head page-tools">
        <div className="actions"><Link className="btn" href="/mises-en-relation">Mises en relation</Link></div></div>
      {error && <div className="err">{error}</div>}
      <div className="new-zone">
        <div className="row between"><span className="new-label">Rapprochements suggérés{sugg.length > 0 && ` · ${sugg.length}`}</span>
          {sugg.length > 0 && <span className="small muted">Calculés à partir des besoins et des offres de chaque membre</span>}</div>
        {sugg.length === 0 ? <p className="small muted">Pas de suggestion pour l’instant. Remplissez les besoins et les offres des membres pour en voir apparaître.</p> : (
          <div className="grid g2">
            {ordered.slice(0, nSugg).map(s => (
              <div className="sugg" key={s.a.id + '-' + s.b.id}>
                <div className="pair">
                  <div className="who"><div><Link href={`/membres/${s.a.id}`}><b>{s.a.nom}</b></Link><span className="small muted">{flag(s.a.pays)}</span></div></div>
                  <span className="score">{s.score} %</span>
                  <div className="who"><div><Link href={`/membres/${s.b.id}`}><b>{s.b.nom}</b></Link><span className="small muted">{flag(s.b.pays)}</span></div></div>
                </div>
                <div className="why">{s.why.map(w => <span key={w}>{w}</span>)}</div>
                <div className="row">
                  <button className="btn sm green" onClick={() => setIntro(s)}>Mettre en relation</button>
                  <button className="btn sm ghost" onClick={() => ignore(s)}>Ignorer</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {ordered.length > nSugg && <button type="button" className="btn sm" onClick={() => setNSugg(n => n + 6)}>Voir d’autres suggestions ({ordered.length - nSugg})</button>}
      </div>
      {(members?.length ?? 0) > 0 && <input className="inp" placeholder="Rechercher un membre, un produit, un besoin…" aria-label="Rechercher dans l’annuaire" value={term} onChange={e => setTerm(e.target.value)} />}
      {members?.length === 0 && <div className="card"><div className="empty">Aucun membre adhérent pour l’instant.</div></div>}
      <div className="mgrid">
        {shown.map(m => (
          // Carte façon page d'entreprise : couverture, logo qui la chevauche, puis la présentation
          <Link href={`/membres/${m.id}`} className="card mcard" key={m.id} style={{ textDecoration: 'none' }}>
            <div className="mcard-cover">{imageUrl(m.couverture_url) && <img src={imageUrl(m.couverture_url)!} alt="" loading="lazy" referrerPolicy="no-referrer" style={m.couverture_y != null ? { objectPosition: `50% ${m.couverture_y}%` } : undefined} />}</div>
            <div className="mcard-logo"><Avatar kind="member" id={m.id} size={64} nom={m.nom} /></div>
            <div className="mcard-body">
              <div><h3>{m.nom}</h3><p className="small muted">{[m.ville, flag(m.pays)].filter(Boolean).join(', ')}</p></div>
              {(m.activite || m.description) && <p className="small mcard-desc">{m.activite || m.description}</p>}
              {m.offres.length > 0 && <div className="tags">{m.offres.map((o: string) => <span className="tag" key={o}>{o}</span>)}</div>}
              {m.besoins.length > 0 && <p className="small muted">Recherche : {m.besoins.join(', ')}</p>}
            </div>
          </Link>
        ))}
      </div>
      {intro && <IntroModal a={intro.a as never} b={intro.b as never} why={intro.why} onClose={() => setIntro(null)} onDone={t => { setIntro(null); toast(t); load(); }} />}
    </>
  );
}
