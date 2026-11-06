import { Suspense } from 'react';
import EspaceFacture from '@/components/espace/EspaceFacture';

export default function Page() {
  return <Suspense fallback={null}><EspaceFacture /></Suspense>;
}
