'use client';
import Link from 'next/link';
import { Pager, usePage } from './Pagination';
import { useCallback, useEffect, useState } from 'react';
import { api, imageUrl, type Row } from '@/lib/format';
import Avatar from './Avatar';
import Icon from './Icon';

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
  const [term, setTerm] = useState('');
  const [pays, setPays] = useState('');
  const [secteur, setSecteur] = useState('');
  const [secteurs, setSecteurs] = useState<Record<number, string>>({});
  const [vign, setVign] = useState<Record<number, { total: number; produits: { label: string; photo: number | null }[] }>>({});
  useEffect(() => { api<Row[]>('/api/membres/vignettes').then(l => setVign(Object.fromEntries(l.map(x => [x.member_id, x])))).catch(() => {}); }, []);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [m, sect] = await Promise.all([api<Row[]>('/api/members'), api<Row[]>('/api/secteurs')]);
      setSecteurs(Object.fromEntries(sect.map(x => [x.id, x.nom])));
      setMembers(m.filter(x => ['a_jour', 'retard', 'attente'].includes(x.statut)));
    } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  // L'ancien onglet « Maillage » est devenu la page Mises en relation
  useEffect(() => { if (new URLSearchParams(window.location.search).get('onglet') === 'maillage') window.location.replace('/mises-en-relation'); }, []);

  const used = [...new Set((members ?? []).map(m => m.secteur_id).filter(Boolean))].sort((a, b) => (secteurs[a] ?? '').localeCompare(secteurs[b] ?? '', 'fr'));
  const shown = (members ?? []).filter(m => (!pays || m.pays === pays) && (!secteur || String(m.secteur_id) === secteur)).filter(m => !term || [m.nom, m.ville, m.activite, m.description, m.recherche, ...m.offres, ...m.besoins].join(' ').toLowerCase().includes(term.toLowerCase()));
  const pg = usePage(shown, [term, pays, secteur]);
  return (
    <>
      {error && <div className="err">{error}</div>}
      <div className="head og-head"><div><h1>Annuaire</h1><p className="muted">{members ? `${members.length} membres adhérents · ce que chacun propose et recherche` : 'Les membres adhérents'}</p></div>
        <div className="actions"><Link className="btn" href="/mises-en-relation"><Icon name="spark" size={16} /> Mises en relation</Link></div></div>
      <div>
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
        {pg.items.map(m => {
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
                {/* Catalogue du membre : 4 vignettes au plus (photo de chaque offre), sinon les titres */}
                {vign[m.id] && (() => {
                  const v = vign[m.id], photos = v.produits.filter(p => p.photo);
                  return photos.length > 0 ? (
                    <div className="dcard-prods" aria-label={`${v.total} produit(s) et service(s)`}>
                      {photos.slice(0, 4).map((p, i) => (
                        <span key={i} className="dcard-prod" title={p.label}><img src={`/api/produits/photos/${p.photo}`} alt="" loading="lazy" />
                          {i === 3 && v.total > 4 && <b>+{v.total - 4}</b>}</span>
                      ))}
                    </div>
                  ) : <div className="dcard-chips">{v.produits.slice(0, 3).map(p => <span key={p.label} className="dchip">{p.label}</span>)}</div>;
                })()}
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
      <Pager p={pg} quoi="membres" />
      </div>
    </>
  );
}
