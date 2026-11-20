import { notFound } from "next/navigation";
import { PAGES_TOUJOURS_OUVERTES } from "@/lib/membership";
import { Coquille } from "@/components/membre/Coquille";
import { StyleCouleursChambre } from "@/components/StyleCouleursChambre";
import { BulleSupport } from "@/components/support/BulleSupport";
import { getMember, getStatsPubliques, getUnreadTotal } from "@/lib/queries";
import { getNotifications } from "@/lib/notifications";
import { getCurrentUser } from "@/lib/session";
import { isAccessLocked, joursDeRetard, retardBloque } from "@/lib/membership";
import { NAV_MEMBRE } from "@/lib/nav";
import { filtrerNav } from "@/lib/fonctions-plateforme";
import { offreDeLaChambre } from "@/lib/offre-chambre";
import { marqueDeLaChambre } from "@/lib/profil-chambre";
import { BandeauCotisation } from "@/components/paiement/Cotisation";
import { cotisationDue } from "@/lib/cotisation";
import { modesMembres } from "@/lib/reglements";
import { etatPaiementChambre } from "@/lib/etat-paiement";
import { comptesLies } from "@/lib/comptes-lies";

export default async function MembreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser("membre");
  const membre = user.memberId ? await getMember(user.memberId) : null;
  if (!membre) notFound();

  const [unread, stats, notifications, cotisation, modes, paiement, offre, marque, chambres] = await Promise.all([
    getUnreadTotal(user.id),
    getStatsPubliques(),
    getNotifications("membre", membre.id, user.id),
    cotisationDue(membre),
    modesMembres(),
    etatPaiementChambre(),
    offreDeLaChambre(),
    marqueDeLaChambre(),
    comptesLies(user.id),
  ]);
  const nav = filtrerNav(NAV_MEMBRE, offre?.fonctions);

  const verrouille = isAccessLocked(membre);

  const toujoursOuvert = PAGES_TOUJOURS_OUVERTES;

  return (
    <>
    <StyleCouleursChambre />
    <Coquille
      user={user}
      membre={membre}
      nav={nav}
      badges={{
        "/membre/evenements": stats.evenementsAVenir,
        "/membre/messagerie": unread,
      }}
      notifications={notifications}
      marque={marque}
      chambres={chambres}
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
          ? nav.flatMap((g) => g.items)
              .map((i) => i.href)
              .filter((h) => !toujoursOuvert.includes(h))
          : []
      }
    >
      {paiement.restriction === "lecture" ? (
        <p role="alert" className="mb-5 rounded-[var(--radius-m)] border border-warn/40 bg-warn-soft px-4 py-3 text-[13.5px] text-ink m-0">
          L’espace est en lecture seule pour le moment.
        </p>
      ) : null}
      {children}
      <BulleSupport espace="membre" prenom={user.nom.split(" ")[0]} chambre={{ nom: marque.nom, logo: marque.logo }} />
    </Coquille>
    </>
  );
}
