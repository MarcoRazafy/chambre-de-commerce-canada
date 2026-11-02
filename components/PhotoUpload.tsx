'use client';
import { useRef, useState } from 'react';
import { toast } from '@/lib/toast';
import Avatar, { avatarChanged } from './Avatar';

// Photo de profil (kind=user) ou logo de membre (kind=member) : aperçu + changer / retirer
export default function PhotoUpload({ kind, id, size = 96, label = 'Changer la photo' }: { kind: 'user' | 'member'; id: number; size?: number; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(f: File) {
    setBusy(true);
    const form = new FormData();
    form.set('file', f);
    const res = await fetch(`/api/avatar/${kind}/${id}`, { method: 'PUT', body: form });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(d.error || 'Échec de l’envoi', 'error');
    avatarChanged();
    toast(kind === 'user' ? 'Photo de profil mise à jour.' : 'Logo mis à jour.');
  }
  async function remove() {
    await fetch(`/api/avatar/${kind}/${id}`, { method: 'DELETE' });
    avatarChanged();
  }

  return (
    <div className="photo-up">
      <Avatar kind={kind} id={id} size={size} />
      <div className="row">
        <button type="button" className="btn sm" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Envoi…' : label}</button>
        <button type="button" className="btn ghost sm" onClick={remove}>Retirer</button>
      </div>
      <span className="hint">PNG, JPEG, WebP ou GIF, 3 Mo au plus.</span>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
    </div>
  );
}
