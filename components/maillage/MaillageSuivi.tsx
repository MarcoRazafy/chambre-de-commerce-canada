'use client';
import Link from 'next/link';
import { Pager, usePage } from '../Pagination';
import { useCallback, useEffect, useState } from 'react';
import { api, relative, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import { QUESTIONS, SECTIONS, VISIBILITES } from '@/lib/maillage';
import Avatar from '../Avatar';
import Icon from '../Icon';
import { copierLien } from './MaillageMembre';

type Filtre = 'tous' | 'complets' | 'cours' | 'jamais';
const etat = (m: Row): Filtre => (m.pct === 100 ? 'complets' : m.commence ? 'cours' : 'jamais');

// Onglet « Questionnaire de maillage » de Mises en relation : qui a répondu, liens à envoyer, les questions
export default function MaillageSuivi() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [term, setTerm] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(() => api<Row[]>('/api/maillage').then(setRows).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function copier(m: Row) {
    try { await copierLien(m.id); load(); } catch (e) { toast((e as Error).message, 'error'); }
  }

  const tous = rows ?? [];
  const n = (f: Filtre) => tous.filter(m => f === 'tous' || etat(m) === f).length;
  const shown = tous.filter(m => (filtre === 'tous' || etat(m) === filtre) && (!term || String(m.nom).toLowerCase().includes(term.toLowerCase())))
    .sort((a, b) => b.pct - a.pct || String(a.nom).localeCompare(String(b.nom), 'fr'));
  const pg = usePage(shown, [filtre, term]);
  if (!rows) return error ? <div className="err">{error}</div> : <div className="card"><div className="skeleton"><span /><span /><span /></div></div>;
  return (
    <>
      <div className="grid g3">
        {([['complets', 'Questionnaires complets', 'participent aux mises en relation'], ['cours', 'En cours', 'questions ★ manquantes'], ['jamais', 'Pas commencés', 'lien à envoyer']] as const).map(([f, l, d]) => (
          <button key={f} type="button" className={`card kpi4${filtre === f ? ' sel' : ''}`} onClick={() => setFiltre(filtre === f ? 'tous' : f)} aria-pressed={filtre === f}>
            <span className="eyebrow">{l}</span><span className="kpi4-v num">{n(f)}{f === 'complets' && <small className="muted"> / {rows.length}</small>}</span><span className="small muted">{d}</span></button>
        ))}
      </div>

      <div className="grid g21 mq-suivi">
        <section className="card mtbl-card">
          <div className="row between mq-suivi-h">
            <div className="row" style={{ gap: 6 }}>
              {([['tous', 'Tous'], ['complets', 'Complets'], ['cours', 'En cours'], ['jamais', 'Pas commencés']] as const).map(([k, l]) =>
                <button key={k} type="button" className={`fchip${filtre === k ? ' on' : ''}`} aria-pressed={filtre === k} onClick={() => setFiltre(k)}>{l} · {n(k)}</button>)}
            </div>
            <input className="inp mq-cherche" placeholder="Rechercher un membre…" aria-label="Rechercher un membre" value={term} onChange={e => setTerm(e.target.value)} />
          </div>
          <div className="list mq-liste">
            {pg.items.map(m => (
              <div key={m.id} className="it">
                <Avatar kind="member" id={m.id} size={32} nom={m.nom} />
                <div className="grow">
                  <Link href={`/membres/${m.id}?onglet=maillage`} className="mq-nom"><b className="small">{m.nom}</b></Link>
                  <div className="bar mq-bar"><i className={m.pct === 100 ? 'ok' : ''} style={{ width: `${m.pct}%` }} /></div>
                  <span className="small muted">{m.pct === 100 ? 'Complet · participe au maillage' : m.commence ? `${m.faites} sur ${m.total} questions ★` : 'Pas commencé'}
                    {m.maj_le && m.commence ? ` · ${relative(m.maj_le)}` : ''}{m.rempli_par && m.commence ? ` · ${m.rempli_par}` : ''}</span>
                </div>
                <button type="button" className="btn sm" onClick={() => copier(m)} title="Copier le lien personnel du membre"><Icon name="copy" size={14} /> {m.lien ? 'Copier le lien' : 'Créer le lien'}</button>
                <Link className="btn sm ghost" href={`/membres/${m.id}?onglet=maillage`}>Remplir</Link>
              </div>
            ))}
            {!shown.length && <p className="small muted">Aucun membre dans cette catégorie.</p>}
          </div>
          <Pager p={pg} quoi="membres" />
        </section>

        <section className="card">
          <div className="card-h"><h2>Le questionnaire</h2><span className="small muted">≈ 15 min · {QUESTIONS.length} questions ★</span></div>
          <p className="small">Chaque membre décrit ce qu’il offre et ce qu’il cherche. Il répond par son <b>lien personnel</b>, sans compte ; l’équipe peut aussi remplir avec lui depuis sa fiche (onglet « Maillage »).</p>
          <div className="qsects">
            {SECTIONS.map(s => (
              <details key={s.id} className="qsect"><summary><span className="qletter">{s.id}</span><span className="grow"><b>{s.titre}</b></span><span className="small muted">{QUESTIONS.filter(q => q.section === s.id).length} q.</span></summary>
                <ul>{QUESTIONS.filter(q => q.section === s.id).map(q => <li key={q.id}><b>{q.id}</b> · {q.titre}</li>)}</ul></details>
            ))}
          </div>
          <div className="qconf"><b className="small">Confidentialité, section par section</b>
            <div className="row small">{VISIBILITES.map(([k, l], i) => <span key={k} className={`pchip ${['ok', 'info', 'off'][i]}`}>{l}</span>)}</div></div>
          <p className="small muted">L’envoi du lien par courriel et les relances arriveront avec la configuration de l’envoi de courriels ; en attendant, copiez le lien et envoyez-le par WhatsApp ou par la Messagerie.</p>
        </section>
      </div>
    </>
  );
}
