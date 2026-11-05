import { withUser } from '@/lib/api-helpers';
import { apercu, lireRegle } from '@/lib/audiences';

// Qui recevrait la lettre avec ce choix : nombre exact, sans doublon ni désabonné, et la liste
export const POST = (req: Request) => withUser(async () => Response.json(await apercu(lireRegle(await req.json().catch(() => ({}))))));
