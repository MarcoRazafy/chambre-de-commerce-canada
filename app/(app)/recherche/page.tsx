'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api } from '@/lib/format';

type Hit = { type: string; id: number; titre: string; detail: string; href: string };

function Results() {
  const q = useSearchParams().get('q') ?? '';
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setHits(null);
    api<Hit[]>('/api/recherche?q=' + encodeURIComponent(q)).then(setHits).catch(e => setError(e.message));
  }, [q]);

  return (
    <>
      {error && <div className="err">{error}</div>}
      <div className="card">
        {hits === null ? <div className="empty">Recherche…</div> : hits.length === 0 ? <div className="empty">Aucun résultat.</div> : (
          <div className="list">{hits.map((h, i) => (
            <Link key={i} href={h.href} className="it" style={{ textDecoration: 'none' }}>
              <span className="tag" style={{ minWidth: 92, textAlign: 'center' }}>{h.type}</span>
              <div className="grow"><b>{h.titre}</b>{h.detail && <div className="small muted">{h.detail}</div>}</div>
            </Link>
          ))}</div>
        )}
      </div>
    </>
  );
}

export default function RecherchePage() {
  return <Suspense fallback={<div className="empty">Recherche…</div>}><Results /></Suspense>;
}
