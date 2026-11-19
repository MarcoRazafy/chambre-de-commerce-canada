import "server-only";

import { envoyerCourriel, urlPublique } from "@/lib/courriel";
import { prisma } from "@/lib/db";
import { courrielPaiementEquipe, courrielPaiementRecu } from "@/lib/modeles-courriels";
import { courrielEquipe } from "@/lib/parametres";
import { getProfilChambre } from "@/lib/profil-chambre";

export async function avertirPaiement(d: {
  facture: { id: string; numero: string; objet: string } | null;
  membreId: string | null;
  nom: string | null;
  eventId: string | null;
  montant: string;
  moyen: string;
}) {
  try {
    const [profil, equipe] = await Promise.all([getProfilChambre(), courrielEquipe()]);
    const f = d.facture;
    if (f && d.membreId) {
      const contact = await prisma.user.findFirst({
        where: { memberId: d.membreId, role: "membre" },
        orderBy: [{ contactPrincipal: "desc" }, { createdAt: "asc" }],
        select: { email: true, nom: true },
      });
      if (contact?.email) {
        await envoyerCourriel(
          courrielPaiementRecu(contact.email, {
            nom: contact.nom,
            chambre: profil.nom,
            objet: f.objet,
            numero: f.numero,
            montant: d.montant,
            moyen: d.moyen,
            lien: await urlPublique(`/membre/cotisations/${f.id}`),
          }),
        );
      }
    }
    const evenement = !f && d.eventId ? await prisma.event.findUnique({ where: { id: d.eventId }, select: { titre: true } }) : null;
    await envoyerCourriel(
      courrielPaiementEquipe(equipe, {
        qui: d.nom ?? (evenement ? "Une inscription publique" : "Un membre"),
        objet: f?.objet ?? (evenement ? `Inscription : ${evenement.titre}` : "Paiement en ligne"),
        numero: f?.numero ?? null,
        montant: d.montant,
        moyen: d.moyen,
        lien: await urlPublique(f ? `/admin/paiements/${f.id}` : "/admin/reglements"),
      }),
    );
  } catch (e) {
    console.error("[paiement] courriels après le paiement", e);
  }
}
