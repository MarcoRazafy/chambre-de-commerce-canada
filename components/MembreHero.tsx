'use client';
import { useRef, useState, type ReactNode } from 'react';
import { imageUrl, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import Avatar from './Avatar';
import Icon from './Icon';

const cap = (v: string | null) => !v ? '' : (v === v.toUpperCase() || v === v.toLowerCase() ? v.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : v);
const lien = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);
const hote = (u: string) => u.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

// En-tête d'une entreprise, comme la fiche membre de l'équipe : couverture (déposée, adresse, ou logo flouté),
// logo qui la chevauche, secteur, nom, lieu, site. editable : le membre change son logo, sa couverture et le cadrage.
export default function MembreHero({ m, secteur, badges, actions, editable, onCadrage, onChange }: {
  m: Row; secteur?: string | null; badges?: ReactNode; actions?: ReactNode;
  editable?: boolean; onCadrage?: (x: number, y: number) => Promise<void>; onChange?: () => void;
}) {
  const [v, setV] = useState(0);
  const [frame, setFrame] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const cover = m.couverture_deposee ? `/api/avatar/cover/${m.id}?v=${v}` : imageUrl(m.couverture_url);
  const lieu = [cap(m.ville), m.pays === 'CA' ? 'Canada' : 'Madagascar'].filter(Boolean).join(', ');

  async function envoyer(kind: 'member' | 'cover', f: File) {
    const form = new FormData(); form.append('file', f);
    const r = await fetch(`/api/avatar/${kind}/${m.id}`, { method: 'PUT', body: form });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return toast(d.error || 'Image refusée', 'error');
    toast(kind === 'cover' ? 'Couverture mise à jour.' : 'Logo mis à jour.');
    setV(Date.now()); onChange?.();
  }
  async function retirerCouverture() {
    if (!confirm('Retirer la couverture ?')) return;
    await fetch(`/api/avatar/cover/${m.id}`, { method: 'DELETE' });
    setV(Date.now()); onChange?.();
  }
  function bouger(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || !frame) return;
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFrame({ x: Math.round(Math.min(100, Math.max(0, d.x - ((e.clientX - d.px) / box.width) * 100))), y: Math.round(Math.min(100, Math.max(0, d.y - ((e.clientY - d.py) / box.height) * 100))) });
  }

  return (
    <section className="mhero card">
      <div className={`mhero-cover${cover ? '' : ' blurred'}${frame ? ' framing' : ''}`}
        onPointerDown={e => { if (!frame) return; (e.target as HTMLElement).setPointerCapture(e.pointerId); drag.current = { px: e.clientX, py: e.clientY, x: frame.x, y: frame.y }; }}
        onPointerMove={bouger} onPointerUp={() => { drag.current = null; }}>
        {cover ? <img src={cover} alt="" referrerPolicy="no-referrer" draggable={false} style={{ objectPosition: `${frame?.x ?? m.couverture_x ?? 50}% ${frame?.y ?? m.couverture_y ?? 50}%` }} />
          : <img className="cover-blur" src={`/api/avatar/member/${m.id}?v=${v}`} alt="" />}
        {editable && (frame ? (
          <div className="mhero-cover-tools">
            <span className="mhero-hint">Faites glisser l’image · le cadrage vaut aussi pour l’annuaire</span>
            <button type="button" className="mhero-glass" onClick={() => setFrame(null)}>Annuler</button>
            <button type="button" className="mhero-glass on" onClick={async () => { await onCadrage?.(frame.x, frame.y); setFrame(null); }}><Icon name="ok" size={16} />Enregistrer</button>
          </div>
        ) : (
          <div className="mhero-cover-tools">
            {cover && onCadrage && <button type="button" className="mhero-glass" onClick={() => setFrame({ x: m.couverture_x ?? 50, y: m.couverture_y ?? 50 })}><Icon name="open" size={16} />Recadrer</button>}
            <button type="button" className="mhero-glass" onClick={() => coverInput.current?.click()}><Icon name="image" size={16} />{cover ? 'Changer la couverture' : 'Ajouter une couverture'}</button>
            {m.couverture_deposee && <button type="button" className="mhero-glass icon" aria-label="Retirer la couverture" onClick={retirerCouverture}><Icon name="trash" size={16} /></button>}
          </div>
        ))}
        {editable && <input ref={coverInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { const x = e.target.files?.[0]; if (x) envoyer('cover', x); e.target.value = ''; }} />}
      </div>
      <div className="mhero-main">
        <div className="mhero-logo">
          <Avatar key={v} kind="member" id={m.id} size={112} nom={m.nom} />
          {editable && <>
            <button type="button" className="mhero-logo-btn" aria-label="Changer le logo" title="Changer le logo" onClick={() => logoInput.current?.click()}><Icon name="edit" size={14} /></button>
            <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e => { const x = e.target.files?.[0]; if (x) envoyer('member', x); e.target.value = ''; }} />
          </>}
        </div>
        <div className="mhero-id">
          {secteur && <span className="dcard-sector">{secteur}</span>}
          <h1>{m.nom}</h1>
          <div className="mhero-meta">
            {badges}
            {lieu && <span><span className="tile-ic xs"><Icon name="pin" size={14} fill /></span>{lieu}</span>}
            {m.membre_depuis && <span><span className="tile-ic xs"><Icon name="cal" size={14} fill /></span>Membre depuis {new Date(String(m.membre_depuis).slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>}
            {m.site_web && <a href={lien(m.site_web)} target="_blank" rel="noopener noreferrer"><span className="tile-ic xs"><Icon name="share" size={14} fill /></span>{hote(m.site_web)}</a>}
          </div>
        </div>
        {actions && <div className="mhero-actions">{actions}</div>}
      </div>
    </section>
  );
}
