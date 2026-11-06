import { avecMembre } from '@/lib/espace';
import { evenements } from '@/lib/espace-donnees';

// Événements à venir, et si le contact connecté y est inscrit
export const GET = () => avecMembre(async m => Response.json(await evenements(m)));
