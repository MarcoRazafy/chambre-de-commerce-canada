'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RESOURCES } from '@/lib/resources';
import { api, display, isoLocal, optLabel, optValue, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import StatusBadge from './StatusBadge';
import { DETAIL, RELATED, ROW_ACTIONS, downloadCsv, parseCsv, runAction } from '@/lib/ui-actions';
import FieldInput from './FieldInput';
import ModalBackdrop from './ModalBackdrop';

const labelOf = (table: string) => RESOURCES[table].label;

type Props = {
  table: string;
  group?: string;
  bare?: boolean;                      // sans grand titre (dans une autre page)
  preset?: Record<string, unknown>;    // filtre fixe + valeurs par défaut du formulaire (ex. { member_id: 5 })
};

// Tableau + recherche, filtres, export, actions et formulaire pour n'importe quelle table de lib/resources.ts
export default function ResourcePage({ table, group, bare, preset }: Props) {
  const r = RESOURCES[table];
  const [rows, setRows] = useState<Row[] | null>(null);
  const [refs, setRefs] = useState<Record<string, Row[]>>({});
  const [editing, setEditing] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [term, setTerm] = useState('');
  const [sel, setSel] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const qs = preset ? '?' + new URLSearchParams(Object.entries(preset).map(([k, v]) => [k, String(v)])) : '';

  const load = useCallback(async () => {
    try {
      setRows(await api(`/api/${table}${qs}`));
      const tables = [...new Set(r.fields.filter(f => f.ref).map(f => f.ref!))];
      const lists = await Promise.all(tables.map(t => api<Row[]>(`/api/${t}`)));
      setRefs(Object.fromEntries(tables.map((t, i) => [t, lists[i]])));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [table, r, qs]);
  useEffect(() => { load(); }, [load]);

  async function remove(row: Row) {
    if (!confirm(`Supprimer « ${row[r.label] ?? row.id} » ?`)) return;
    try { await api(`/api/${table}/${row.id}`, 'DELETE'); load(); } catch (e) { setError((e as Error).message); }
  }

  async function act(action: string, body: Record<string, unknown>, question?: string, ask?: string) {
    if (question && !confirm(question)) return;
    let extra = {};
    if (ask) {
      const mode = prompt(ask);
      if (mode === null) return;
      extra = { mode: mode.trim() };
    }
    try { toast(await runAction(action, { ...body, ...extra })); setError(''); load(); }
    catch (e) { setError((e as Error).message); }
  }

  async function importCsv(file: File) {
    const rows = parseCsv(await file.text());
    if (!rows.length) return setError('Fichier vide');
    await act('subscribers-import', { rows });
    if (fileRef.current) fileRef.current.value = '';
  }

  const cols = r.fields.filter(f => f.list && !(preset && f.name in preset));
  const filterFields = r.fields.filter(f => f.filter && !(preset && f.name in preset));
  const shown = useMemo(() => (rows ?? []).filter(row =>
    filterFields.every(f => !sel[f.name] || String(row[f.name]) === sel[f.name]) &&
    (!term || cols.some(f => display(f, row, refs, labelOf).toLowerCase().includes(term.toLowerCase())))
  ), [rows, sel, term, refs, cols, filterFields]);

  const exportCsv = () => downloadCsv(r.title, cols.map(f => f.label), shown.map(row => cols.map(f => display(f, row, refs, labelOf))));
  const actions = ROW_ACTIONS[table] ?? [];
  const add = <button className={bare ? 'btn sm' : 'btn cta'} onClick={() => setEditing({ ...preset })}>+ Ajouter</button>;
  const tools = (
    <>
      {!bare && RELATED[table]?.map(([href, label]) => <Link key={href} className="btn" href={href}>{label}</Link>)}
      {table === 'subscribers' && <>
        <a className="btn" href="/inscription" target="_blank">Formulaire public</a>
        <button className="btn" onClick={() => fileRef.current?.click()}>Importer un CSV</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={e => e.target.files?.[0] && importCsv(e.target.files[0])} />
      </>}
      {table === 'outbox' && <button className="btn" onClick={() => act('run-jobs', {})}>Lancer les envois maintenant</button>}
      <button className="btn" onClick={exportCsv} disabled={!shown.length}>Exporter</button>
      {add}
    </>
  );

  return (
    <>
      {!bare && (
        <div className="head">
          <div>
            {group && <div className="eyebrow">{group}</div>}
            <h1><em>{r.title}</em></h1>
            {r.desc && <p className="muted">{r.desc}</p>}
          </div>
          <div className="actions">{tools}</div>
        </div>
      )}
      {error && <div className="err">{error}</div>}
      <div className="card">
        {bare && <div className="card-h"><h2>{r.title}</h2><div className="actions">{tools}</div></div>}
        {(rows?.length ?? 0) > 0 && (
          <div className="filters">
            <input className="inp" placeholder="Rechercher…" aria-label="Rechercher dans le tableau" value={term} onChange={e => setTerm(e.target.value)} />
            {filterFields.map(f => (
              <select key={f.name} className="inp" style={{ flex: '0 1 200px' }} aria-label={f.label} value={sel[f.name] ?? ''} onChange={e => setSel({ ...sel, [f.name]: e.target.value })}>
                <option value="">{f.label} : tous</option>
                {f.type === 'ref'
                  ? (refs[f.ref!] ?? []).map(o => <option key={o.id} value={String(o.id)}>{String(o[labelOf(f.ref!)])}</option>)
                  : f.options!.map(o => <option key={optValue(o)} value={optValue(o)}>{optLabel(o)}</option>)}
              </select>
            ))}
          </div>
        )}
        {rows === null ? <div className="empty">Chargement…</div> : shown.length === 0 ? (
          <div className="empty">{rows.length ? 'Aucun résultat.' : 'Rien ici pour le moment.'}</div>
        ) : (
          <div className="tbl">
            <table>
              <thead><tr>{cols.map(f => <th key={f.name}>{f.label}</th>)}<th /></tr></thead>
              <tbody>
                {shown.map(row => (
                  <tr key={row.id}>
                    {cols.map((f, i) => (
                      <td key={f.name} className={f.type === 'number' || f.type === 'lignes' ? 'num' : ''}>
                        {i === 0 && DETAIL[table] ? <Link href={`/${DETAIL[table]}/${row.id}`}><b>{display(f, row, refs, labelOf)}</b></Link>
                          : f.name === 'statut' && row[f.name] ? <StatusBadge value={row[f.name]} label={display(f, row, refs, labelOf)} />
                          : display(f, row, refs, labelOf)}
                      </td>
                    ))}
                    <td className="r" style={{ whiteSpace: 'nowrap' }}>
                      {actions.filter(a => a.show(row)).map(a => (
                        <button key={a.action} className="btn sm" style={{ marginRight: 4 }} onClick={() => act(a.action, { id: row.id }, a.confirm, a.ask)}>{a.label}</button>
                      ))}
                      <button className="btn sm ghost" onClick={() => setEditing(row)}>Modifier</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && <EditModal table={table} row={editing} refs={refs} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); window.dispatchEvent(new Event('cc:refresh')); }}
        onDelete={editing.id ? () => { const row = editing; setEditing(null); remove(row); } : undefined} />}
    </>
  );
}

export function EditModal({ table, row, refs, onClose, onSaved, onDelete }: { table: string; row: Row; refs: Record<string, Row[]>; onClose: () => void; onSaved: () => void; onDelete?: () => void }) {
  const r = RESOURCES[table];
  const fields = r.fields.filter(f => !f.readonly);
  const [vals, setVals] = useState<Row>(() => Object.fromEntries(fields.map(f => {
    const v = row[f.name];
    if (f.type === 'datetime' && v) return [f.name, isoLocal(v)];
    if (f.type === 'tags') return [f.name, (v ?? []).join(', ')];
    return [f.name, v ?? (f.type === 'bool' ? false : f.type === 'lignes' ? [{ des: '', mt: 0 }] : '')];
  })));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const body = Object.fromEntries(fields.map(f => {
      const v = vals[f.name];
      if (f.type === 'tags') return [f.name, String(v).split(',').map(s => s.trim()).filter(Boolean)];
      if (f.type === 'datetime' && v) return [f.name, new Date(v).toISOString()];
      return [f.name, v];
    }));
    try {
      await api(row.id ? `/api/${table}/${row.id}` : `/api/${table}`, row.id ? 'PATCH' : 'POST', body);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-h"><div><h2>{row.id ? 'Modifier' : 'Ajouter'}</h2><span className="small muted">{r.title}</span></div><button type="button" className="btn sm ghost" onClick={onClose} aria-label="Fermer">✕</button></div>
        <div className="modal-b">
          {error && <div className="err">{error}</div>}
          <div className="form-grid">
            {fields.map(f => (
              <FieldInput key={f.name} f={f} value={vals[f.name]} refs={refs} labelOf={labelOf} onChange={v => setVals(s => ({ ...s, [f.name]: v }))} />
            ))}
          </div>
        </div>
        <div className="modal-f">
          {onDelete && <button type="button" className="btn ghost" style={{ marginRight: 'auto', color: 'var(--red)' }} onClick={onDelete}>Supprimer</button>}
          <button type="button" className="btn" onClick={onClose}>Annuler</button>
          <button className="btn cta" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </ModalBackdrop>
  );
}
