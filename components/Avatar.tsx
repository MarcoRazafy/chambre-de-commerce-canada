'use client';
import { useEffect, useState } from 'react';

// Version des photos : changée après un dépôt pour que toutes les images se rechargent
let version = 0;
export const avatarChanged = () => { version = Date.now(); window.dispatchEvent(new Event('cc:avatar')); };

type P = { kind: string; id: number; nom?: string };

// Photo de profil ou logo ; sans photo, l'API renvoie les initiales sur un cercle de couleur
export default function Avatar({ kind, id, size = 40, nom }: P & { size?: number }) {
  const [v, setV] = useState(version);
  useEffect(() => {
    const up = () => setV(version);
    window.addEventListener('cc:avatar', up);
    return () => window.removeEventListener('cc:avatar', up);
  }, []);
  return <img className="avatar" src={`/api/avatar/${kind}/${id}${v ? `?v=${v}` : ''}`} alt={nom ?? ''} width={size} height={size} loading="lazy" style={{ width: size, height: size }} />;
}

// Groupe : deux avatars qui se chevauchent
export function GroupAvatar({ people, size = 40 }: { people: P[]; size?: number }) {
  const two = people.slice(0, 2);
  if (two.length < 2) return two[0] ? <Avatar {...two[0]} size={size} /> : <span className="avatar avatar-empty" style={{ width: size, height: size }} />;
  const s = Math.round(size * 0.68);
  return (
    <span className="avatar-group" style={{ width: size, height: size }}>
      <Avatar {...two[0]} size={s} />
      <Avatar {...two[1]} size={s} />
    </span>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ThreadAvatar({ t, meId, size = 48 }: { t: Record<string, any>; meId?: number; size?: number }) {
  if (t.type !== 'groupe' && t.avatar) return <Avatar kind={t.avatar.kind} id={t.avatar.id} size={size} />;
  return <GroupAvatar people={((t.participants ?? []) as P[]).filter(p => !(p.kind === 'user' && p.id === meId))} size={size} />;
}
