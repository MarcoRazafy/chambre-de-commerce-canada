import "server-only";

import { after } from "next/server";
import { courrielsActifs } from "@/lib/courriel";
import { prisma } from "@/lib/db";
import { fmtMontant } from "@/lib/membership";
import { notifierMembre } from "@/lib/push";
import { courrielRelanceFacture } from "@/lib/rappels-membres";
import { joursDepuis } from "@/lib/retards";

const memeJour = (a: Date, b: Date) => a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);

export async function relancerFactureMembre(
  id: string,
  acteur: string,
): Promise<{ ok: true; message: string } | { ok: false; erreur: string }> {
  const f = await prisma.invoice.findUnique({
    where: { id },
    select: { numero: true, objet: true, montant: true, devise: true, date: true, statut: true, relances: true, relanceeLe: true, memberId: true, member: { select: { nom: true } } },
  });
  if (!f) return { ok: false, erreur: "Facture introuvable." };
  if (f.statut !== "envoyee") return { ok: false, erreur: `La facture ${f.numero} est déjà réglée.` };
  if (!f.memberId || !f.member) return { ok: false, erreur: `La facture ${f.numero} n’est rattachée à aucun membre.` };
  const memberId = f.memberId;
  const maintenant = new Date();
  if (f.relanceeLe && memeJour(f.relanceeLe, maintenant)) {
    return { ok: false, erreur: `La facture ${f.numero} a déjà été relancée aujourd’hui : le membre l’a reçue.` };
  }

  const age = joursDepuis(f.date, maintenant);
  const echus = (await prisma.rappelMembre.findMany({ where: { declencheur: "facture" }, select: { jours: true } }))
    .map((r) => r.jours)
    .filter((j) => j <= age);
  await prisma.invoice.update({
    where: { id },
    data: { relanceeLe: maintenant, relances: [...new Set([...f.relances, ...echus])] },
  });
  const { email, envoye } = await courrielRelanceFacture(id);
  const somme = fmtMontant(f.montant, f.devise);
  after(() =>
    notifierMembre(memberId, {
      titre: `Facture ${f.numero} à régler`,
      corps: `${f.objet} · ${somme}`,
      url: `/membre/cotisations?regler=${id}`,
    }),
  );
  await prisma.auditLog.create({
    data: {
      action: "relance_envoyee",
      entite: "Member",
      entiteId: memberId,
      acteur,
      detail: `Facture ${f.numero} relancée${envoye ? ` : courriel envoyé à ${email}` : ""}.`,
    },
  });

  const courriel = envoye
    ? ` · courriel envoyé à ${email}`
    : !email
      ? " · aucun contact à qui écrire"
      : courrielsActifs()
        ? " · le courriel n’est pas parti"
        : "";
  return { ok: true, message: `Facture ${f.numero} relancée : elle s’affiche dans l’espace de ${f.member.nom}${courriel}` };
}
