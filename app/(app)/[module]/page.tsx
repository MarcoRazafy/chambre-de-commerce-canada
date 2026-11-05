import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import ResourcePage from '@/components/ResourcePage';
import Evenements from '@/components/Evenements';
import Newsletter from '@/components/Newsletter';
import Abonnes from '@/components/Abonnes';
import Paiements from '@/components/Paiements';
import Reglements from '@/components/Reglements';
import Equipe from '@/components/Equipe';
import Journal from '@/components/Journal';
import Membres from '@/components/Membres';
import Bibliotheque from '@/components/ressources/Bibliotheque';
import { PAGES } from '@/lib/resources';

export const generateStaticParams = () => Object.keys(PAGES).map(module => ({ module }));

// Pages avec leur propre présentation (cartes, fil…) ; les autres modules restent en tableau
const CUSTOM: Record<string, () => React.ReactNode> = {
  events: () => <Evenements />, campaigns: () => <Newsletter />, subscribers: () => <Abonnes />,
  invoices: () => <Paiements />, reglements: () => <Reglements />, team_users: () => <Equipe />, journal: () => <Journal />, members: () => <Membres />,
  res_ressources: () => <Bibliotheque />,
};

// Les paramètres d'URL sont lus dans un composant sous <Suspense> : l'enveloppe de la page s'affiche tout de suite
export default function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  return (
    <Suspense fallback={<div className="card"><div className="skeleton"><span /><span /><span /></div></div>}>
      <Module params={params} />
    </Suspense>
  );
}

async function Module({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const page = Object.hasOwn(PAGES, module) ? PAGES[module] : null;
  if (!page) notFound();
  return CUSTOM[page.table]?.() ?? <ResourcePage table={page.table} />;
}
