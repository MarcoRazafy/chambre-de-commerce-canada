'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Fragment } from 'react';
import { GROUP_ICON, NAV, type NavItem } from '@/lib/resources';
import Icon from './Icon';

// Pages hors menu
const EXTRA: Record<string, { label: string; icon: string }> = { profil: { label: 'Mon profil', icon: 'user' }, recherche: { label: 'Recherche', icon: 'search' } };
// Dernier maillon des fiches (/membres/5…)
const FICHE: Record<string, string> = { membres: 'Fiche membre', evenements: 'Événement', paiements: 'Facture', ressources: 'Dossier' };

const ITEMS = new Map<string, { item: NavItem; group: string }>(NAV.flatMap(([group, items]) => items.map(item => [item.slug, { item, group }] as const)));

type Crumb = { label: string; href?: string };

// Icône de la page (celle du menu) et maillons du chemin
function trail(path: string, q: string | null): { icon: string; crumbs: Crumb[] } {
  const [slug = '', id] = path.split('/').filter(Boolean);
  const hit = ITEMS.get(slug);
  if (!hit) {
    const extra = EXTRA[slug];
    const crumbs: Crumb[] = [{ label: extra?.label ?? slug }];
    if (slug === 'recherche' && q) crumbs.push({ label: `« ${q} »` });   // le mot cherché tient lieu de titre
    return { icon: extra?.icon ?? 'dash', crumbs };
  }
  const out: Crumb[] = [];
  if (GROUP_ICON[hit.group]) out.push({ label: hit.group });      // rubrique dépliable du menu : simple repère, sans lien
  const parent = hit.item.parent && ITEMS.get(hit.item.parent);
  if (parent) out.push({ label: parent.item.label, href: `/${parent.item.slug}` });
  out.push({ label: hit.item.label, href: slug ? `/${slug}` : '/' });
  if (id) out.push({ label: FICHE[slug] ?? 'Fiche' });
  out[out.length - 1].href = undefined;                             // la page courante n'est pas un lien
  return { icon: hit.item.icon, crumbs: out };
}

// Fil d'Ariane en haut de chaque page, calculé depuis l'adresse et le menu
export default function Breadcrumb() {
  const path = usePathname();
  const q = useSearchParams().get('q');
  const { icon, crumbs } = trail(path, q);
  return (
    <nav className="crumbs" aria-label="Fil d’Ariane">
      <span className="crumb-ic"><Icon name={icon} size={16} /></span>
      {crumbs.map((c, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="crumb-sep" aria-hidden="true">›</span>}
          {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</span>}
        </Fragment>
      ))}
    </nav>
  );
}
