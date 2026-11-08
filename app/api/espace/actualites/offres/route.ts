import { avecMembre } from '@/lib/espace';
import { offres } from '@/lib/news-membres';

// Dernières offres des autres membres (colonne de droite des actualités)
export const GET = () => avecMembre(async m => Response.json(await offres(m)));
