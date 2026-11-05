import { withUser } from '@/lib/api-helpers';
import { catalogue, creerEtiquette, etiquettesPosees } from '@/lib/audiences';

// Catalogue des étiquettes (automatiques et posées par l'équipe, avec leurs effectifs) et qui porte quoi
export const GET = () => withUser(async () => Response.json({ ...(await catalogue()), posees: await etiquettesPosees() }));

export const POST = (req: Request) => withUser(async u => Response.json(await creerEtiquette(u, await req.json().catch(() => ({})))));
