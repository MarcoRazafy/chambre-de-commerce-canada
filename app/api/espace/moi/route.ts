import { q } from '@/lib/db';
import { avecMembre } from '@/lib/espace';
import { nonLus } from '@/lib/espace-donnees';
import { progression } from '@/lib/maillage';

// Qui est connecté, l'avancement du questionnaire, les messages non lus et les factures à régler (compteurs du menu)
export const GET = () => avecMembre(async m => {
  const [[mg], messages, [f]] = await Promise.all([
    q<{ reponses: Record<string, unknown> }>('select reponses from maillage where member_id = $1', [m.member_id]),
    nonLus(m),
    q<{ n: number }>(`select count(*)::int as n from invoices where member_id = $1 and statut in ('envoyee', 'retard')`, [m.member_id]),
  ]);
  return Response.json({ ...m, maillage: progression(mg?.reponses ?? {}), messages, factures: f.n });
});
