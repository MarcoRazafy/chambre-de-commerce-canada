'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Row } from '@/lib/format';

const size = (n: number) => n < 1024 ? n + ' o' : n < 1048576 ? Math.round(n / 1024) + ' Ko' : (n / 1048576).toFixed(1).replace('.', ',') + ' Mo';

// Dossier de ressources : dépôt, téléchargement et suppression de fichiers (15 Mo max chacun)
export default function DossierFiles({ id }: { id: number }) {
  const [dossier, setDossier] = useState<Row | null>(null);
  const [files, setFiles] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [d, f] = await Promise.all([api<Row>(`/api/dossiers/${id}`), api<Row[]>(`/api/fichiers?dossier_id=${id}`)]);
      setDossier(d);
      setFiles(f);
    } catch (e) { setError((e as Error).message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function upload(list: FileList) {
    setBusy(true);
    setError('');
    const form = new FormData();
    form.set('dossier_id', String(id));
    [...list].forEach(f => form.append('file', f));
    const res = await fetch('/api/fichiers', { method: 'POST', body: form });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error || 'Échec du dépôt');
    if (input.current) input.current.value = '';
    setBusy(false);
    load();
  }

  async function remove(f: Row) {
    if (!confirm(`Supprimer « ${f.nom} » ?`)) return;
    try { await api(`/api/fichiers/${f.id}`, 'DELETE'); load(); } catch (e) { setError((e as Error).message); }
  }

  if (!dossier) return error ? <div className="err">{error}</div> : <div className="empty">Chargement…</div>;
  return (
    <>
      <div className="head">
        <div><div className="eyebrow"><Link href="/ressources">Ressources</Link></div><h1><em>{dossier.nom}</em></h1>
          <p className="muted">{dossier.acces || 'Accès non précisé'}{dossier.payant ? ' · payant' : ''}</p></div>
        <div className="actions">
          <button className="btn cta" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Envoi…' : '+ Déposer des fichiers'}</button>
          <input ref={input} type="file" multiple hidden onChange={e => e.target.files?.length && upload(e.target.files)} />
        </div>
      </div>
      {error && <div className="err">{error}</div>}
      <div className="card">
        {files.length === 0 ? <div className="empty">Aucun fichier. Utilisez « Déposer des fichiers » (15 Mo maximum chacun).</div> : (
          <div className="tbl"><table>
            <thead><tr><th>Fichier</th><th className="r">Taille</th><th>Déposé le</th><th /></tr></thead>
            <tbody>{files.map(f => (
              <tr key={f.id}>
                <td><a href={`/api/fichiers/${f.id}`}><b>{f.nom}</b></a></td>
                <td className="r num">{size(f.taille)}</td>
                <td className="small">{new Date(f.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td className="r"><a className="btn sm ghost" href={`/api/fichiers/${f.id}`}>Télécharger</a><button className="btn sm ghost" onClick={() => remove(f)}>Supprimer</button></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
