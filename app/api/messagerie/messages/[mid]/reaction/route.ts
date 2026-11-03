import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { react } from '@/lib/messaging';

// Réagir à un message : { emoji } (le même émoji une deuxième fois retire la réaction)
export async function POST(req: Request, { params }: { params: Promise<{ mid: string }> }) {
  const mid = num((await params).mid);
  if (Number.isNaN(mid)) return notFound();
  return withUser(async u => { await react(u, mid, String((await req.json()).emoji ?? '')); return Response.json({ ok: true }); });
}
