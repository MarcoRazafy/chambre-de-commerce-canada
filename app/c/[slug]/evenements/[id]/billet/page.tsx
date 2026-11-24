import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, MapPin } from "lucide-react";
import { CodeAccueil } from "@/components/CodeAccueil";
import { CadreEvenementsPublics } from "@/components/public/CadreEvenementsPublics";
import { PaiementPublic } from "@/components/public/PaiementPublic";
import { plageHoraire } from "@/lib/agenda";
import { cheminBillet } from "@/lib/billet-public";
import { avecChambre } from "@/lib/chambre-courante";
import { codeInscription, extraireCode } from "@/lib/codes-accueil";
import { stylePagePublique } from "@/lib/couleurs-evenement";
import { compteStripeActif } from "@/lib/encaissement-stripe";
import { couleursEvenement, evenementPublic, pagePublique } from "@/lib/evenements-publics";
import { fmtDate } from "@/lib/format";
import { reglementPublicEcarte, reglementPublicOuvert, suivrePaiementPublic } from "@/lib/paiements";
import { matriceQr } from "@/lib/qr";
import { getBilletsPublics, getEvent } from "@/lib/queries";
import { COORDONNEES_VIDES, getCoordonneesPaiement, type ModeReglement } from "@/lib/reglements";
import { canalVanillaPay } from "@/lib/vanillapay";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Vos billets" }, robots: { index: false, follow: false } };

export default async function BilletPublic({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ code?: string; ref?: string; moyen?: string }>;
}) {
  const [{ slug, id }, { code = "", ref = "", moyen = "" }] = await Promise.all([params, searchParams]);
  const p = await pagePublique(slug);
  if (!p) notFound();
  const publie = await evenementPublic(p.chambreId, id);
  if (!publie) notFound();

  const donnees = await avecChambre(p.chambreId, async () => {
    const base = codeInscription(extraireCode(code));
    const paiement = ref ? await suivrePaiementPublic(ref, base) : null;
    const [e, billets] = await Promise.all([getEvent(id), getBilletsPublics(id, code)]);
    if (!e || !billets.length) return null;
    const enAttente = billets.some((b) => b.statut === "a_valider");
    const aRegler = billets.filter((b) => b.statut === "a_valider").reduce((somme, b) => somme + (b.montant || e.prixPublic), 0);
    const [modes, reglement, ecarte, coordonnees] =
      enAttente && aRegler > 0
        ? await Promise.all([
            compteStripeActif().then((c): ModeReglement[] => (c ? ["carte"] : [])),
            reglementPublicOuvert(e.id, base),
            reglementPublicEcarte(e.id, base),
            getCoordonneesPaiement(),
          ])
        : [[] as ModeReglement[], null, null, COORDONNEES_VIDES];
    return { base, paiement, e, billets, enAttente, aRegler, modes, reglement, ecarte, coordonnees };
  });
  if (!donnees) notFound();
  const { base, paiement, e, billets, enAttente, aRegler, modes, reglement, ecarte, coordonnees } = donnees;

  const quand = [fmtDate(e.date), plageHoraire(e.debut, e.fin)].filter(Boolean).join(" · ");
  const plusieurs = billets.length > 1;

  return (
    <CadreEvenementsPublics slug={p.slug} profil={p.profil} cadreLogo={p.cadreLogo} style={stylePagePublique(couleursEvenement(publie), p.couleurs)}>
      <div className="mx-auto w-full max-w-[760px] px-5 sm:px-8 pt-8 pb-20">
        <Link href={`/c/${p.slug}/evenements/${e.id}`} className="inline-flex items-center gap-1.5 text-[13.5px] text-muted no-underline hover:text-ink">
          <ArrowLeft size={14} aria-hidden /> L’événement
        </Link>

        <div className="mt-6 rounded-2xl border border-line bg-white p-6 md:p-8">
          {enAttente ? (
            <p className="m-0 inline-flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[0.12em] text-warn">
              <Clock size={15} aria-hidden /> Inscription en attente de règlement
            </p>
          ) : (
            <p className="m-0 inline-flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[0.12em] text-success">
              <CheckCircle2 size={15} aria-hidden /> Inscription confirmée
            </p>
          )}
          <h1 className="m-0 mt-3 text-[clamp(24px,3.4vw,32px)] leading-[1.2]">{e.titre}</h1>
          <div className="flex gap-x-5 gap-y-2 flex-wrap text-[14px] text-muted mt-3">
            <span className="inline-flex items-center gap-2"><CalendarDays size={15} aria-hidden /> {quand}</span>
            <span className="inline-flex items-center gap-2"><MapPin size={15} aria-hidden /> {e.lieu}</span>
          </div>

          <p className="m-0 mt-5 text-[14.5px] text-muted leading-relaxed">
            {enAttente
              ? `${billets.length} inscription${plusieurs ? "s" : ""} enregistrée${plusieurs ? "s" : ""}. Vos QR codes partent par e-mail dès le règlement confirmé.`
              : plusieurs
                ? `${billets.length} participants. Chacun présente son QR code à l’accueil.`
                : "Présentez ce QR code à l’accueil : il vous pointe présent."}{" "}
            Un e-mail est parti à <b className="text-ink">{billets[0].email}</b>, avec le lien de cette page.
          </p>

          {paiement === "en_cours" && enAttente ? (
            <p className="m-0 mt-4 rounded-[var(--radius-s)] bg-surface-2 px-3.5 py-3 text-[13.5px] text-muted">
              <b className="text-ink">Paiement en cours de confirmation.</b> Cela prend parfois quelques minutes : rechargez cette page.
            </p>
          ) : paiement === "echouee" && enAttente ? (
            <p className="m-0 mt-4 rounded-[var(--radius-s)] bg-warn-soft px-3.5 py-3 text-[13.5px] text-warn">
              <b>Paiement refusé.</b> Rien n’a été débité : vous pouvez recommencer.
            </p>
          ) : null}

          {aRegler > 0 && enAttente ? (
            <PaiementPublic
              chambre={p.slug}
              eventId={e.id}
              code={base}
              montant={aRegler}
              modes={modes}
              reglement={
                reglement && (reglement.statut === "annonce" || (!canalVanillaPay(reglement.mode) && moyen !== "choix"))
                  ? reglement
                  : null
              }
              ecarte={reglement ? null : (ecarte?.reference ?? null)}
              coordonnees={coordonnees}
              marchand={null}
              page={cheminBillet(p.slug, e.id, { code: base })}
            />
          ) : null}

          {enAttente ? (
            <ul className="list-none m-0 mt-7 p-0 border-t border-line">
              {billets.map((b) => (
                <li key={b.code} className="flex items-center justify-between gap-3 py-3 border-b border-line text-[14px]">
                  <span className="text-ink font-semibold">{b.nom}</span>
                  <span className="text-[12.5px] text-faint">Billet à venir</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid gap-6 mt-7 sm:grid-cols-2">
              {billets.map((b) => (
                <div key={b.code}>
                  <div className="mb-1 text-[14px] font-semibold text-ink">{b.nom}</div>
                  {b.supplements.length ? <div className="mb-2 text-[12.5px] text-muted">{b.supplements.join(" · ")}</div> : null}
                  <CodeAccueil
                    code={b.code}
                    {...matriceQr(b.code)}
                    billet={{ titre: e.titre, quand, lieu: e.lieu, participant: [b.nom, b.entreprise].filter(Boolean).join(" · ") }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CadreEvenementsPublics>
  );
}
