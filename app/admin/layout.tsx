import Link from "next/link";
import { Clock, CreditCard, Wrench } from "lucide-react";
import { ouvertAvantPaiement } from "@/lib/acces-paiement";
import { fmtDollars } from "@/lib/plateforme";
import { BandeauRetard } from "@/components/admin/BandeauRetard";
import { quitterVisite } from "@/lib/actions/visite";
import { CoquilleAdmin } from "@/components/admin/CoquilleAdmin";
import { StyleCouleursChambre } from "@/components/StyleCouleursChambre";
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
  const chambre = await prisma.chambre.findFirst({ select: { demarrage: true, paiementDiffere: true } });
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
  const nav = filtrerNav(NAV_ADMIN, offre?.fonctions);
  const enAttente = !!chambre?.paiementDiffere;
  const aRegler = enAttente
    ? await prisma.facturePlateforme.findFirst({ where: { payeeLe: null }, orderBy: { date: "asc" }, select: { total: true } })
    : null;
  const verrous = enAttente ? nav.flatMap((g) => g.items).filter((i) => !ouvertAvantPaiement(i.href)).map((i) => i.href) : [];

  return (
    <>
    <StyleCouleursChambre />
    <CoquilleAdmin
      user={user}
      nav={nav}
      lockedHrefs={verrous}
      badges={{ "/admin/membres": aTraiter, "/admin/messagerie": unread }}
      messagerie={(!offre || offre.fonctions.includes("messagerie")) && !enAttente}
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
      {enAttente ? (
        <div role="status" className="mb-5 flex items-center justify-between gap-3 flex-wrap rounded-[var(--radius-m)] border border-warn/40 bg-warn-soft px-4 py-3 text-[13.5px] text-ink">
          <span className="flex items-center gap-2.5">
            <Clock size={17} className="text-warn shrink-0" aria-hidden />
            <span>
              <strong>Abonnement à régler{aRegler ? ` : ${fmtDollars(aRegler.total)}` : ""}</strong> · les autres pages s’ouvrent dès le paiement.
            </span>
          </span>
          <Link href="/admin/abonnement?onglet=factures" className="btn-action btn-action-sm no-underline">
            <CreditCard size={14} aria-hidden /> Payer
          </Link>
        </div>
      ) : null}
      <BandeauRetard etat={paiement} />
      {children}
      {user.visiteGM ? null : <BulleSupport espace="admin" prenom={user.nom.split(" ")[0]} />}
    </CoquilleAdmin>
    </>
  );
}
