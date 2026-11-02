'use client';
import { useEffect, useState } from 'react';
import { SETTINGS } from '@/lib/resources';
import { api, type Row } from '@/lib/format';
import FieldInput from './FieldInput';

// Formulaire d'une ligne de la table settings (org, relances ou saas)
export default function SettingsForm({ cle }: { cle: string }) {
  const s = SETTINGS[cle];
  const [vals, setVals] = useState<Row | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  useEffect(() => {
    api<Row>(`/api/settings/${cle}`).then(setVals).catch(e => setMsg({ ok: false, t: e.message }));
  }, [cle]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setVals(await api(`/api/settings/${cle}`, 'PUT', vals));
      setMsg({ ok: true, t: 'Enregistré.' });
    } catch (err) {
      setMsg({ ok: false, t: (err as Error).message });
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-h"><h2>{s.title}</h2></div>
      {msg && <div className={msg.ok ? 'chip c-green' : 'err'} style={{ alignSelf: 'flex-start' }}>{msg.t}</div>}
      {vals === null ? <div className="empty">Chargement…</div> : (
        <>
          <div className="form-grid">
            {s.fields.map(f => (
              <FieldInput key={f.name} f={f} value={vals[f.name]} refs={{}} labelOf={() => ''} onChange={v => setVals(x => ({ ...x, [f.name]: v }))} />
            ))}
          </div>
          <div className="row"><button className="btn cta">Enregistrer</button></div>
        </>
      )}
    </form>
  );
}
