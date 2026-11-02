import { closeSession } from '@/lib/auth';

export async function POST() {
  await closeSession();
  return Response.json({ ok: true });
}
