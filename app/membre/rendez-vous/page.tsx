import { CalendarClock } from "lucide-react";
import { OngletsAgenda } from "@/components/OngletsAgenda";
import { CarteRendezvous } from "@/components/rendezvous/CarteRendezvous";
import { Reservation } from "@/components/rendezvous/Reservation";
import { Banner, EmptyState, SectionTitle, ViewHead } from "@/components/ui";
import { estHeure, estJourISO } from "@/lib/agenda";
import { aujourdhuiISO } from "@/lib/format";
import {
  getCreneaux,
  getMesRendezvous,
  getTypesRendezvous,
} from "@/lib/rendezvous-donnees";
import { getCurrentUser } from "@/lib/session";

export default async function RendezvousPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; jour?: string; h?: string }>;
}) {
  const p = await searchParams;
  const user = await getCurrentUser("membre");

  const [types, mes] = await Promise.all([
    getTypesRendezvous(),
    getMesRendezvous(user.id),
  ]);

  const type = types.find((t) => t.id === p.type) ?? null;
  const jours = type ? await getCreneaux(type) : [];
  const jour =
    estJourISO(p.jour) && jours.some((j) => j.jour === p.jour) ? p.jour : null;
  const heure = estHeure(p.h) ? p.h : null;

  return (
    <>
      <OngletsAgenda espace="membre" actif="rdv" />
      <ViewHead title="Rendez-vous" />

      <SectionTitle>Vos rendez-vous à venir</SectionTitle>
      <div className="mb-7">
        {mes.length ? (
          <div className="flex flex-col gap-2.5">
            {mes.map((rdv) => (
              <CarteRendezvous
                key={rdv.id}
                rdv={rdv}
                aujourdhui={aujourdhuiISO()}
                retour="/membre/rendez-vous"
                cote="membre"
              />
            ))}
          </div>
        ) : (
          <EmptyState>
            <CalendarClock size={22} className="mx-auto mb-2 text-faint" />
            Aucun rendez-vous prévu. Choisissez un créneau ci-dessous.
          </EmptyState>
        )}
      </div>

      <SectionTitle>Prendre un rendez-vous</SectionTitle>
      {p.type && !type ? (
        <div className="mb-4">
          <Banner tone="warn" title="Ce rendez-vous n’est plus proposé">
            {types.length
              ? "Choisissez-en un autre ci-dessous."
              : "Aucun rendez-vous n’est ouvert pour le moment."}
          </Banner>
        </div>
      ) : null}
      <Reservation
        types={types}
        type={type}
        jours={jours}
        jour={jour}
        heure={heure}
      />
    </>
  );
}
