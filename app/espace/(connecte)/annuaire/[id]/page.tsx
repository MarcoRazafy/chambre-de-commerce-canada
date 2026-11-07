import { Suspense } from 'react';
import EspaceFicheMembre from '@/components/espace/EspaceFicheMembre';

export default function Page() {
  return <Suspense fallback={null}><EspaceFicheMembre /></Suspense>;
}
