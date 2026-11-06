import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { charger, enregistrer } from '@/lib/maillage-serveur';

type Ctx = { params: Promise<{ id: string }> };

// Questionnaire de maillage d'un membre, lu ou rempli par l'équipe (pendant un entretien, par exemple)
export async function GET(_req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async () => Response.json(await charger(id)));
}

export async function PUT(req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => Response.json(await enregistrer(id, await req.json().catch(() => ({})), `Équipe · ${u.nom}`)));
}
