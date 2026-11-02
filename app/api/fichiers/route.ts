import { q, fail } from '@/lib/db';
import { guard } from '@/lib/auth';
import { journal } from '@/lib/hooks';

const MAX = 15 * 1024 * 1024;

// Liste des fichiers d'un dossier (sans le contenu) : /api/fichiers?dossier_id=3
export async function GET(req: Request) {
  const u = await guard();
  if (u instanceof Response) return u;
  const id = Number(new URL(req.url).searchParams.get('dossier_id'));
  if (!Number.isInteger(id)) return Response.json({ error: 'dossier_id requis' }, { status: 400 });
  try {
    return Response.json(await q('select id, dossier_id, nom, type, taille, created_at from fichiers where dossier_id = $1 order by created_at desc', [id]));
  } catch (e) {
    return fail(e);
  }
}

// Dépôt (formulaire multipart : dossier_id + un ou plusieurs « file »), 15 Mo maximum par fichier
export async function POST(req: Request) {
  const u = await guard();
  if (u instanceof Response) return u;
  try {
    const form = await req.formData();
    const dossier = Number(form.get('dossier_id'));
    const files = form.getAll('file').filter((f): f is File => f instanceof File);
    if (!Number.isInteger(dossier) || !files.length) return Response.json({ error: 'Dossier et fichier requis' }, { status: 400 });
    const tooBig = files.find(f => f.size > MAX);
    if (tooBig) return Response.json({ error: `« ${tooBig.name} » dépasse 15 Mo` }, { status: 400 });
    for (const f of files)
      await q('insert into fichiers (dossier_id, nom, type, taille, contenu) values ($1, $2, $3, $4, $5)',
        [dossier, f.name, f.type || 'application/octet-stream', f.size, Buffer.from(await f.arrayBuffer())]);
    await journal('Contenus', 'Fichier(s) déposé(s)', files.map(f => f.name).join(', '), u.nom);
    return Response.json({ ok: true, n: files.length }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
