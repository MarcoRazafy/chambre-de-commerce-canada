import { notFound } from 'next/navigation';
import ResourcePage from '@/components/ResourcePage';
import { PAGES } from '@/lib/resources';

export const generateStaticParams = () => Object.keys(PAGES).map(module => ({ module }));

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const page = Object.hasOwn(PAGES, module) ? PAGES[module] : null;
  if (!page) notFound();
  return <ResourcePage table={page.table} group={page.group} />;
}
