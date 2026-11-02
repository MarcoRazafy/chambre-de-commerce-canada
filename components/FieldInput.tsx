'use client';
import type { Field } from '@/lib/resources';
import { optLabel, optValue, type Ligne, type Row } from '@/lib/format';

type Props = { f: Field; value: any; onChange: (v: any) => void; refs: Record<string, Row[]>; labelOf: (table: string) => string };

export default function FieldInput({ f, value, onChange, refs, labelOf }: Props) {
  const id = 'f-' + f.name;
  const input = (() => {
    switch (f.type) {
      case 'textarea':
        return <textarea id={id} className="inp" value={value ?? ''} onChange={e => onChange(e.target.value)} required={f.required} />;
      case 'bool':
        return <input id={id} type="checkbox" className="switch" checked={!!value} onChange={e => onChange(e.target.checked)} />;
      case 'number':
        return <input id={id} type="number" step="any" className="inp" value={value ?? ''} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} required={f.required} />;
      case 'date':
      case 'datetime':
        return <input id={id} type={f.type === 'date' ? 'date' : 'datetime-local'} className="inp" value={value ?? ''} onChange={e => onChange(e.target.value)} required={f.required} />;
      case 'tags':
        return <input id={id} className="inp" value={value ?? ''} onChange={e => onChange(e.target.value)} />;
      case 'select':
        return (
          <select id={id} className="inp" value={value ?? ''} onChange={e => onChange(e.target.value)} required={f.required}>
            <option value="">—</option>
            {f.options!.map(o => <option key={optValue(o)} value={optValue(o)}>{optLabel(o)}</option>)}
          </select>
        );
      case 'ref':
        return (
          <select id={id} className="inp" value={value ?? ''} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} required={f.required}>
            <option value="">—</option>
            {(refs[f.ref!] ?? []).map(r => <option key={r.id} value={r.id}>{String(r[labelOf(f.ref!)])}</option>)}
          </select>
        );
      case 'lignes': {
        const lignes: Ligne[] = value ?? [];
        const set = (i: number, k: keyof Ligne, v: string) =>
          onChange(lignes.map((l, j) => (j === i ? { ...l, [k]: k === 'mt' ? Number(v) : v } : l)));
        return (
          <div className="lignes">
            {lignes.map((l, i) => (
              <div className="row" key={i}>
                <input className="inp grow" placeholder="Désignation" value={l.des} onChange={e => set(i, 'des', e.target.value)} required />
                <input className="inp" style={{ width: 140 }} type="number" step="any" placeholder="Montant" value={l.mt ?? ''} onChange={e => set(i, 'mt', e.target.value)} required />
                <button type="button" className="btn sm ghost" onClick={() => onChange(lignes.filter((_, j) => j !== i))} aria-label="Retirer la ligne">✕</button>
              </div>
            ))}
            <button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...lignes, { des: '', mt: 0 }])}>+ Ajouter une ligne</button>
          </div>
        );
      }
      default:
        return <input id={id} type={f.name.includes('email') || f.name === 'courriel' ? 'email' : 'text'} className="inp" value={value ?? ''} onChange={e => onChange(e.target.value)} required={f.required} />;
    }
  })();

  if (f.type === 'bool')
    return <label className="row small full" htmlFor={id}>{input} {f.label}</label>;
  return (
    <div className={`field${['textarea', 'lignes', 'tags'].includes(f.type ?? '') ? ' full' : ''}`}>
      <label htmlFor={id}>{f.label}{f.required ? ' *' : ''}</label>
      {input}
      {f.hint && <span className="hint">{f.hint}</span>}
    </div>
  );
}
