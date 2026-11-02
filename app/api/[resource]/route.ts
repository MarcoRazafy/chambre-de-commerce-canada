import { q, fail } from '@/lib/db';
import { guard } from '@/lib/auth';
import { afterWrite } from '@/lib/hooks';
import { emailInvoice } from '@/lib/business';
import { bad, baseSelect, clean, filters, notFound, resourceOf, strip } from '@/lib/crud';

type Ctx = { params: Promise<{ resource: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const r = resourceOf((await params).resource);
  if (!r) return notFound();
  const u = await guard();
  if (u instanceof Response) return u;
  try {
    const f = filters(r, req.url);
    return Response.json((await q(`${baseSelect(r)}${f.where} order by ${r.orderBy}`, f.vals)).map(strip));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const r = resourceOf((await params).resource);
  if (!r) return notFound();
  const u = await guard(r.admin);
  if (u instanceof Response) return u;
  try {
    const { cols, vals } = await clean(r, await req.json(), true);
    const sql = cols.length
      ? `insert into ${r.table} (${cols.join(', ')}) values (${cols.map((_, i) => '$' + (i + 1)).join(', ')}) returning *`
      : `insert into ${r.table} default values returning *`;
    const [row] = await q(sql, vals);
    await afterWrite(r, 'ajout', row, u.nom);
    if (r.table === 'invoices') {
      await q(`update invoices set historique = historique || jsonb_build_array(jsonb_build_object('d', now(), 't', 'Facture émise')) where id = $1`, [row.id]);
      await emailInvoice(row, u.nom).catch(e => console.error('[facture]', e.message));
    }
    return Response.json(strip(row), { status: 201 });
  } catch (e) {
    return e instanceof RangeError ? bad(e.message) : fail(e);
  }
}
