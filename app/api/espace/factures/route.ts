import { avecMembre } from '@/lib/espace';
import { factures } from '@/lib/espace-donnees';

// Factures de l'entreprise
export const GET = () => avecMembre(async m => Response.json(await factures(m)));
