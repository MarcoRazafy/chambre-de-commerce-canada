import "server-only";

import { prisma } from "@/lib/db";
import { jourBase } from "@/lib/format";
import { FUSEAU_CANCHAM, instantDans, saisieDans } from "@/lib/fuseau";
import { getFuseau } from "@/lib/fuseau-chambre";


export function maintenant(fuseau = FUSEAU_CANCHAM): number {
  const impose = process.env.CANCHAM_TODAY;
  if (!impose) return Date.now();
  return instantDans(impose, saisieDans(Date.now(), fuseau).slice(11, 16), fuseau);
}

export function finEvenement(e: {
  date: Date | string;
  fin: string | null;
}, fuseau = FUSEAU_CANCHAM): number {
  const jour =
    typeof e.date === "string"
      ? e.date.slice(0, 10)
      : e.date.toISOString().slice(0, 10);
  return instantDans(jour, e.fin ?? "23:59", fuseau);
}

export function estTermine(e: {
  date: Date | string;
  fin: string | null;
}, fuseau = FUSEAU_CANCHAM): boolean {
  return finEvenement(e, fuseau) <= maintenant(fuseau);
}

export async function marquerAbsentsPasses(eventId?: string): Promise<void> {
  const candidats = await prisma.event.findMany({
    where: {
      ...(eventId ? { id: eventId } : {}),
      date: { lte: jourBase() },
      participants: { some: { statut: { in: ["a_valider", "confirme"] } } },
    },
    select: { id: true, date: true, fin: true },
  });
  const fuseau = await getFuseau();
  const termines = candidats.filter((e) => estTermine(e, fuseau)).map((e) => e.id);
  if (!termines.length) return;
  await prisma.attendee.updateMany({
    where: {
      eventId: { in: termines },
      statut: { in: ["a_valider", "confirme"] },
    },
    data: { statut: "absent" },
  });
}
