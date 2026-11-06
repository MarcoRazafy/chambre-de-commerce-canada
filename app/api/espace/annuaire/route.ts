import { avecMembre } from '@/lib/espace';
import { annuaire } from '@/lib/espace-donnees';

// Annuaire des membres actifs (présentation publique de chaque entreprise)
export const GET = () => avecMembre(async () => Response.json(await annuaire()));
