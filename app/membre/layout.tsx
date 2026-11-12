import { notFound } from "next/navigation";
import { PAGES_TOUJOURS_OUVERTES } from "@/lib/membership";
import { Coquille } from "@/components/membre/Coquille";
import { BulleSupport } from "@/components/support/BulleSupport";
import { getMember, getStatsPubliques, getUnreadTotal } from "@/lib/queries";
import { getNotifications } from "@/lib/notifications";
import { getCurrentUser } from "@/lib/session";
import { isAccessLocked, joursDeRetard, retardBloque } from "@/lib/membership";
import { NAV_MEMBRE } from "@/lib/nav";
import { BandeauCotisation } from "@/components/paiement/Cotisation";
import { cotisationDue } from "@/lib/cotisation";
import { modesProposes } from "@/lib/reglements";
import { etatPaiementChambre } from "@/lib/etat-paiement";

export default async function MembreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser("membre");
  const membre = user.memberId ? await getMember(user.memberId) : null;
  if (!membre) notFound();

  const [unread, stats, notifications, cotisation, modes, paiement] = await Promise.all([
    getUnreadTotal(user.id),
    getStatsPubliques(),
    getNotifications("membre", membre.id, user.id),
    cotisationDue(membre),
    modesProposes(),
    etatPaiementChambre(),
  ]);

  const verrouille = isAccessLocked(membre);

  const toujoursOuvert = PAGES_TOUJOURS_OUVERTES;

  return (
    <Coquille
      user={user}
      membre={membre}
      nav={NAV_MEMBRE}
      badges={{
        "/membre/evenements": stats.evenementsAVenir,
        "/membre/messagerie": unread,
      }}
      notifications={notifications}
      bandeau={
        cotisation ? (
          <BandeauCotisation
            cotisation={cotisation}
            modes={modes}
            situation={
              membre.statut === "en_retard"
                ? retardBloque(membre)
                  ? "bloque"
                  : "retard"
                : "attente"
            }
            jours={joursDeRetard(membre)}
          />
        ) : null
      }
      lockedHrefs={
        verrouille
          ? NAV_MEMBRE.flatMap((g) => g.items)
              .map((i) => i.href)
              .filter((h) => !toujoursOuvert.includes(h))
          : []
      }
    >
      {/* L'abonnement de la Chambre est en retard : l'espace est en lecture seule */}
      {paiement.restriction === "lecture" ? (
        <p role="alert" className="mb-5 rounded-[var(--radius-m)] border border-warn/40 bg-warn-soft px-4 py-3 text-[13.5px] text-ink m-0">
          L’espace est en lecture seule pour le moment.
        </p>
      ) : null}
      {children}
      <BulleSupport espace="membre" prenom={user.nom.split(" ")[0]} />
    </Coquille>
  );
}
