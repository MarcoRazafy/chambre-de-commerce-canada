import { deconnecter } from '@/lib/espace';

export async function POST() {
  await deconnecter();
  return Response.json({ ok: true });
}
