import { avecMembre } from '@/lib/espace';
import { actualites } from '@/lib/espace-donnees';

// Actualités publiées par la Chambre
export const GET = () => avecMembre(async () => Response.json(await actualites()));
