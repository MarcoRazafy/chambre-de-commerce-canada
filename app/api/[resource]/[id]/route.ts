import { q, fail } from '@/lib/db';
import { clean, notFound, resourceOf, validId } from '@/lib/crud';

type Ctx = { params: Promise<{ resource: string; id: string }> };

async function target(params: Ctx['params']) {
  const { resource, id } = await params;
  const r = resourceOf(resource);
  return r && validId(id) ? { r, id: Number(id) } : null;
}

export async function GET(_req: Request, { params }: Ctx) {
  const t = await target(params);
  if (!t) return notFound();
  try {
    const [row] = await q(`select * from ${t.r.table} where id = $1`, [t.id]);
    return row ? Response.json(row) : notFound();
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const t = await target(params);
  if (!t) return notFound();
  try {
    const { cols, vals } = clean(t.r, await req.json(), false);
    if (!cols.length) return Response.json({ error: 'Aucun champ à modifier' }, { status: 400 });
    const set = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const [row] = await q(`update ${t.r.table} set ${set} where id = $${cols.length + 1} returning *`, [...vals, t.id]);
    return row ? Response.json(row) : notFound();
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const t = await target(params);
  if (!t) return notFound();
  try {
    const rows = await q(`delete from ${t.r.table} where id = $1 returning id`, [t.id]);
    return rows.length ? new Response(null, { status: 204 }) : notFound();
  } catch (e) {
    return fail(e);
  }
}
