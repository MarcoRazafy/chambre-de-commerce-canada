import { notFound } from '@/lib/crud';
import { currentUser } from '@/lib/auth';
import { membreConnecte } from '@/lib/espace';
import { fileResponse, num, withUser } from '@/lib/api-helpers';
import { photoProduit } from '@/lib/membres';

// Photo d'une offre du catalogue d'un membre
export async function GET(req: Request, { params }: { params: Promise<{ phid: string }> }) {
  const phid = num((await params).phid);
  if (Number.isNaN(phid)) return notFound();
  const lire = async () => { const f = await photoProduit(phid); return fileResponse(req, { nom: f.nom, type: f.type, contenu: f.contenu }); };
  // Espace membre : les photos du catalogue sont visibles dans l'annuaire des membres
  if (!(await currentUser()) && await membreConnecte()) return lire().catch(() => notFound());
  return withUser(lire);
}
