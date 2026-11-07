import { avecMembre } from '@/lib/espace';
import { ajouterContact, contacts } from '@/lib/espace-donnees';

// Les contacts de l'entreprise du membre connecté
export const GET = () => avecMembre(async m => Response.json(await contacts(m)));

export const POST = (req: Request) => avecMembre(async m => {
  const id = await ajouterContact(m, await req.json().catch(() => ({})));
  return Response.json({ id }, { status: 201 });
});
