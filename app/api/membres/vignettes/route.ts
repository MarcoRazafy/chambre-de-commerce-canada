import { withUser } from '@/lib/api-helpers';
import { currentUser } from '@/lib/auth';
import { membreConnecte } from '@/lib/espace';
import { vignettesProduits } from '@/lib/membres';

// Annuaire : les premières offres de chaque membre (titre et première photo)
export async function GET() {
  if (!(await currentUser()) && await membreConnecte()) return Response.json(await vignettesProduits());   // annuaire de l'espace membre
  return withUser(async () => Response.json(await vignettesProduits()));
}
