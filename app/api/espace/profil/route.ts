import { q } from '@/lib/db';
import { avecMembre } from '@/lib/espace';
import { journal } from '@/lib/hooks';
import { MsgError } from '@/lib/messaging';

// Ce que le membre peut modifier lui-même : la présentation de son entreprise, et ses coordonnées de contact
const ENTREPRISE = ['activite', 'description', 'site_web', 'ville', 'recherche', 'statut_juridique'] as const;
const CADRAGE = ['couverture_x', 'couverture_y'] as const;   // position de la couverture (0 à 100)
const CONTACT = ['fonction', 'tel'] as const;

export const GET = () => avecMembre(async m => {
  const [e] = await q(`select m.id, m.nom, m.pays, m.ville, m.activite, m.description, m.site_web, m.recherche, m.statut_juridique, m.statut,
                              m.membre_depuis, m.renouvellement, m.offres, m.besoins, s.nom as secteur, f.nom as formule, m.couverture_url, m.couverture_x, m.couverture_y,
                              exists (select 1 from avatars a where a.kind = 'cover' and a.ref_id = m.id) as couverture_deposee
                       from members m left join secteurs s on s.id = m.secteur_id left join formules f on f.id = m.formule_id where m.id = $1`, [m.member_id]);
  const [moi] = await q('select id, nom, fonction, email, tel from contacts where id = $1', [m.contact_id]);
  return Response.json({ entreprise: e, moi });
});

export const PATCH = (req: Request) => avecMembre(async m => {
  const b = await req.json().catch(() => ({}));
  const champs = (cles: readonly string[], src: Record<string, unknown>) => cles.filter(k => k in src).map(k => {
    const v = src[k] == null ? '' : String(src[k]).trim().slice(0, 4000);
    return [k, v || null] as const;
  });
  const cadre = CADRAGE.filter(k => k in (b.entreprise ?? {})).map(k => [k, Math.max(0, Math.min(100, Math.round(Number(b.entreprise[k]) || 0)))] as const);
  const e = [...champs(ENTREPRISE, b.entreprise ?? {}), ...cadre], c = champs(CONTACT, b.moi ?? {});
  if (!e.length && !c.length) throw new MsgError('Aucune modification');
  // Noms de colonnes tirés des listes ci-dessus, jamais de la requête
  if (e.length) await q(`update members set ${e.map(([k], i) => `${k} = $${i + 2}`).join(', ')} where id = $1`, [m.member_id, ...e.map(([, v]) => v)]);
  if (c.length) await q(`update contacts set ${c.map(([k], i) => `${k} = $${i + 2}`).join(', ')} where id = $1`, [m.contact_id, ...c.map(([, v]) => v)]);
  await journal('Adhésions', 'Profil modifié depuis l’espace membre', m.entreprise, m.nom);
  return Response.json({ ok: true });
});
