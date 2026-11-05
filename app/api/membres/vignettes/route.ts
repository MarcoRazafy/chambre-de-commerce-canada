import { withUser } from '@/lib/api-helpers';
import { vignettesProduits } from '@/lib/membres';

// Annuaire : les premières offres de chaque membre (titre et première photo)
export async function GET() {
  return withUser(async () => Response.json(await vignettesProduits()));
}
