import { Suspense } from 'react';
import { EspaceRessource } from '@/components/espace/EspaceActivites';

export default function Page() {
  return <Suspense fallback={null}><EspaceRessource /></Suspense>;
}
