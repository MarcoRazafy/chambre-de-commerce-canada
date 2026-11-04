'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, imageUrl, type Row } from '@/lib/format';
import { runAction } from '@/lib/ui-actions';
import { toast } from '@/lib/toast';
import Avatar from './Avatar';
import Icon from './Icon';
import IntroModal from './IntroModal';

type Flow = { tag: string; from: number; to: number };
type Sugg = { a: Row; b: Row; score: number; why: string[]; flows: Flow[]; shared: string[]; bridge: boolean };
const level = (s: number) => (s >= 90 ? 'Excellente' : s >= 75 ? 'Très bonne' : 'Bonne');
const flag = (p: string) => (p === 'CA' ? 'Canada' : 'Madagascar');
// « TOLIARA », « antsirabe » → « Toliara », « Antsirabe »
const cap = (v: string | null) => !v ? '' : (v === v.toUpperCase() || v === v.toLowerCase() ? v.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : v);
const isNew = (d: string | null) => !!d && Date.now() - new Date(d).getTime() < 45 * 864e5;

// Une ligne « Propose » ou « Recherche » : deux étiquettes au plus sur une seule ligne, « +N » pour le reste
function Chips({ label, items, need }: { label: string; items: string[]; need?: boolean }) {
  return (
    <div className="dcard-row">
      <span className="dcard-k">{label}</span>
      <span className="dcard-chips" title={items.join(' · ')}>
        {items.slice(0, 2).map(t => <span key={t} className={`dchip${need ? ' need' : ''}`}>{t}</span>)}
        {items.length > 2 && <span className={`dchip more${need ? ' need' : ''}`} aria-label={`et ${items.length - 2} de plus`}>+{items.length - 2}</span>}
      </span>
    </div>
  );
}

export default function Annuaire() {
  const [members, setMembers] = useState<Row[] | null>(null);
  const [sugg, setSugg] = useState<Sugg[]>([]);
  const [intro, setIntro] = useState<Sugg | null>(null);
  const [term, setTerm] = useState('');
  const [nSugg, setNSugg] = useState(6);
  const [pays, setPays] = useState('');
  const [secteur, setSecteur] = useState('');
  const [secteurs, setSecteurs] = useState<Record<number, string>>({});
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [m, s, sect] = await Promise.all([api<Row[]>('/api/members'), api<Sugg[]>('/api/suggestions'), api<Row[]>('/api/secteurs')]);
      setSecteurs(Object.fromEntries(sect.map(x => [x.id, x.nom])));
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

  const used = [...new Set((members ?? []).map(m => m.secteur_id).filter(Boolean))].sort((a, b) => (secteurs[a] ?? '').localeCompare(secteurs[b] ?? '', 'fr'));
  const shown = (members ?? []).filter(m => (!pays || m.pays === pays) && (!secteur || String(m.secteur_id) === secteur)).filter(m => !term || [m.nom, m.ville, m.activite, m.description, m.recherche, ...m.offres, ...m.besoins].join(' ').toLowerCase().includes(term.toLowerCase()));
  return (
    <>
      <div className="head page-tools">
        <div className="actions"><Link className="btn" href="/mises-en-relation">Mises en relation</Link></div></div>
      {error && <div className="err">{error}</div>}
      <div className="new-zone">
        <div className="row between"><span className="new-label">Rapprochements suggérés{sugg.length > 0 && ` · ${sugg.length}`}</span>
          {sugg.length > 0 && <span className="small muted">Calculés à partir des besoins et des offres de chaque membre</span>}</div>
        {sugg.length === 0 ? <p className="small muted">Pas de suggestion pour l’instant. Remplissez les besoins et les offres des membres pour en voir apparaître.</p> : (
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
        {ordered.length > nSugg && <button type="button" className="btn sm" onClick={() => setNSugg(n => n + 6)}>Voir d’autres suggestions ({ordered.length - nSugg})</button>}
      </div>
      {(members?.length ?? 0) > 0 && (
        <div className="dir-tools">
          <label className="search-inp dir-search"><Icon name="search" size={16} />
            <input className="inp" placeholder="Rechercher un membre, un produit, un besoin…" aria-label="Rechercher dans l’annuaire" value={term} onChange={e => setTerm(e.target.value)} /></label>
          <div className="seg" role="group" aria-label="Pays">
            {[['', 'Tous'], ['MG', 'Madagascar'], ['CA', 'Canada']].map(([v, l]) => <button type="button" key={v} className={pays === v ? 'on' : ''} aria-pressed={pays === v} onClick={() => setPays(v)}>{l}</button>)}
          </div>
          <select className="inp dir-sector" aria-label="Secteur" value={secteur} onChange={e => setSecteur(e.target.value)}>
            <option value="">Tous les secteurs</option>
            {used.map(id => <option key={id} value={id}>{secteurs[id]}</option>)}
          </select>
          <span className="small muted dir-count">{shown.length} membre{shown.length > 1 ? 's' : ''}</span>
        </div>
      )}
      {members?.length === 0 && <div className="card"><div className="empty">Aucun membre adhérent pour l’instant.</div></div>}
      {members && members.length > 0 && shown.length === 0 && <div className="card empty-state"><b>Aucun membre ne correspond</b>
        <button className="btn sm" onClick={() => { setTerm(''); setPays(''); setSecteur(''); }}>Effacer les filtres</button></div>}
      <div className="dgrid">
        {shown.map(m => {
          const cover = m.couverture_deposee ? `/api/avatar/cover/${m.id}` : imageUrl(m.couverture_url);
          const desc = m.activite || m.description;
          return (
            // Carte de l'annuaire : couverture (ou logo flouté), logo carré qui la chevauche, secteur, nom, lieu, accroche, puis ce que le membre propose et recherche
            <Link href={`/membres/${m.id}`} className="dcard" key={m.id} aria-label={`${m.nom}, ${secteurs[m.secteur_id] ?? ''} — voir la fiche`}>
              <div className={`dcard-cover${cover ? '' : ' blurred'}`}>
                {cover ? <img src={cover} alt="" loading="lazy" referrerPolicy="no-referrer" style={!m.couverture_deposee && m.couverture_y != null ? { objectPosition: `50% ${m.couverture_y}%` } : undefined} />
                  : <img className="cover-blur" src={`/api/avatar/member/${m.id}`} alt="" loading="lazy" />}
                <span className="dcard-pill"><Icon name="pin" size={12} />{flag(m.pays)}</span>
                {isNew(m.membre_depuis) && <span className="dcard-pill new">Nouveau</span>}
              </div>
              <div className="dcard-head">
                <span className="dcard-logo"><Avatar kind="member" id={m.id} size={60} nom={m.nom} /></span>
                <span className="dcard-go" aria-hidden="true"><Icon name="back" size={16} /></span>
              </div>
              <div className="dcard-body">
                {secteurs[m.secteur_id] && <span className="dcard-sector">{secteurs[m.secteur_id]}</span>}
                <h3 className="dcard-name">{m.nom}</h3>
                {m.ville && <p className="dcard-meta">{cap(m.ville)}</p>}
                {desc && <p className="dcard-desc">{desc}</p>}
              </div>
              {(m.offres.length > 0 || m.besoins.length > 0) && (
                <div className="dcard-foot">
                  {m.offres.length > 0 && <Chips label="Propose" items={m.offres} />}
                  {m.besoins.length > 0 && <Chips label="Recherche" items={m.besoins} need />}
                </div>
              )}
            </Link>
          );
        })}
      </div>
      {intro && <IntroModal a={intro.a as never} b={intro.b as never} why={intro.why} onClose={() => setIntro(null)} onDone={t => { setIntro(null); toast(t); load(); }} />}
    </>
  );
}
