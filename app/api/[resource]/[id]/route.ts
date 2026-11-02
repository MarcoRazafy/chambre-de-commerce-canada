import { q, fail } from '@/lib/db';
import { guard } from '@/lib/auth';
import { afterWrite } from '@/lib/hooks';
import { bad, baseSelect, clean, notFound, resourceOf, strip, validId } from '@/lib/crud';

type Ctx = { params: Promise<{ resource: string; id: string }> };

async function target(params: Ctx['params']) {
  const { resource, id } = await params;
  const r = resourceOf(resource);
  return r && validId(id) ? { r, id: Number(id) } : null;
}

export async function GET(_req: Request, { params }: Ctx) {
  const t = await target(params);
  if (!t) return notFound();
  const u = await guard();
  if (u instanceof Response) return u;
  try {
    const [row] = await q(`${baseSelect(t.r)} where id = $1`, [t.id]);
    return row ? Response.json(strip(row)) : notFound();
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const t = await target(params);
  if (!t) return notFound();
  const u = await guard(t.r.admin);
  if (u instanceof Response) return u;
  try {
    const body = await req.json();
    if (t.r.table === 'team_users' && t.id === u.id && (body.actif === false || (body.role && body.role !== 'Administrateur')))
      return bad('Vous ne pouvez pas désactiver votre propre compte ni retirer vos droits d’administrateur');
    const { cols, vals } = await clean(t.r, body, false);
    if (!cols.length) return bad('Aucun champ à modifier');
    const set = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const [row] = await q(`update ${t.r.table} set ${set} where id = $${cols.length + 1} returning *`, [...vals, t.id]);
    if (!row) return notFound();
    await afterWrite(t.r, 'modification', row, u.nom);
    return Response.json(strip(row));
  } catch (e) {
    return e instanceof RangeError ? bad(e.message) : fail(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const t = await target(params);
  if (!t) return notFound();
  const u = await guard(t.r.admin);
  if (u instanceof Response) return u;
  if (t.r.table === 'team_users' && t.id === u.id) return bad('Vous ne pouvez pas supprimer votre propre compte');
  try {
    const [row] = await q(`delete from ${t.r.table} where id = $1 returning *`, [t.id]);
    if (!row) return notFound();
    await afterWrite(t.r, 'suppression', row, u.nom);
    return new Response(null, { status: 204 });
  } catch (e) {
    return fail(e);
  }
}
