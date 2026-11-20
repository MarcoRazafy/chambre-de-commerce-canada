import "server-only";

import { noter } from "@/lib/abonnement-stripe";
import { avecChambre, oublierAdresses } from "@/lib/chambre-courante";
import { prismaSysteme as db } from "@/lib/db";
import { factureDeDemarrage } from "@/lib/factures-plateforme";
import { estFonction, libellesFonctions } from "@/lib/fonctions-plateforme";
import { forfaitOffre, offreGratuite } from "@/lib/plateforme";

export async function appliquerOffre(chambreId: string, offreId: string, fonctions: string[], acteur: string): Promise<boolean> {
  const offre = await db.offre.findUnique({ where: { id: offreId } });
  if (!offre) return false;
  const choisies = offre.surMesure ? [...new Set(fonctions.filter(estFonction))].filter((f) => offre.fonctions.includes(f)) : [];
  const payante = !offreGratuite({ forfait: forfaitOffre(offre, choisies), parUtilisateur: offre.parUtilisateur });

  await db.facturePlateforme.deleteMany({ where: { chambreId, payeeLe: null } });
  await db.chambre.update({
    where: { id: chambreId },
    data: { offreId: offre.id, fonctionsChoisies: choisies, demarrage: payante ? "paiement" : "infos", paiementDiffere: false },
  });
  await noter(chambreId, "offre_choisie", `Offre ${offre.nom}.${offre.surMesure ? ` Fonctions : ${libellesFonctions(choisies) || "aucune"}.` : ""}`, acteur);
  oublierAdresses();
  if (payante) await avecChambre(chambreId, () => factureDeDemarrage());
  return true;
}
