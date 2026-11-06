'use client';
import { useNouveau } from '@/lib/useNouveau';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RESOURCES } from '@/lib/resources';
import { api, display, isoLocal, optLabel, optValue, total, type Row } from '@/lib/format';
import type { Field } from '@/lib/resources';
import { toast } from '@/lib/toast';
import Cell from './Cell';
import Icon from './Icon';
import { DETAIL, RELATED, ROW_ACTIONS, downloadCsv, parseCsv, runAction } from '@/lib/ui-actions';
import FieldInput from './FieldInput';
import ModalBackdrop from './ModalBackdrop';

const labelOf = (table: string) => RESOURCES[table].label;

// Valeur de tri d'une cellule : nombre pour les montants, dates et cases à cocher, texte affiché sinon
function sortKey(f: Field, row: Row, refs: Record<string, Row[]>): number | string | null {
  const v = row[f.name];
  if (f.type === 'lignes') return `${row.devise ?? ''} ${String(total(v)).padStart(15, '0')}`;   // montants regroupés par devise (ariary et dollars ne se comparent pas)
  if (v == null || v === '') return null;
  if (f.type === 'number') return Number(v);
  if (f.type === 'date' || f.type === 'datetime') return new Date(v).getTime();
  if (f.type === 'bool') return v ? 1 : 0;
  return display(f, row, refs, labelOf).toLocaleLowerCase('fr');
}

type Props = {
  table: string;
  bare?: boolean;                      // sans grand titre (dans une autre page)
  preset?: Record<string, unknown>;    // filtre fixe + valeurs par défaut du formulaire (ex. { member_id: 5 })
};

// Tableau + recherche, filtres, export, actions et formulaire pour n'importe quelle table de lib/resources.ts
export default function ResourcePage({ table, bare, preset }: Props) {
  const r = RESOURCES[table];
  const [rows, setRows] = useState<Row[] | null>(null);
  const [refs, setRefs] = useState<Record<string, Row[]>>({});
  const [editing, setEditing] = useState<Row | null>(null);
  useNouveau(() => setEditing({ ...(preset ?? {}) }), !bare);
  const [error, setError] = useState('');
  const [term, setTerm] = useState('');
  const [sel, setSel] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ col: string; dir: 1 | -1 } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
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
  const shown = useMemo(() => {
    const list = (rows ?? []).filter(row =>
      filterFields.every(f => !sel[f.name] || String(row[f.name]) === sel[f.name]) &&
      (!term || cols.some(f => display(f, row, refs, labelOf).toLowerCase().includes(term.toLowerCase()))));
    const f = sort && cols.find(c => c.name === sort.col);
    if (!f) return list;
    // Les cases vides restent en bas, quel que soit le sens
    return list.map(row => ({ row, k: sortKey(f, row, refs) })).sort((a, b) =>
      a.k === null ? (b.k === null ? 0 : 1) : b.k === null ? -1
        : sort.dir * (typeof a.k === 'number' && typeof b.k === 'number' ? a.k - b.k : String(a.k).localeCompare(String(b.k), 'fr', { numeric: true })),
    ).map(x => x.row);
  }, [rows, sel, term, refs, cols, filterFields, sort]);
  const filtered = !!term || Object.values(sel).some(Boolean);
  const toggleSort = (col: string) => setSort(s => (s?.col === col ? { col, dir: s.dir === 1 ? -1 : 1 } : { col, dir: 1 }));
  const open = (row: Row) => (DETAIL[table] ? router.push(`/${DETAIL[table]}/${row.id}`) : setEditing(row));

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
        <div className="head og-head"><div><h1>{r.title}</h1></div><div className="actions">{tools}</div></div>
      )}
      {error && <div className="err">{error}</div>}
      <div className="card">
        {bare && <div className="card-h"><h2>{r.title}</h2><div className="actions">{tools}</div></div>}
        {(rows?.length ?? 0) > 0 && (
          <div className="filters">
            <label className="search-inp"><Icon name="search" size={16} /><input className="inp" placeholder="Rechercher…" aria-label="Rechercher dans le tableau" value={term} onChange={e => setTerm(e.target.value)} /></label>
            {filterFields.map(f => (
              <select key={f.name} className="inp" style={{ flex: '0 1 200px' }} aria-label={f.label} value={sel[f.name] ?? ''} onChange={e => setSel({ ...sel, [f.name]: e.target.value })}>
                <option value="">{f.label} : tous</option>
                {f.type === 'ref'
                  ? (refs[f.ref!] ?? []).map(o => <option key={o.id} value={String(o.id)}>{String(o[labelOf(f.ref!)])}</option>)
                  : f.options!.map(o => <option key={optValue(o)} value={optValue(o)}>{optLabel(o)}</option>)}
              </select>
            ))}
            <span className="count">{shown.length === rows!.length ? `${rows!.length} ligne${rows!.length > 1 ? 's' : ''}` : `${shown.length} sur ${rows!.length}`}</span>
          </div>
        )}
        {rows === null ? (
          <div className="skeleton" aria-busy="true" aria-label="Chargement">{[0, 1, 2, 3, 4].map(i => <span key={i} />)}</div>
        ) : shown.length === 0 ? (
          <div className="empty-state">
            <span className="tile-ic"><Icon name={filtered ? 'search' : 'new'} size={18} fill /></span>
            {filtered ? <>
              <b>Aucun résultat{term ? ` pour « ${term} »` : ''}</b>
              <button className="btn sm" onClick={() => { setTerm(''); setSel({}); }}>Effacer la recherche et les filtres</button>
            </> : <>
              <b>Rien ici pour le moment</b>
              <button className="btn sm cta" onClick={() => setEditing({ ...preset })}>+ Ajouter</button>
            </>}
          </div>
        ) : (
          <div className="tbl tbl-cards">
            <table>
              <thead><tr>
                {cols.map(f => (
                  <th key={f.name} aria-sort={sort?.col === f.name ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                    <button className={`th-sort${sort?.col === f.name ? ' on' : ''}`} onClick={() => toggleSort(f.name)}>
                      {f.label}<Icon name={sort?.col === f.name && sort.dir === -1 ? 'down' : 'up'} size={12} />
                    </button>
                  </th>
                ))}
                <th><span className="sr-only">Actions</span></th>
              </tr></thead>
              <tbody>
                {shown.map((row, n) => (
                  // Un clic sur la ligne ouvre la fiche, ou le formulaire s'il n'y a pas de fiche (les boutons et liens gardent leur rôle)
                  // Au clavier : Tab jusqu'à la ligne puis Entrée
                  <tr key={row.id} style={{ '--i': Math.min(n, 14) } as React.CSSProperties} className="clickable" tabIndex={0}
                    onClick={e => { if (!(e.target as HTMLElement).closest('a,button')) open(row); }}
                    onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) open(row); }}>
                    {cols.map((f, i) => (
                      <td key={f.name} data-label={f.label} className={f.type === 'number' || f.type === 'lignes' ? 'num' : ''}>
                        <Cell f={f} row={row} refs={refs} labelOf={labelOf} table={table} first={i === 0} href={i === 0 && DETAIL[table] ? `/${DETAIL[table]}/${row.id}` : undefined} />
                      </td>
                    ))}
                    <td className="r row-actions">
                      {actions.filter(a => a.show(row)).map(a => (
                        <button key={a.action} className="btn sm" onClick={() => act(a.action, { id: row.id }, a.confirm, a.ask)}>{a.label}</button>
                      ))}
                      {!DETAIL[table] && <button className="btn ghost icon-btn" title="Modifier" aria-label={`Modifier ${row[r.label] ?? ''}`} onClick={() => setEditing(row)}><Icon name="edit" size={16} /></button>}
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
