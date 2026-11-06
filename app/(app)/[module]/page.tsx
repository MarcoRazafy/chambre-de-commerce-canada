import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import ResourcePage from '@/components/ResourcePage';
import Evenements from '@/components/Evenements';
import Equipe from '@/components/Equipe';
import Journal from '@/components/Journal';
import Membres from '@/components/Membres';
import { FacturesPaiements, MisesEnRelation, NewsletterGroupe, RendezVousGroupe, RessourcesGroupe } from '@/components/PagesGroupees';
import { PAGES } from '@/lib/resources';

export const generateStaticParams = () => Object.keys(PAGES).map(module => ({ module }));

// Pages avec leur propre présentation (cartes, fil…) ; les autres modules restent en tableau
const CUSTOM: Record<string, () => React.ReactNode> = {
  events: () => <Evenements />, team_users: () => <Equipe />, journal: () => <Journal />, members: () => <Membres />,
  // Pages réunies en onglets (maquette « Propositions UX »)
  invoices: () => <FacturesPaiements />, campaigns: () => <NewsletterGroupe />, rendez_vous: () => <RendezVousGroupe />,
  res_ressources: () => <RessourcesGroupe />, connections: () => <MisesEnRelation />,
};

// Anciennes pages devenues un onglet d'une page regroupée
const ONGLET: Record<string, string> = {
  reglements: '/paiements?onglet=reglements', lettre: '/newsletter?onglet=abonnes', envois: '/newsletter?onglet=envois',
  'types-rendez-vous': '/rendez-vous?onglet=types', services: '/ressources?onglet=services',
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
  if (Object.hasOwn(ONGLET, module)) redirect(ONGLET[module]);
  const page = Object.hasOwn(PAGES, module) ? PAGES[module] : null;
  if (!page) notFound();
  return CUSTOM[page.table]?.() ?? <ResourcePage table={page.table} />;
}
