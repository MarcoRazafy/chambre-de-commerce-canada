import { q } from '@/lib/db';
import { avecMembre } from '@/lib/espace';
import { ressources } from '@/lib/espace-donnees';
import type { Row } from '@/lib/format';

// Recherche de la barre du haut de l'espace membre : seulement ce que le membre voit déjà dans ses pages
const SOURCES: [type: string, sql: string, href: (id: number) => string][] = [
  ['Membre', `select m.id, m.nom as titre, coalesce(s.nom, coalesce(m.ville, '')) as detail from members m left join secteurs s on s.id = m.secteur_id
              where m.statut in ('a_jour', 'attente', 'retard') and (m.nom ilike $1 or m.ville ilike $1 or m.activite ilike $1 or m.description ilike $1 or s.nom ilike $1
                    or exists (select 1 from produits p where p.member_id = m.id and (p.label ilike $1 or p.description ilike $1)))`, id => `/espace/annuaire/${id}`],
  ['Événement', `select id, titre, to_char(date_debut, 'DD/MM/YYYY') as detail from events where date_debut >= now() - interval '12 months' and (titre ilike $1 or lieu ilike $1)`, id => `/espace/evenements/${id}`],
  ['Actualité', `select id, titre, coalesce(categorie, '') as detail from news where publie and (titre ilike $1 or contenu ilike $1)`, id => `/espace/actualites?id=${id}`],
];

export const GET = (req: Request) => avecMembre(async m => {
  const term = (new URL(req.url).searchParams.get('q') ?? '').trim();
  if (term.length < 2) return Response.json([]);
  const like = '%' + term.replace(/[\\%_]/g, c => '\\' + c) + '%';
  const groups = await Promise.all(SOURCES.map(async ([type, sql, href]) =>
    (await q<{ id: number; titre: string; detail: string }>(sql + ' limit 8', [like])).map(r => ({ type, ...r, href: href(r.id) }))));
  // Ressources : mêmes droits d'accès que la page Ressources
  const t = term.toLowerCase();
  const res = (await ressources(m)).ressources.filter((r: Row) => `${r.titre} ${r.description ?? ''}`.toLowerCase().includes(t)).slice(0, 8)
    .map((r: Row) => ({ type: 'Ressource', id: r.id, titre: r.titre, detail: r.cat ?? '', href: `/espace/ressources/${r.id}` }));
  return Response.json([...groups.flat(), ...res]);
});
