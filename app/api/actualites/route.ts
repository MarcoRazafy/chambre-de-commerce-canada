import { uploads, withUser } from '@/lib/api-helpers';
import { listNews, newsFields, saveNews } from '@/lib/news';

// Liste des actualités (colonne de droite)
export async function GET() {
  return withUser(async () => Response.json(await listNews()));
}

// Nouvelle actualité : formulaire multipart (titre, categorie, date_pub, publie, contenu, tags en JSON, files)
export async function POST(req: Request) {
  return withUser(async u => {
    const form = await req.formData();
    const id = await saveNews(u, null, newsFields(form), await uploads(form), []);
    return Response.json({ id }, { status: 201 });
  });
}
