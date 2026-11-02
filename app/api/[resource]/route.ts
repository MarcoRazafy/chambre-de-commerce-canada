import { q, fail } from '@/lib/db';
import { clean, notFound, resourceOf } from '@/lib/crud';

type Ctx = { params: Promise<{ resource: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const r = resourceOf((await params).resource);
  if (!r) return notFound();
  try {
    return Response.json(await q(`select * from ${r.table} order by ${r.orderBy}`));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const r = resourceOf((await params).resource);
  if (!r) return notFound();
  try {
    const { cols, vals } = clean(r, await req.json(), true);
    const sql = cols.length
      ? `insert into ${r.table} (${cols.join(', ')}) values (${cols.map((_, i) => '$' + (i + 1)).join(', ')}) returning *`
      : `insert into ${r.table} default values returning *`;
    const [row] = await q(sql, vals);
    return Response.json(row, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
