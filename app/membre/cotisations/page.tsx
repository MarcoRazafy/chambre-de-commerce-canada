import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, CreditCard, Download, Lock } from "lucide-react";
import {
  Card,
  Saillant,
  StatusPill,
  TableWrap,
  Td,
  Th,
  ViewHead,
} from "@/components/ui";
import { fmtJour, renouvellementCotisation } from "@/lib/agenda";
import { fmtDate, fmtDateShort } from "@/lib/format";
import {
  ADHESION_PENDING,
  FORMULES,
  fmtCotisation,
  fmtMontant,
  isOverdueWarning,
  libelleFormule,
  joursDeRetard,
  retardBloque,
  RETARD_BLOCAGE_JOURS,
  type Devise,
} from "@/lib/membership";
import { getInvoices, getMember } from "@/lib/queries";
import { modesBientot, modesProposes } from "@/lib/reglements";
import { BlocCotisation } from "@/components/paiement/Cotisation";
import { cotisationDue } from "@/lib/cotisation";
import { FenetreMoyens } from "@/components/paiement/FenetreMoyens";
import { getCurrentUser } from "@/lib/session";

export default async function CotisationsPage({
  searchParams,
}: {
  searchParams: Promise<{ regler?: string }>;
}) {
  const { regler } = await searchParams;
  const user = await getCurrentUser("membre");
  const m = await getMember(user.memberId!);
  if (!m) notFound();

  const [factures, modes, cotisation] = await Promise.all([
    getInvoices(m.id),
    modesProposes(),
    cotisationDue(m),
  ]);
  const enAttente = ADHESION_PENDING.includes(m.statut);
  const renouvellement = renouvellementCotisation({
    factures,
    adhesion: m.adhesion,
    aJour: m.statut === "a_jour",
  });
  const bloque = retardBloque(m);
  const enRetard = isOverdueWarning(m);
  const jours = joursDeRetard(m);

  const devise: Devise = m.formule ? FORMULES[m.formule].devise : "CAD";
  const totalPaye = factures
    .filter((f) => f.statut === "payee" && f.devise === devise)
    .reduce((somme, f) => somme + f.montant, 0);

  return (
    <>
      <ViewHead
        title={<>Cotisations &amp; {<Saillant>factures</Saillant>}</>}
      />

      <div className="grid gap-4 mb-6 lg:grid-cols-[1.4fr_1fr] items-start">
        <Card className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <span
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                enAttente || bloque || enRetard
                  ? "bg-bad-soft text-bad"
                  : "bg-success-soft text-success-strong"
              }`}
            >
              {bloque ? (
                <Lock size={22} />
              ) : enAttente || enRetard ? (
                <Clock size={22} />
              ) : (
                <CheckCircle2 size={22} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[19px] m-0">
                {enAttente
                  ? "Cotisation à régler"
                  : bloque
                    ? `Accès restreint : ${jours} jours de retard`
                    : enRetard
                      ? `Cotisation en retard : ${jours}/${RETARD_BLOCAGE_JOURS} jours`
                      : "Votre adhésion est à jour"}
              </h2>
              <p className="text-[13.5px] text-muted m-0 mt-1">
                {m.paiementNote ??
                  `${libelleFormule(m.formule)} · ${m.formule ? `${fmtCotisation(m.formule)} par an` : "cotisation à définir"}`}
              </p>
            </div>
            <StatusPill status={m.statut} />
          </div>

          {cotisation ? (
            <BlocCotisation cotisation={cotisation} modes={modes} />
          ) : null}

          <div className="grid gap-4 mt-6 pt-5 border-t border-line sm:grid-cols-3">
            <Donnee libelle="Membre depuis" valeur={fmtDate(m.adhesion)} />
            <Donnee
              libelle="Total réglé"
              valeur={fmtMontant(totalPaye, devise)}
              mono
            />
            <Donnee
              libelle="Prochain renouvellement"
              valeur={
                renouvellement
                  ? fmtJour(renouvellement)
                  : "Au premier règlement"
              }
            />
          </div>

          {cotisation ? null : (
            <p className="text-[12.5px] text-faint mt-5 mb-0 flex items-center gap-2">
              <CreditCard size={14} />
              {modes.length
                ? "Réglez en ligne par carte bancaire ou mobile money. L’équipe CanCham enregistre aussi les règlements reçus par virement ou en espèces."
                : "Le paiement en ligne n’est pas branché : l’équipe CanCham enregistre les règlements reçus en espèces ou par virement."}
            </p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-[19px] m-0 mb-1.5">Une question ?</h2>
          <p className="text-[13.5px] text-muted m-0 mb-5">
            L’équipe vous répond directement depuis la messagerie.
          </p>
          <Link
            href="/membre/contact"
            className="btn-contour btn-contour-sm w-full text-accent hover:bg-accent-soft"
          >
            Contacter l’équipe
          </Link>
        </Card>
      </div>

      <h2 className="text-[19px] m-0 mb-4">Historique de facturation</h2>

      <TableWrap>
        <thead>
          <tr>
            <Th>Facture</Th>
            <Th>Date</Th>
            <Th>Objet</Th>
            <Th>Montant</Th>
            <Th>Statut</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {factures.length ? (
            factures.map((f) => (
              <tr key={f.id} className="hover:bg-surface-2">
                <Td className="font-[family-name:var(--font-mono)]">
                  {f.numero}
                </Td>
                <Td className="text-muted">{fmtDateShort(f.date)}</Td>
                <Td>{f.objet}</Td>
                <Td className="font-[family-name:var(--font-mono)]">
                  {fmtMontant(f.montant, f.devise)}
                </Td>
                <Td>
                  <StatusPill status={f.statut} />
                </Td>
                <Td>
                  <div className="flex items-center gap-4 whitespace-nowrap">
                    <Link
                      href={`/membre/cotisations/${f.id}`}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent no-underline hover:underline"
                    >
                      <Download size={13} /> Voir · PDF
                    </Link>
                    {f.statut === "envoyee" ? (
                      <FenetreMoyens
                        facture={{
                          id: f.id,
                          numero: f.numero,
                          objet: f.objet,
                          montant: fmtMontant(f.montant, f.devise),
                        }}
                        modes={modes}
                        bientot={modesBientot()}
                        ouverteAuDepart={regler === f.id}
                        declencheur={
                          <>
                            <CreditCard size={13} /> Régler
                          </>
                        }
                        classeDeclencheur="inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[12.5px] font-semibold text-accent hover:underline"
                      />
                    ) : null}
                  </div>
                </Td>
              </tr>
            ))
          ) : (
            <tr>
              <Td className="text-muted text-center py-6">
                Aucune facture pour le moment.
              </Td>
            </tr>
          )}
        </tbody>
      </TableWrap>
    </>
  );
}

function Donnee({
  libelle,
  valeur,
  mono = false,
}: {
  libelle: string;
  valeur: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="surtitre text-faint mb-1.5">{libelle}</div>
      <div
        className={`text-[15px] font-semibold text-ink ${mono ? "font-[family-name:var(--font-mono)]" : ""}`}
      >
        {valeur}
      </div>
    </div>
  );
}
