import { notFound } from '@/lib/crud';
import { num } from '@/lib/api-helpers';
import { avecMembre } from '@/lib/espace';
import { annoncer } from '@/lib/espace-donnees';
import { journal } from '@/lib/hooks';

// Le membre annonce avoir payé (MVola, virement…) : la Chambre vérifie puis confirme dans « Règlements à vérifier »
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return avecMembre(async m => {
    await annoncer(m, id, await req.json().catch(() => ({})));
    await journal('Paiements', 'Règlement annoncé depuis l’espace membre', m.entreprise, m.nom);
    return Response.json({ ok: true });
  });
}
