import { Suspense } from 'react';
import EspaceEvenement from '@/components/espace/EspaceEvenement';

export default function Page() {
  return <Suspense fallback={null}><EspaceEvenement /></Suspense>;
}
