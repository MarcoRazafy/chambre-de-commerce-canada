import { q, fail } from '@/lib/db';
import { notFound } from '@/lib/crud';
import { SETTINGS } from '@/lib/resources';
import { guard } from '@/lib/auth';
import { journal } from '@/lib/hooks';

type Ctx = { params: Promise<{ cle: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { cle } = await params;
  if (!Object.hasOwn(SETTINGS, cle)) return notFound();
  const u = await guard();
  if (u instanceof Response) return u;
  try {
    const [row] = await q<{ valeur: object }>('select valeur from settings where cle = $1', [cle]);
    return Response.json(row?.valeur ?? {});
  } catch (e) {
    return fail(e);
  }
}

// Enregistre uniquement les champs connus pour cette clé
export async function PUT(req: Request, { params }: Ctx) {
  const { cle } = await params;
  if (!Object.hasOwn(SETTINGS, cle)) return notFound();
  const u = await guard(true);
  if (u instanceof Response) return u;
  const body = await req.json();
  const valeur = Object.fromEntries(SETTINGS[cle].fields.filter(f => f.name in body).map(f => [f.name, body[f.name]]));
  try {
    const [row] = await q<{ valeur: object }>(
      `insert into settings (cle, valeur) values ($1, $2) on conflict (cle) do update set valeur = excluded.valeur returning valeur`,
      [cle, JSON.stringify(valeur)]);
    await journal('Système', 'Réglages modifiés', SETTINGS[cle].title, u.nom);
    return Response.json(row.valeur);
  } catch (e) {
    return fail(e);
  }
}
