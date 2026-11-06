import { avecMembre } from '@/lib/espace';
import { ressources } from '@/lib/espace-donnees';

// Bibliothèque : seulement les dossiers et ressources ouverts à l'entreprise
export const GET = () => avecMembre(async m => Response.json(await ressources(m)));
