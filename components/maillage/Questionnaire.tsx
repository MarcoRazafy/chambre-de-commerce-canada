'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { QUESTIONS, SECTIONS, VISIBILITES, estRepondu, progression, type Question, type Reponses, type SectionId, type Visibilite } from '@/lib/maillage';
import Icon from '../Icon';

export type Donnees = { membre: { id: number; nom: string }; secteurs: { id: number; nom: string }[]; reponses: Reponses };
type Obj = Record<string, any>;

// Liste de mots-clés : on tape, Entrée ou virgule ajoute le mot
function Mots({ id, valeurs, onChange, placeholder }: { id: string; valeurs: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [t, setT] = useState('');
  const ajouter = () => { const m = t.trim().replace(/,$/, ''); if (m && !valeurs.includes(m)) onChange([...valeurs, m]); setT(''); };
  return (
    <div className="mq-mots">
      {valeurs.map(m => <span key={m} className="mq-mot">{m}<button type="button" aria-label={`Retirer ${m}`} onClick={() => onChange(valeurs.filter(x => x !== m))}>×</button></span>)}
      <input id={id} className="mq-mots-in" value={t} placeholder={valeurs.length ? 'Ajouter…' : placeholder} onChange={e => setT(e.target.value)} onBlur={ajouter}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); ajouter(); } else if (e.key === 'Backspace' && !t && valeurs.length) onChange(valeurs.slice(0, -1)); }} />
    </div>
  );
}

// Le questionnaire de maillage, section par section, enregistré au fur et à mesure.
// mode « membre » : page du lien personnel ; mode « equipe » : fiche membre, rempli avec le membre ou à sa place.
export default function Questionnaire({ data, enregistrer, mode, onTermine }: {
  data: Donnees; enregistrer: (patch: Reponses) => Promise<unknown>; mode: 'membre' | 'equipe'; onTermine?: () => void;
}) {
  const [r, setR] = useState<Reponses>(data.reponses);
  const [etape, setEtape] = useState(0);
  const [etat, setEtat] = useState<'' | 'enreg' | 'ok' | 'err'>('');
  const [erreur, setErreur] = useState('');
  const attente = useRef<Reponses>({});
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const haut = useRef<HTMLDivElement>(null);

  const envoyer = useCallback(async () => {
    if (minuteur.current) { clearTimeout(minuteur.current); minuteur.current = null; }
    const patch = attente.current;
    if (!Object.keys(patch).length) return;
    attente.current = {};
    setEtat('enreg');
    try { await enregistrer(patch); setEtat('ok'); setErreur(''); }
    catch (e) { attente.current = { ...patch, ...attente.current }; setEtat('err'); setErreur((e as Error).message); }
  }, [enregistrer]);
  // Enregistre ce qui reste en quittant la page
  useEffect(() => {
    const avant = () => { if (Object.keys(attente.current).length) void envoyer(); };
    window.addEventListener('beforeunload', avant);
    return () => { window.removeEventListener('beforeunload', avant); avant(); };
  }, [envoyer]);

  const changer = (id: string, v: unknown) => {
    setR(x => ({ ...x, [id]: v }));
    attente.current[id] = v;
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(envoyer, 700);
  };
  const aller = (i: number) => { void envoyer(); setEtape(i); haut.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  const p = progression(r);
  const sec = SECTIONS[etape];
  const qs = QUESTIONS.filter(q => q.section === sec.id);
  const faitSec = (s: SectionId) => QUESTIONS.filter(q => q.section === s).every(q => estRepondu(q, r[q.id]));

  function champ(q: Question) {
    const v = r[q.id], o: Obj = v && typeof v === 'object' && !Array.isArray(v) ? v as Obj : {};
    const fid = (k = '') => `mq-${q.id}${k ? '-' + k : ''}`;
    switch (q.type) {
      case 'texte':
        return <textarea id={fid()} className="inp mq-texte" value={String(v ?? '')} placeholder={q.placeholder} onChange={e => changer(q.id, e.target.value)} />;
      case 'champs':
        return (
          <div className="mq-champs">
            {q.champs!.map(c => (
              <div key={c.k} className={`field${c.type === 'textarea' ? ' mq-large' : ''}`}><label htmlFor={fid(c.k)}>{c.label}{c.requis && ' *'}</label>
                {c.type === 'textarea'
                  ? <textarea id={fid(c.k)} className="inp mq-texte" value={String(o[c.k] ?? '')} placeholder={c.placeholder} onChange={e => changer(q.id, { ...o, [c.k]: e.target.value })} />
                  : <input id={fid(c.k)} className="inp" type={c.type ?? 'text'} value={String(o[c.k] ?? '')} placeholder={c.placeholder} onChange={e => changer(q.id, { ...o, [c.k]: e.target.value })} />}
              </div>
            ))}
          </div>
        );
      case 'fiches': {
        const l: Obj[] = Array.isArray(v) && v.length ? v as Obj[] : [{}];
        const maj = (i: number, f: Obj | null) => changer(q.id, f ? l.map((x, j) => (j === i ? f : x)) : l.filter((_, j) => j !== i));
        return (
          <div className="mq-fiches">
            {l.map((f, i) => (
              <div key={i} className="mq-fiche">
                <div className="mq-fiche-h"><b className="small">{i + 1}.</b>{l.length > 1 && <button type="button" className="btn sm ghost" onClick={() => maj(i, null)}>Retirer</button>}</div>
                <div className="mq-champs">
                  {q.champs!.map(c => (
                    <div key={c.k} className={`field${c.type === 'textarea' ? ' mq-large' : ''}`}><label htmlFor={fid(`${i}-${c.k}`)}>{c.label}{c.requis && ' *'}</label>
                      {c.type === 'textarea'
                        ? <textarea id={fid(`${i}-${c.k}`)} className="inp" rows={2} value={String(f[c.k] ?? '')} onChange={e => maj(i, { ...f, [c.k]: e.target.value })} />
                        : <input id={fid(`${i}-${c.k}`)} className="inp" value={String(f[c.k] ?? '')} placeholder={c.placeholder} onChange={e => maj(i, { ...f, [c.k]: e.target.value })} />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {l.length < (q.max ?? 5) && <button type="button" className="btn sm" onClick={() => changer(q.id, [...l, {}])}><Icon name="plus" size={14} /> Ajouter</button>}
          </div>
        );
      }
      case 'choix': {
        const choix: string[] = Array.isArray(o.choix) ? o.choix : [];
        return (
          <>
            <div className="mq-options" role="group" aria-label={q.titre}>
              {q.options!.map(x => <label key={x} className={choix.includes(x) ? 'on' : ''}><input type="checkbox" checked={choix.includes(x)}
                onChange={e => changer(q.id, { ...o, choix: e.target.checked ? [...choix, x] : choix.filter(c => c !== x) })} />{x}</label>)}
            </div>
            {q.details && <textarea className="inp mq-details" aria-label={q.details} placeholder={q.details} value={String(o.details ?? '')} onChange={e => changer(q.id, { ...o, details: e.target.value })} />}
          </>
        );
      }
      case 'secteurs': {
        const ids: number[] = Array.isArray(o.ids) ? o.ids : [];
        return (
          <>
            <div className="mq-options" role="group" aria-label={q.titre}>
              {data.secteurs.map(s => <label key={s.id} className={ids.includes(s.id) ? 'on' : ''}><input type="checkbox" checked={ids.includes(s.id)}
                onChange={e => changer(q.id, { ...o, ids: e.target.checked ? [...ids, s.id] : ids.filter(x => x !== s.id) })} />{s.nom}{ids[0] === s.id && <small> · principal</small>}</label>)}
            </div>
            {q.details && <input className="inp mq-details" aria-label={q.details} placeholder={q.details} value={String(o.details ?? '')} onChange={e => changer(q.id, { ...o, details: e.target.value })} />}
          </>
        );
      }
      case 'mots':
        return (
          <>
            {q.listes!.map(l => (
              <div key={l.k} className="field"><label htmlFor={fid(l.k)}>{l.label}</label>
                <Mots id={fid(l.k)} valeurs={Array.isArray(o[l.k]) ? o[l.k] : []} placeholder={l.placeholder} onChange={m => changer(q.id, { ...o, [l.k]: m })} /></div>
            ))}
            {q.details && <textarea className="inp mq-details" aria-label={q.details} placeholder={q.details} value={String(o.details ?? '')} onChange={e => changer(q.id, { ...o, details: e.target.value })} />}
          </>
        );
      case 'visibilite': {
        const val = (s: SectionId): Visibilite => (o[s] as Visibilite) ?? 'chambre';
        return (
          <div className="mq-visi">
            {SECTIONS.map(s => (
              <div key={s.id} className="mq-visi-l">
                <span className="small"><b>{s.id}</b> · {s.titre}</span>
                <select className="inp" aria-label={`Visibilité de la section ${s.titre}`} value={val(s.id)}
                  onChange={e => changer(q.id, Object.fromEntries(SECTIONS.map(x => [x.id, x.id === s.id ? e.target.value : val(x.id)])))}>
                  {VISIBILITES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
            ))}
            {!estRepondu(q, v) && <button type="button" className="btn sm" onClick={() => changer(q.id, Object.fromEntries(SECTIONS.map(x => [x.id, val(x.id)])))}><Icon name="ok" size={14} /> Valider ces choix</button>}
            <p className="small muted">{VISIBILITES.map(([, l, d]) => `${l} : ${d.toLowerCase()}`).join(' · ')}</p>
          </div>
        );
      }
    }
  }

  return (
    <div className={`mq mq-${mode}`} ref={haut}>
      <div className="mq-top">
        <div className="mq-prog">
          <div className="row between"><b className="small">{p.faites} sur {p.total} questions essentielles</b>
            <span className={`small mq-etat ${etat}`}>{etat === 'enreg' ? 'Enregistrement…' : etat === 'ok' ? '✓ Enregistré' : etat === 'err' ? 'Non enregistré' : ''}</span></div>
          <div className="bar"><i style={{ width: `${p.pct}%` }} /></div>
        </div>
        <div className="mq-etapes" role="tablist" aria-label="Sections">
          {SECTIONS.map((s, i) => (
            <button key={s.id} type="button" role="tab" aria-selected={i === etape} className={`${i === etape ? 'on' : ''}${faitSec(s.id) ? ' fait' : ''}`} onClick={() => aller(i)} title={s.titre}>
              <span className="mq-lettre">{faitSec(s.id) ? '✓' : s.id}</span><span className="mq-etape-l">{s.titre}</span>
            </button>
          ))}
        </div>
      </div>
      {erreur && <div className="err">{erreur} <button type="button" className="btn sm" onClick={envoyer}>Réessayer</button></div>}

      <section className="mq-section">
        <div><span className="eyebrow">Section {sec.id} · {etape + 1} sur {SECTIONS.length}</span><h2>{sec.titre}</h2><p className="small muted">{sec.intro}</p></div>
        {qs.map(q => (
          <div key={q.id} className={`mq-q${estRepondu(q, r[q.id]) ? ' ok' : ''}`}>
            <label className="mq-q-t" htmlFor={q.type === 'texte' ? `mq-${q.id}` : undefined}>
              <span className="mq-num">{q.id} ★</span><span className="grow">{q.titre}</span>{estRepondu(q, r[q.id]) && <Icon name="ok" size={18} />}
            </label>
            {q.aide && <p className="small muted">{q.aide}</p>}
            {champ(q)}
          </div>
        ))}
      </section>

      <div className="mq-nav">
        {etape > 0 ? <button type="button" className="btn" onClick={() => aller(etape - 1)}>‹ {SECTIONS[etape - 1].titre}</button> : <span />}
        {etape < SECTIONS.length - 1
          ? <button type="button" className="btn cta" onClick={() => aller(etape + 1)}>{SECTIONS[etape + 1].titre} ›</button>
          : <button type="button" className="btn cta" onClick={async () => { await envoyer(); onTermine?.(); }}><Icon name="ok" size={16} /> {mode === 'membre' ? 'Terminer' : 'Enregistrer'}</button>}
      </div>
    </div>
  );
}
