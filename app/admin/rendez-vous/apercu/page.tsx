import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { EnTeteAdmin } from "@/components/admin/ui";
import { Reservation } from "@/components/rendezvous/Reservation";
import { Banner } from "@/components/ui";
import { estHeure, estJourISO } from "@/lib/agenda";
import { aujourdhuiISO } from "@/lib/format";
import { estMois } from "@/lib/rendezvous";
import { getCreneaux, getTypesRendezvous } from "@/lib/rendezvous-donnees";
import { getCurrentUser } from "@/lib/session";

const BASE = "/admin/rendez-vous/apercu";

// Aperçu de la page de réservation, telle que les membres la voient (rien ne s'y réserve)
export default async function ApercuReservation({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; jour?: string; h?: string; mois?: string }>;
}) {
  await getCurrentUser("admin");
  const p = await searchParams;
  const tous = await getTypesRendezvous(true);
  const proposes = await getTypesRendezvous();
  // Un type masqué ou d'une personne qui ne reçoit pas s'affiche aussi, pour le vérifier avant de l'ouvrir
  const type = tous.find((t) => t.id === p.type) ?? null;
  const jours = type ? await getCreneaux(type) : [];
  const jour = estJourISO(p.jour) && jours.some((j) => j.jour === p.jour) ? p.jour : null;
  const visible = !type || proposes.some((t) => t.id === type.id);

  return (
    <>
      <Link href="/admin/rendez-vous?onglet=types" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted no-underline hover:text-accent mb-4">
        <ArrowLeft size={14} /> Types de rendez-vous
      </Link>
      <EnTeteAdmin surtitre="Aperçu membre" titre="Page de réservation">
        Ce que voient les membres. Vous pouvez parcourir les jours et les créneaux ; rien ne se réserve depuis cet aperçu.
      </EnTeteAdmin>
      {visible ? null : (
        <div className="mb-4">
          <Banner tone="warn" icon={<Eye size={17} />} title="Les membres ne voient pas encore ce rendez-vous">
            Il est masqué, ou la personne qui le reçoit n’est pas ouverte aux rendez-vous (onglet « Qui reçoit »).
          </Banner>
        </div>
      )}
      <Reservation
        types={proposes}
        type={type}
        jours={jours}
        jour={jour}
        heure={estHeure(p.h) ? p.h : null}
        mois={estMois(p.mois) ? p.mois : null}
        aujourdhui={aujourdhuiISO()}
        base={BASE}
        apercu
      />
    </>
  );
}
