'use client';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { RESOURCES } from '@/lib/resources';
import { api, display, imageUrl, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import StatusBadge from '../StatusBadge';
import Avatar, { avatarChanged } from '../Avatar';
import Icon from '../Icon';
import { ROW_ACTIONS, runAction } from '@/lib/ui-actions';
import ResourcePage, { EditModal } from '../ResourcePage';
import IntroModal from '../IntroModal';

type Flow = { tag: string; from: number; to: number };
type Sugg = { a: Row; b: Row; score: number; why: string[]; flows: Flow[] };
const R = RESOURCES.members;
// Champs montrés ailleurs sur la page (en-tête, « À propos », « Propose / Recherche ») : pas répétés dans « Adhésion »
const SHOWN = ['nom', 'ville', 'pays', 'secteur_id', 'statut', 'activite', 'description', 'site_web', 'recherche', 'motivation', 'besoins', 'offres', 'interets', 'logo_url', 'couverture_url', 'couverture_y'];
const cap = (v: string | null) => !v ? '' : (v === v.toUpperCase() || v === v.toLowerCase() ? v.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : v);
const href = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);
const host = (u: string) => u.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

// Dépôt d'image (logo ou couverture) : même adresse que les photos de profil, /api/avatar/<kind>/<id>
async function sendImage(kind: 'member' | 'cover', id: number, f: File) {
  const form = new FormData();
  form.set('file', f);
  const res = await fetch(`/api/avatar/${kind}/${id}`, { method: 'PUT', body: form });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || 'Échec de l’envoi');
  avatarChanged();
}

// Fiche membre : couverture et logo, présentation, ce qu'il propose et recherche, adhésion, suggestions, puis contacts, factures, rendez-vous, inscriptions
export default function MemberDetail({ id }: { id: number }) {
  const [m, setM] = useState<Row | null>(null);
  const [refs, setRefs] = useState<Record<string, Row[]>>({});
  const [threads, setThreads] = useState<Row[]>([]);
  const [sugg, setSugg] = useState<Sugg[]>([]);
  const [nSugg, setNSugg] = useState(4);
  const [intro, setIntro] = useState<Sugg | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [v, setV] = useState(0);        // force le rechargement des tableaux après une action
  const [coverV, setCoverV] = useState(0);
  const coverInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [mm, sect, form, th, sg] = await Promise.all([
        api<Row>(`/api/members/${id}`), api<Row[]>('/api/secteurs'), api<Row[]>('/api/formules'), api<Row[]>(`/api/messagerie?member_id=${id}`), api<Sugg[]>(`/api/suggestions?member=${id}`)]);
      setM(mm);
      setRefs({ secteurs: sect, formules: form });
      setThreads(th);
      setSugg(sg);
      setV(x => x + 1);
    } catch (e) { setError((e as Error).message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function act(action: string, question?: string) {
    if (question && !confirm(question)) return;
    try { toast(await runAction(action, { id })); setError(''); load(); } catch (e) { setError((e as Error).message); }
  }
  async function upload(kind: 'member' | 'cover', f: File) {
    try {
      await sendImage(kind, id, f);
      toast(kind === 'cover' ? 'Couverture mise à jour.' : 'Logo mis à jour.');
      if (kind === 'cover') { setCoverV(Date.now()); load(); }
    } catch (e) { toast((e as Error).message, 'error'); }
  }
  async function removeCover() {
    await fetch(`/api/avatar/cover/${id}`, { method: 'DELETE' });
    load();
  }

  if (!m) return error ? <div className="err">{error}</div> : <div className="card"><div className="skeleton"><span /><span /><span /></div></div>;
  const field = (name: string) => R.fields.find(x => x.name === name)!;
  const f = (name: string) => display(field(name), m, refs, t => RESOURCES[t].label);
  const secteur = f('secteur_id');
  const cover = m.couverture_deposee ? `/api/avatar/cover/${id}?v=${coverV}` : imageUrl(m.couverture_url);
  const lieu = [cap(m.ville), f('pays')].filter(x => x && x !== '—').join(', ');
  const other = (s: Sugg) => (s.a.id === id ? s.b : s.a);

  return (
    <>
      {error && <div className="err">{error}</div>}

      {/* En-tête : couverture (déposée, adresse, ou logo flouté), logo qui la chevauche, identité et actions */}
      <section className="mhero card">
        <div className={`mhero-cover${cover ? '' : ' blurred'}`}>
          {cover ? <img src={cover} alt="" referrerPolicy="no-referrer" style={!m.couverture_deposee && m.couverture_y != null ? { objectPosition: `50% ${m.couverture_y}%` } : undefined} />
            : <img className="cover-blur" src={`/api/avatar/member/${id}`} alt="" />}
          <div className="mhero-cover-tools">
            <button type="button" className="mhero-glass" onClick={() => coverInput.current?.click()}><Icon name="image" size={16} />{cover ? 'Changer la couverture' : 'Ajouter une couverture'}</button>
            {m.couverture_deposee && <button type="button" className="mhero-glass icon" aria-label="Retirer la couverture" onClick={removeCover}><Icon name="trash" size={16} /></button>}
          </div>
          <input ref={coverInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { const x = e.target.files?.[0]; if (x) upload('cover', x); e.target.value = ''; }} />
        </div>
        <div className="mhero-main">
          <div className="mhero-logo">
            <Avatar kind="member" id={id} size={112} nom={m.nom} />
            <button type="button" className="mhero-logo-btn" aria-label="Changer le logo" title="Changer le logo" onClick={() => logoInput.current?.click()}><Icon name="edit" size={14} /></button>
            <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e => { const x = e.target.files?.[0]; if (x) upload('member', x); e.target.value = ''; }} />
          </div>
          <div className="mhero-id">
            {secteur && secteur !== '—' && <span className="dcard-sector">{secteur}</span>}
            <h1>{m.nom}</h1>
            <div className="mhero-meta">
              <StatusBadge value={m.statut} label={f('statut')} />
              {lieu && <span><Icon name="pin" size={15} />{lieu}</span>}
              {m.membre_depuis && <span><Icon name="cal" size={15} />Membre depuis {f('membre_depuis')}</span>}
              {m.site_web && <a href={href(m.site_web)} target="_blank" rel="noopener noreferrer"><Icon name="share" size={15} />{host(m.site_web)}</a>}
            </div>
          </div>
          <div className="mhero-actions">
            <Link className="btn" href={`/messagerie?a=member:${id}&nom=${encodeURIComponent(m.nom)}`}><Icon name="chat" size={16} /> Écrire</Link>
            {ROW_ACTIONS.members.filter(a => a.show(m)).map(a => <button key={a.action} className="btn" onClick={() => act(a.action, a.confirm)}>{a.label}</button>)}
            <button className="btn cta" onClick={() => setEditing(true)}><Icon name="edit" size={16} /> Modifier</button>
          </div>
        </div>
      </section>

      <div className="mdetail">
        <div className="mdetail-main">
          {(m.activite || m.description || m.recherche || m.motivation) && (
            <section className="card">
              <h2>À propos</h2>
              {m.activite && <p className="mabout-lead">{m.activite}</p>}
              {m.description && m.description !== m.activite && <p className="mabout-text">{m.description}</p>}
              {m.recherche && <div className="mabout-block"><h3>Ce que l’entreprise recherche</h3><p className="mabout-text">{m.recherche}</p></div>}
              {m.motivation && <div className="mabout-block"><h3>Motivation à l’adhésion</h3><p className="mabout-text">{m.motivation}</p></div>}
            </section>
          )}

          {(m.offres.length > 0 || m.besoins.length > 0 || m.interets.length > 0) && (
            <section className="card">
              <h2>Propose &amp; recherche</h2>
              <div className="mtags">
                {m.offres.length > 0 && <div><span className="dcard-k">Propose</span><div className="mtags-list">{m.offres.map((t: string) => <span key={t} className="dchip">{t}</span>)}</div></div>}
                {m.besoins.length > 0 && <div><span className="dcard-k">Recherche</span><div className="mtags-list">{m.besoins.map((t: string) => <span key={t} className="dchip need">{t}</span>)}</div></div>}
                {m.interets.length > 0 && <div><span className="dcard-k">Intérêts</span><div className="mtags-list">{m.interets.map((t: string) => <span key={t} className="dchip">{t}</span>)}</div></div>}
              </div>
            </section>
          )}

          <section className="card">
            <h2>Adhésion</h2>
            <dl className="kv mkv">
              {R.fields.filter(x => !SHOWN.includes(x.name)).map(x => <Fragment key={x.name}><dt>{x.label}</dt><dd>{display(x, m, refs, t => RESOURCES[t].label)}</dd></Fragment>)}
            </dl>
          </section>
        </div>

        <aside className="mdetail-side">
          <section className="card">
            <div className="row between"><h2>Rapprochements suggérés</h2>{sugg.length > 0 && <span className="chip c-green">{sugg.length}</span>}</div>
            {sugg.length === 0 ? <p className="small muted">Aucune suggestion pour ce membre. Renseignez ce qu’il propose et recherche pour en obtenir.</p> : (
              <ul className="msugg-list">
                {sugg.slice(0, nSugg).map(s => {
                  const o = other(s);
                  return (
                    <li key={o.id} className="msugg">
                      <div className="msugg-h">
                        <Link href={`/membres/${o.id}`} className="msugg-who"><Avatar kind="member" id={o.id} size={40} nom={o.nom} /><b>{o.nom}</b></Link>
                        <span className="match-score sm" style={{ '--p': s.score } as React.CSSProperties} aria-label={`Correspondance ${s.score} %`}><b>{s.score}<small>%</small></b></span>
                      </div>
                      <ul className="msugg-flows">
                        {(s.flows ?? []).slice(0, 3).map(fl => (
                          <li key={fl.tag + fl.from} className={fl.from === id ? 'give' : 'get'}>
                            <span className="msugg-dir"><Icon name="back" size={12} />{fl.from === id ? 'Apporte' : 'Reçoit'}</span>{fl.tag}
                          </li>
                        ))}
                      </ul>
                      <button className="btn sm cta" onClick={() => setIntro(s)}><Icon name="spark" size={16} />Mettre en relation</button>
                    </li>
                  );
                })}
              </ul>
            )}
            {sugg.length > nSugg && <button type="button" className="btn sm ghost" onClick={() => setNSugg(n => n + 4)}>Voir {Math.min(4, sugg.length - nSugg)} autres suggestions ({sugg.length - nSugg} restantes)</button>}
          </section>

          <section className="card">
            <h2>Conversations</h2>
            {threads.length === 0 ? <p className="small muted">Aucune conversation avec ce membre.</p> : (
              <div className="list">{threads.map(t => (
                <Link key={t.id} href={`/messagerie?c=${t.id}`} className="it" style={{ textDecoration: 'none' }}>
                  <div className="grow small"><b>{t.sujet || t.titre}</b><div className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.dernier ?? ''}</div></div>
                </Link>))}</div>
            )}
          </section>
        </aside>
      </div>

      <ResourcePage key={'c' + v} table="contacts" bare preset={{ member_id: id }} />
      <ResourcePage key={'i' + v} table="invoices" bare preset={{ member_id: id }} />
      <ResourcePage key={'r' + v} table="rendez_vous" bare preset={{ member_id: id }} />
      <ResourcePage key={'e' + v} table="event_registrations" bare preset={{ member_id: id }} />
      {editing && <EditModal table="members" row={m} refs={refs} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
      {intro && <IntroModal a={intro.a as never} b={intro.b as never} why={intro.why} onClose={() => setIntro(null)} onDone={t => { setIntro(null); toast(t); load(); }} />}
    </>
  );
}
