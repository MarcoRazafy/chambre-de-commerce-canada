import { timingSafeEqual } from 'node:crypto';
import { runJobs } from '@/lib/jobs';

// Déclenchement externe des tâches automatiques : GET /api/cron avec l'en-tête « Authorization: Bearer <CRON_SECRET> »
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(req.headers.get('authorization')?.replace(/^Bearer /, '') ?? '');
  if (!secret || given.length !== Buffer.byteLength(secret) || !timingSafeEqual(given, Buffer.from(secret)))
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  await runJobs();
  return Response.json({ ok: true });
}
