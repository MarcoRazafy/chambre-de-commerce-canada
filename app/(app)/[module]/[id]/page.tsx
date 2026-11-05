import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import MemberDetail from '@/components/details/MemberDetail';
import EventDetail from '@/components/details/EventDetail';
import InvoicePreview from '@/components/details/InvoicePreview';
import RessourceDetail from '@/components/details/RessourceDetail';

// Fiches : /membres/5, /evenements/3, /paiements/12 (aperçu de facture), /ressources/2 (ressource), /ressources/nouvelle
const VIEWS: Record<string, (p: { id: number }) => React.ReactNode> = {
  membres: MemberDetail, evenements: EventDetail, paiements: InvoicePreview, ressources: RessourceDetail,
};

export default function DetailPage({ params }: { params: Promise<{ module: string; id: string }> }) {
  return <Suspense fallback={<div className="empty">Chargement…</div>}><Detail params={params} /></Suspense>;
}

async function Detail({ params }: { params: Promise<{ module: string; id: string }> }) {
  const { module, id } = await params;
  const View = Object.hasOwn(VIEWS, module) && (/^\d{1,9}$/.test(id) || (module === 'ressources' && id === 'nouvelle')) ? VIEWS[module] : null;
  if (!View) notFound();
  return <View id={id === 'nouvelle' ? 0 : Number(id)} />;
}
