import { notFound } from '@/lib/crud';
import { num } from '@/lib/api-helpers';
import { avecMembre } from '@/lib/espace';
import { desinscrire, inscrire } from '@/lib/espace-donnees';
import { journal } from '@/lib/hooks';

type Ctx = { params: Promise<{ id: string }> };

// POST : s'inscrire ; DELETE : se désinscrire (le contact connecté)
export async function POST(_req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return avecMembre(async m => {
    const e = await inscrire(m, id);
    await journal('Événements', 'Inscription depuis l’espace membre', `${e.titre} · ${m.entreprise}`, m.nom);
    return Response.json({ ok: true });
  });
}
export async function DELETE(_req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return avecMembre(async m => { await desinscrire(m, id); return Response.json({ ok: true }); });
}
