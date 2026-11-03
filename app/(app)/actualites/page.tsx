import { Suspense } from 'react';
import Actualites from '@/components/news/Actualites';

// Actualités façon fil social : publication à gauche, liste à droite (voir components/news/)
export default function ActualitesPage() {
  return <Suspense fallback={<div className="empty">Chargement…</div>}><Actualites /></Suspense>;
}
