'use client';
import Link from 'next/link';
import { pieces } from '@/lib/news-client';

// Texte d'une actualité ou d'un commentaire : mentions (membre → sa fiche), #mots-clés (filtrent la liste), liens cliquables
export default function RichText({ text, onTag }: { text: string; onTag?: (tag: string) => void }) {
  return (
    <>
      {pieces(text).map((p, i) => {
        if (p.t === 'mention') return p.kind === 'member'
          ? <Link key={i} className="mention" href={`/membres/${p.id}`}>{p.v}</Link>
          : <span key={i} className="mention">{p.v}</span>;
        if (p.t === 'tag') return <button key={i} type="button" className="hashtag" onClick={() => onTag?.(p.v)}>#{p.v}</button>;
        if (p.t === 'link') return <a key={i} href={p.v} target="_blank" rel="noopener noreferrer">{p.v}</a>;
        return <span key={i}>{p.v}</span>;
      })}
    </>
  );
}
