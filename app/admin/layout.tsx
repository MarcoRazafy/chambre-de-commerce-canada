import { BandeauRetard } from "@/components/admin/BandeauRetard";
import { CoquilleAdmin } from "@/components/admin/CoquilleAdmin";
import { etatPaiementChambre } from "@/lib/etat-paiement";
import { BulleSupport } from "@/components/support/BulleSupport";
import { getMemberStats, getUnreadTotal } from "@/lib/queries";
import { getNotifications } from "@/lib/notifications";
import { getCurrentUser } from "@/lib/session";
import { NAV_ADMIN } from "@/lib/nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser("admin");
  const [stats, unread, notifications, paiement] = await Promise.all([
    getMemberStats(),
    getUnreadTotal(user.id),
    getNotifications("admin", null, user.id),
    etatPaiementChambre(),
  ]);

  const aTraiter = stats.total - stats.aJour;

  return (
    <CoquilleAdmin
      user={user}
      nav={NAV_ADMIN}
      badges={{ "/admin/membres": aTraiter, "/admin/messagerie": unread }}
      notifications={notifications}
    >
      <BandeauRetard etat={paiement} />
      {children}
      <BulleSupport espace="admin" prenom={user.nom.split(" ")[0]} />
    </CoquilleAdmin>
  );
}
