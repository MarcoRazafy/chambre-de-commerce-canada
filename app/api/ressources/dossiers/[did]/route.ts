import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { modifierDossier, supprimerDossier } from '@/lib/ressources';

type P = { params: Promise<{ did: string }> };

// Réglages d'un dossier (seuls les champs envoyés changent) ; suppression : son contenu remonte d'un niveau
export async function PATCH(req: Request, { params }: P) {
  const did = num((await params).did);
  if (Number.isNaN(did)) return notFound();
  return withUser(async u => { await modifierDossier(u, did, await req.json().catch(() => ({}))); return Response.json({ ok: true }); });
}

export async function DELETE(_: Request, { params }: P) {
  const did = num((await params).did);
  if (Number.isNaN(did)) return notFound();
  return withUser(async u => { await supprimerDossier(u, did); return Response.json({ ok: true }); });
}
