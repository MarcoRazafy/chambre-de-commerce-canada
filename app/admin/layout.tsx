import { Wrench } from "lucide-react";
import { BandeauRetard } from "@/components/admin/BandeauRetard";
import { quitterVisite } from "@/lib/actions/visite";
import { CoquilleAdmin } from "@/components/admin/CoquilleAdmin";
import { etatPaiementChambre } from "@/lib/etat-paiement";
import { BulleSupport } from "@/components/support/BulleSupport";
import { getMemberStats, getUnreadTotal } from "@/lib/queries";
import { getNotifications } from "@/lib/notifications";
import { getCurrentUser } from "@/lib/session";
import { NAV_ADMIN } from "@/lib/nav";
import { filtrerNav } from "@/lib/fonctions-plateforme";
import { offreDeLaChambre } from "@/lib/offre-chambre";
import { marqueDeLaChambre } from "@/lib/profil-chambre";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser("admin");
  // Chambre qui vient d'être créée : d'abord son démarrage (offre, paiement, informations)
  const chambre = await prisma.chambre.findFirst({ select: { demarrage: true } });
  if (chambre?.demarrage && !user.visiteGM) redirect("/demarrage");
  const [stats, unread, notifications, paiement, offre, marque] = await Promise.all([
    getMemberStats(),
    getUnreadTotal(user.id),
    getNotifications("admin", null, user.id),
    etatPaiementChambre(),
    offreDeLaChambre(),
    marqueDeLaChambre(),
  ]);

  const aTraiter = stats.total - stats.aJour;

  return (
    <CoquilleAdmin
      user={user}
      nav={filtrerNav(NAV_ADMIN, offre?.fonctions)}
      badges={{ "/admin/membres": aTraiter, "/admin/messagerie": unread }}
      messagerie={!offre || offre.fonctions.includes("messagerie")}
      notifications={notifications}
      marque={marque}
    >
      {user.visiteGM ? (
        <div role="status" className="mb-5 flex items-center justify-between gap-3 flex-wrap rounded-[var(--radius-m)] border border-navy/30 bg-navy-soft px-4 py-3 text-[13.5px] text-ink">
          <span className="flex items-center gap-2.5"><Wrench size={17} className="text-navy shrink-0" aria-hidden /> Visite de l’administrateur de la plateforme : {user.visiteGM}</span>
          <form action={quitterVisite}>
            <button type="submit" className="btn-contour btn-contour-sm text-ink hover:bg-surface">Quitter la visite</button>
          </form>
        </div>
      ) : null}
      <BandeauRetard etat={paiement} />
      {children}
      {/* Support IT : l'équipe de la Chambre écrit à l'Admin GM (pas pendant une visite de l'Admin GM) */}
      {user.visiteGM ? null : <BulleSupport espace="admin" prenom={user.nom.split(" ")[0]} />}
    </CoquilleAdmin>
  );
}
