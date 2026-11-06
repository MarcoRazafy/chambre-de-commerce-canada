import { withUser } from '@/lib/api-helpers';
import { suivi } from '@/lib/maillage-serveur';

// Suivi du questionnaire de maillage : progression de chaque membre actif
export const GET = () => withUser(async () => Response.json(await suivi()));
