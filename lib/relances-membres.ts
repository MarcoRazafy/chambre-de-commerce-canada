import "server-only";

// Relances automatiques des factures impayées des membres, aux jours réglés par la Chambre (Paramètres → Courriels,
// « 7, 15, 30 » : jours après la date de la facture ; vide : aucune). Appelé par les tâches régulières, dans la
// Chambre. Une facture ne reçoit qu'une relance par jour réglé, et une seule par passage : à l'activation, une
// facture déjà ancienne reçoit une relance, pas toutes celles passées.
import { envoyerCourriel, urlPublique } from "@/lib/courriel";
import { prisma } from "@/lib/db";
import { fmtMontant } from "@/lib/membership";
import { courrielRelanceFacture } from "@/lib/modeles-courriels";
import { getProfilChambreBrut } from "@/lib/profil-chambre";
import { modesPublics } from "@/lib/reglements";
import { completerProfil } from "@/lib/profil-chambre-defauts";
import { joursDepuis, relanceDue } from "@/lib/retards";

export async function relancesMembresDues(maintenant = new Date()): Promise<number> {
  const brut = await getProfilChambreBrut();
  const jours = (brut?.relancesMembres ?? []).filter((j) => j > 0);
  if (!jours.length) return 0;
  const chambre = completerProfil(brut).nom;
  const factures = await prisma.invoice.findMany({
    where: { statut: "envoyee", memberId: { not: null }, member: { statut: { in: ["en_attente", "a_jour", "en_retard"] } } },
    orderBy: { date: "asc" },
    select: { id: true, numero: true, objet: true, montant: true, devise: true, date: true, relances: true, memberId: true, member: { select: { nom: true } } },
  });
  let envoyees = 0;
  for (const f of factures) {
    if (relanceDue(f, { relances: jours }, maintenant) === null) continue;
    const ecoules = joursDepuis(f.date, maintenant);
    const contact = await prisma.user.findFirst({
      where: { memberId: f.memberId, role: "membre" },
      orderBy: [{ contactPrincipal: "desc" }, { createdAt: "asc" }],
      select: { nom: true, email: true },
    });
    // Toutes les relances passées comptent comme faites (même sans contact : pas de rattrapage plus tard)
    const faites = [...new Set([...f.relances, ...jours.filter((j) => j <= ecoules)])];
    if (contact?.email) {
      const parti = await envoyerCourriel(
        courrielRelanceFacture(contact.email, {
          nom: contact.nom,
          chambre,
          numero: f.numero,
          objet: f.objet,
          montant: fmtMontant(f.montant, f.devise),
          jours: ecoules,
          enLigne: (await modesPublics(f.montant)).length > 0,
          lien: await urlPublique(`/membre/cotisations/${f.id}`),
        }),
      );
      // Courriel refusé : la relance sera retentée au prochain passage
      if (!parti) continue;
      envoyees++;
      await prisma.auditLog.create({
        data: { action: "relance_envoyee", entite: "Member", entiteId: f.memberId!, acteur: "Relance automatique", detail: `Facture ${f.numero} (${ecoules} jours) : relance envoyée à ${contact.email}.` },
      });
    }
    await prisma.invoice.update({ where: { id: f.id }, data: { relances: faites } });
  }
  return envoyees;
}
