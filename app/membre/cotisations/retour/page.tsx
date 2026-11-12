import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  MessageSquare,
  Ticket,
  XCircle,
} from "lucide-react";
import { achatDe, pageAchat } from "@/lib/achat";
import { Banner, BtnLink, Card, ViewHead } from "@/components/ui";
import { prisma } from "@/lib/db";
import { fmtMontant } from "@/lib/membership";
import { conclurePaiement, estCotisation } from "@/lib/paiements";
import { getCurrentUser } from "@/lib/session";
import { canalVanillaPay, interrogerStatut } from "@/lib/vanillapay";
import { estSessionStripe, etatSessionStripe } from "@/lib/encaissement-stripe";

export default async function RetourPaiementPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref = "" } = await searchParams;
  const user = await getCurrentUser("membre");

  const charger = () =>
    prisma.paiement.findUnique({
      where: { reference: ref },
      include: {
        invoice: {
          select: {
            numero: true,
            objet: true,
            memberId: true,
            eventId: true,
          },
        },
      },
    });
  const trouve = ref ? await charger() : null;
  const proprietaire = trouve?.invoice?.memberId ?? trouve?.memberId ?? null;
  if (!trouve || !user.memberId || proprietaire !== user.memberId) notFound();

  let p = trouve;
  if (p.statut === "en_cours") {
    const canal = canalVanillaPay(p.mode);
    const etat = !p.transaction
      ? null
      : estSessionStripe(p.transaction)
        ? await etatSessionStripe(p.transaction)
        : canal
          ? await interrogerStatut(p.transaction, canal)
          : null;
    if (etat) {
      await conclurePaiement(etat, etat);
      p = (await charger()) ?? p;
    }
  }

  const statut = p.statut;
  const montant = fmtMontant(p.montant, p.devise);
  const evenement = p.invoice?.eventId ?? null;
  const achat = achatDe(p.detail);
  const cotisation = !p.invoice || estCotisation(p.invoice.objet);

  return (
    <>
      <ViewHead
        title={
          evenement
            ? "Paiement de la participation"
            : achat
              ? achat.type === "ressource"
                ? "Achat de la ressource"
                : "Paiement du service"
              : cotisation
                ? "Paiement de la cotisation"
                : "Paiement de la facture"
        }
      />

      <Card className="p-6 max-w-[620px]">
        {statut === "reussie" ? (
          <Banner
            tone="ok"
            icon={<CheckCircle2 size={18} />}
            title="Paiement reçu"
          >
            {p.invoice
              ? `La facture ${p.invoice.numero} est réglée : ${montant} encaissés.`
              : `${montant} encaissés.`}
            {evenement
              ? " Votre inscription est confirmée : vos billets, avec leur QR code, partent à l’adresse donnée à l’inscription, et vous les retrouvez sur la fiche de l’événement."
              : achat
                ? achat.type === "ressource"
                  ? ` « ${achat.titre} » vous est ouverte.`
                  : ` L’équipe CanCham a reçu votre demande pour « ${achat.titre} » : elle vous répond dans votre messagerie.`
                : p.invoice && estCotisation(p.invoice.objet)
                  ? " Votre adhésion est à jour, et votre certificat le dit déjà."
                  : " La facture apparaît réglée dans vos cotisations."}
          </Banner>
        ) : statut === "echouee" ? (
          <Banner
            tone="bad"
            icon={<XCircle size={18} />}
            title="Paiement refusé"
          >
            Rien n’a été débité. Vous pouvez réessayer, ou régler par virement :
            l’équipe enregistrera alors le règlement.
          </Banner>
        ) : (
          <Banner
            tone="warn"
            icon={<Clock size={18} />}
            title="Paiement en cours"
          >
            Le prestataire n’a pas encore confirmé. Cela prend parfois quelques
            minutes : revenez sur cette page ou rechargez-la.{" "}
            {achat
              ? achat.type === "ressource"
                ? "La ressource s’ouvrira d’elle-même dès la confirmation."
                : "L’équipe sera prévenue dès la confirmation."
              : `La facture sera marquée réglée d’elle-même dès la confirmation${evenement ? ", et vos billets partiront au même moment" : ""}.`}
          </Banner>
        )}

        <div className="mt-5 text-[12.8px] text-muted">
          Référence de la tentative :{" "}
          <span className="font-[family-name:var(--font-mono)] text-ink">
            {p.reference}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {evenement && statut === "reussie" ? (
            <BtnLink href={`/membre/evenements/${evenement}`} sm>
              <Ticket size={14} /> Voir mes billets
            </BtnLink>
          ) : null}
          {achat && statut === "reussie" ? (
            achat.type === "ressource" ? (
              <BtnLink href={pageAchat(achat)} variant="primary" sm>
                <BookOpen size={14} /> Ouvrir la ressource
              </BtnLink>
            ) : (
              <BtnLink href="/membre/messagerie" variant="primary" sm>
                <MessageSquare size={14} /> Ouvrir la messagerie
              </BtnLink>
            )
          ) : null}
          {achat && statut !== "reussie" ? (
            <BtnLink href={pageAchat(achat)} variant="ghost" sm>
              <ArrowLeft size={14} />{" "}
              {achat.type === "ressource"
                ? "Retour à la ressource"
                : "Retour aux services"}
            </BtnLink>
          ) : (
            <BtnLink href="/membre/cotisations" variant="ghost" sm>
              <ArrowLeft size={14} />{" "}
              {achat ? "Voir mes factures" : "Retour aux cotisations"}
            </BtnLink>
          )}
        </div>
      </Card>
    </>
  );
}
