'use client';
import { useEffect, useState } from 'react';
import { SETTINGS } from '@/lib/resources';
import { api, type Row } from '@/lib/format';
import FieldInput from './FieldInput';
import { toast } from '@/lib/toast';

// Formulaire d'une ligne de la table settings (org, relances ou saas)
export default function SettingsForm({ cle }: { cle: string }) {
  const s = SETTINGS[cle];
  const [vals, setVals] = useState<Row | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Row>(`/api/settings/${cle}`).then(setVals).catch(e => setError(e.message));
  }, [cle]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setVals(await api(`/api/settings/${cle}`, 'PUT', vals));
      setError('');
      toast('Réglages enregistrés.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-h"><h2>{s.title}</h2></div>
      {error && <div className="err">{error}</div>}
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
