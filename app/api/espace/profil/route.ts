import { q } from '@/lib/db';
import { avecMembre } from '@/lib/espace';
import { journal } from '@/lib/hooks';
import { MsgError } from '@/lib/messaging';

// Ce que le membre peut modifier lui-même : la présentation de son entreprise, et ses coordonnées de contact
const ENTREPRISE = ['activite', 'description', 'site_web', 'ville', 'recherche', 'statut_juridique'] as const;
const CONTACT = ['fonction', 'tel'] as const;

export const GET = () => avecMembre(async m => {
  const [e] = await q(`select m.id, m.nom, m.pays, m.ville, m.activite, m.description, m.site_web, m.recherche, m.statut_juridique,
                              m.membre_depuis, m.renouvellement, s.nom as secteur, f.nom as formule
                       from members m left join secteurs s on s.id = m.secteur_id left join formules f on f.id = m.formule_id where m.id = $1`, [m.member_id]);
  const [moi] = await q('select id, nom, fonction, email, tel from contacts where id = $1', [m.contact_id]);
  const equipe = await q('select id, nom, fonction, principal from contacts where member_id = $1 order by principal desc, nom', [m.member_id]);
  return Response.json({ entreprise: e, moi, equipe });
});

export const PATCH = (req: Request) => avecMembre(async m => {
  const b = await req.json().catch(() => ({}));
  const champs = (cles: readonly string[], src: Record<string, unknown>) => cles.filter(k => k in src).map(k => {
    const v = src[k] == null ? '' : String(src[k]).trim().slice(0, 4000);
    return [k, v || null] as const;
  });
  const e = champs(ENTREPRISE, b.entreprise ?? {}), c = champs(CONTACT, b.moi ?? {});
  if (!e.length && !c.length) throw new MsgError('Aucune modification');
  // Noms de colonnes tirés des listes ci-dessus, jamais de la requête
  if (e.length) await q(`update members set ${e.map(([k], i) => `${k} = $${i + 2}`).join(', ')} where id = $1`, [m.member_id, ...e.map(([, v]) => v)]);
  if (c.length) await q(`update contacts set ${c.map(([k], i) => `${k} = $${i + 2}`).join(', ')} where id = $1`, [m.contact_id, ...c.map(([, v]) => v)]);
  await journal('Adhésions', 'Profil modifié depuis l’espace membre', m.entreprise, m.nom);
  return Response.json({ ok: true });
});
