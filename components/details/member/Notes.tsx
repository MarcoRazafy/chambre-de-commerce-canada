'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, relative, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import Icon from '../../Icon';

// Commentaires de l'équipe : visibles du back-office seulement, jamais du membre ni dans un courriel
export default function Notes({ memberId, meId, version }: { memberId: number; meId: number | null; version: number }) {
  const [list, setList] = useState<Row[] | null>(null);
  const [texte, setTexte] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api<Row[]>(`/api/membres/${memberId}/notes`).then(setList).catch(() => setList([])), [memberId]);
  useEffect(() => { load(); }, [load, version]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!texte.trim()) return;
    setBusy(true);
    try { await api(`/api/membres/${memberId}/notes`, 'POST', { texte }); setTexte(''); toast('Commentaire ajouté.'); load(); }
    catch (err) { toast((err as Error).message, 'error'); } finally { setBusy(false); }
  }
  async function remove(n: Row) {
    if (!confirm('Retirer ce commentaire ? Il n’apparaîtra plus pour personne.')) return;
    try { await api(`/api/notes-membres/${n.id}`, 'DELETE'); load(); } catch (err) { toast((err as Error).message, 'error'); }
  }

  return (
    <section className="card">
      <h2>Commentaires de l’équipe</h2>
      <p className="small muted note-lock"><Icon name="team" size={14} /> Visibles du back-office seulement. Le membre ne les voit jamais.</p>
      <form className="note-form" onSubmit={add}>
        <textarea className="inp" rows={2} maxLength={2000} placeholder="Ce qu’il faut savoir sur ce membre, pour l’équipe…" aria-label="Nouveau commentaire" value={texte} onChange={e => setTexte(e.target.value)} />
        <button className="btn sm cta" disabled={busy || !texte.trim()}>Ajouter le commentaire</button>
      </form>
      {list && list.length === 0 && <p className="small muted">Aucun commentaire sur ce membre.</p>}
      {list && list.length > 0 && (
        <ul className="note-list">
          {list.map(n => (
            <li key={n.id}>
              <p>{n.texte}</p>
              <div className="note-meta"><span>{n.user_id && n.user_id === meId ? 'Vous' : n.auteur} · {relative(n.created_at)}</span>
                <button type="button" className="btn sm ghost nl-icon" aria-label="Retirer le commentaire" title="Retirer" onClick={() => remove(n)}><Icon name="trash" size={14} /></button></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
