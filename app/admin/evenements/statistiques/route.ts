import { exigerEquipe } from "@/lib/autorisations";
import { reponseCsv, versCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { AUCUN, fmtPourcentCsv, lirePeriode, selection, statistiques, type ComptesPresence } from "@/lib/evenements-stats";
import { fmtMoney } from "@/lib/format";
import { marquerAbsentsPasses } from "@/lib/presences";
import { getEvents } from "@/lib/queries";

// Statistiques des événements affichés (période et recherche de la page) : inscriptions, présences, remplissage
export async function GET(requete: Request) {
  await exigerEquipe();
  const params = new URL(requete.url).searchParams;
  const periode = lirePeriode(params.get("periode") ?? undefined);
  const q = (params.get("q") ?? "").trim().slice(0, 100);

  // Les inscrits jamais pointés d'un événement terminé comptent comme absents, comme sur la liste des participants
  await marquerAbsentsPasses();
  const [events, presences, membres] = await Promise.all([
    getEvents(),
    prisma.attendee.groupBy({ by: ["eventId", "statut"], _count: { _all: true } }),
    prisma.registration.groupBy({ by: ["eventId"], _count: { _all: true } }),
  ]);
  const comptes = new Map<string, ComptesPresence>();
  for (const p of presences) {
    const c = comptes.get(p.eventId) ?? { ...AUCUN };
    c[p.statut] += p._count._all;
    comptes.set(p.eventId, c);
  }
  const entreprises = new Map(membres.map((r) => [r.eventId, r._count._all]));

  const csv = versCsv(
    [
      "Date", "Début", "Fin", "Événement", "Lieu", "Format", "Diffusion", "Tarif",
      "Capacité", "Inscrits", "Remplissage", "Entreprises membres", "Présents", "Absents",
      "À valider", "Inscrits non pointés", "Taux de présence",
    ],
    selection(events, periode, q).map((e) => {
      const s = statistiques(e.cap, comptes.get(e.id) ?? AUCUN);
      return [
        e.date.split("-").reverse().join("/"), e.debut, e.fin, e.titre, e.lieu, e.format,
        e.public ? "Public" : "Plateforme", e.payant ? fmtMoney(e.prix) : "Inclus",
        e.cap, s.inscrits, fmtPourcentCsv(s.remplissage), entreprises.get(e.id) ?? 0, s.presents, s.absents,
        s.aValider, s.nonPointes, fmtPourcentCsv(s.tauxPresence),
      ];
    }),
  );
  return reponseCsv(`statistiques-evenements-${periode === "passes" ? "passes" : "a-venir"}`, csv);
}
