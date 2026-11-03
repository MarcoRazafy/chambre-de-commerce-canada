import { notFound } from '@/lib/crud';
import { num, uploads, withUser } from '@/lib/api-helpers';
import { deleteNews, getNews, jsonList, newsFields, saveNews, setPublished } from '@/lib/news';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => Response.json(await getNews(u, id)));
}

// Modification : multipart (mêmes champs que la création, files = médias ajoutés, remove = ids des médias retirés en JSON)
// ou JSON { publie } pour publier / dépublier seulement
export async function PATCH(req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => {
    if (req.headers.get('content-type')?.includes('application/json')) {
      await setPublished(u, id, !!(await req.json()).publie);
      return Response.json({ ok: true });
    }
    const form = await req.formData();
    const remove = jsonList(form.get('remove')).map(Number).filter(Number.isInteger);
    await saveNews(u, id, newsFields(form), await uploads(form), remove);
    return Response.json({ id });
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => { await deleteNews(u, id); return new Response(null, { status: 204 }); });
}
