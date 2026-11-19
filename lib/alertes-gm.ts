import "server-only";

import { envoyerCourriel, gabarit } from "@/lib/courriel";
import { prismaSysteme as db } from "@/lib/db";
import { adresseGM } from "@/lib/visite-gm";

export async function alerterGM(a: { sujet: string; titre: string; paragraphes: string[]; chambreId?: string }): Promise<void> {
  try {
    const comptes = await db.compteGM.findMany({ select: { email: true } });
    if (!comptes.length) return;
    const url = a.chambreId ? `${adresseGM()}/gm/chambres/${encodeURIComponent(a.chambreId)}` : `${adresseGM()}/gm`;
    const { html, texte } = gabarit({
      titre: a.titre,
      paragraphes: a.paragraphes,
      bouton: { libelle: a.chambreId ? "Ouvrir la fiche de la Chambre" : "Ouvrir l’espace administrateur", url },
    });
    await Promise.all(comptes.map((c) => envoyerCourriel({ a: c.email, sujet: a.sujet, html, texte, dePlateforme: true }).catch(() => false)));
  } catch (e) {
    console.error("[alertes GM]", e);
  }
}
