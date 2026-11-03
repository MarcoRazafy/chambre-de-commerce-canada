import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { forward } from '@/lib/messaging';

// Transférer un message vers une autre conversation : { thread_id }
export async function POST(req: Request, { params }: { params: Promise<{ mid: string }> }) {
  const mid = num((await params).mid);
  if (Number.isNaN(mid)) return notFound();
  return withUser(async u => {
    const target = Number((await req.json()).thread_id);
    if (!Number.isInteger(target)) return Response.json({ error: 'Choisissez une conversation' }, { status: 400 });
    return Response.json(await forward(u, mid, target), { status: 201 });
  });
}
