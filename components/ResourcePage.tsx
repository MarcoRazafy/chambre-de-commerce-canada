'use client';
import { useCallback, useEffect, useState } from 'react';
import { RESOURCES } from '@/lib/resources';
import { api, display, isoLocal, type Row } from '@/lib/format';
import FieldInput from './FieldInput';

const labelOf = (table: string) => RESOURCES[table].label;

// Tableau + formulaire d'ajout/modification pour n'importe quelle table de lib/resources.ts
export default function ResourcePage({ table, group, bare }: { table: string; group?: string; bare?: boolean }) {
  const r = RESOURCES[table];
  const [rows, setRows] = useState<Row[] | null>(null);
  const [refs, setRefs] = useState<Record<string, Row[]>>({});
  const [editing, setEditing] = useState<Row | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setRows(await api(`/api/${table}`));
      const tables = [...new Set(r.fields.filter(f => f.ref).map(f => f.ref!))];
      const lists = await Promise.all(tables.map(t => api<Row[]>(`/api/${t}`)));
      setRefs(Object.fromEntries(tables.map((t, i) => [t, lists[i]])));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [table, r]);
  useEffect(() => { load(); }, [load]);

  async function remove(row: Row) {
    if (!confirm(`Supprimer « ${row[r.label] ?? row.id} » ?`)) return;
    try { await api(`/api/${table}/${row.id}`, 'DELETE'); load(); } catch (e) { setError((e as Error).message); }
  }

  const cols = r.fields.filter(f => f.list);
  return (
    <>
      {!bare && (
        <div className="head">
          <div>
            {group && <div className="eyebrow">{group}</div>}
            <h1><em>{r.title}</em></h1>
            {r.desc && <p className="muted">{r.desc}</p>}
          </div>
          <div className="actions"><button className="btn cta" onClick={() => setEditing({})}>+ Ajouter</button></div>
        </div>
      )}
      {error && <div className="err">{error}</div>}
      <div className="card">
        {bare && (
          <div className="card-h"><h2>{r.title}</h2><button className="btn sm" onClick={() => setEditing({})}>+ Ajouter</button></div>
        )}
        {rows === null ? <div className="empty">Chargement…</div> : rows.length === 0 ? (
          <div className="empty">Aucune donnée pour l’instant.</div>
        ) : (
          <div className="tbl">
            <table>
              <thead><tr>{cols.map(f => <th key={f.name}>{f.label}</th>)}<th /></tr></thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    {cols.map(f => <td key={f.name} className={f.type === 'number' || f.type === 'lignes' ? 'num' : ''}>{display(f, row, refs, labelOf)}</td>)}
                    <td className="r" style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn sm ghost" onClick={() => setEditing(row)}>Modifier</button>
                      <button className="btn sm ghost" onClick={() => remove(row)}>Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && <EditModal table={table} row={editing} refs={refs} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}

function EditModal({ table, row, refs, onClose, onSaved }: { table: string; row: Row; refs: Record<string, Row[]>; onClose: () => void; onSaved: () => void }) {
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
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-h"><h2>{row.id ? 'Modifier' : 'Ajouter'} — {r.title}</h2><button type="button" className="btn sm ghost" onClick={onClose} aria-label="Fermer">✕</button></div>
        <div className="modal-b">
          {error && <div className="err">{error}</div>}
          <div className="form-grid">
            {fields.map(f => (
              <FieldInput key={f.name} f={f} value={vals[f.name]} refs={refs} labelOf={labelOf} onChange={v => setVals(s => ({ ...s, [f.name]: v }))} />
            ))}
          </div>
        </div>
        <div className="modal-f">
          <button type="button" className="btn" onClick={onClose}>Annuler</button>
          <button className="btn cta" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </div>
  );
}
