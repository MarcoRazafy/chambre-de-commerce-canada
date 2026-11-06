import { avecMembre } from '@/lib/espace';
import { relations } from '@/lib/espace-donnees';

// Les mises en relation que la Chambre a faites pour l'entreprise
export const GET = () => avecMembre(async m => Response.json(await relations(m)));
