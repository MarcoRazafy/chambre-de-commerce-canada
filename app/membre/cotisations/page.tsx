import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlarmClock,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Lock,
  Search,
} from "lucide-react";
import { Compteur, EnTeteAdmin, Onglets, Vide } from "@/components/admin/ui";
import { FiltresAuto } from "@/components/FiltresAuto";
import { Card, Pill, Saillant, StatusPill } from "@/components/ui";
import { fmtJour, renouvellementCotisation } from "@/lib/agenda";
import {
  enRetard as factureEnRetard,
  filtrerFactures,
  filtrerFacturesHorsStatut,
  lireFiltresFactures,
  parametresFactures,
} from "@/lib/filtres-factures";
import { fmtDate } from "@/lib/format";
import {
  ADHESION_PENDING,
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
import { modesBientot, modesMembres } from "@/lib/reglements";
import { BlocCotisation } from "@/components/paiement/Cotisation";
import { cotisationDue } from "@/lib/cotisation";
import { FenetreMoyens } from "@/components/paiement/FenetreMoyens";
import { getCurrentUser } from "@/lib/session";
import { MODES, MODES_EN_LIGNE } from "@/lib/modes-reglement";
import type { Invoice } from "@/lib/types";

export default async function CotisationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    regler?: string;
    statut?: string;
    devise?: string;
    annee?: string;
    q?: string;
  }>;
}) {
  const parametres = await searchParams;
  const { regler } = parametres;
  const filtres = lireFiltresFactures(parametres);
  const user = await getCurrentUser("membre");
  const m = await getMember(user.memberId!);
  if (!m) notFound();

  const [factures, modes, cotisation, bientot] = await Promise.all([
    getInvoices(m.id),
    modesMembres(),
    cotisationDue(m),
    modesBientot(),
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

  const annees = [...new Set(factures.map((f) => Number(f.date.slice(0, 4))))].sort((a, b) => b - a);
  const plusieursDevises = new Set(factures.map((f) => f.devise)).size > 1;
  const retenues = filtrerFacturesHorsStatut(factures, filtres);
  const liste = filtrerFactures(factures, filtres);
  const lien = (changes: Parameters<typeof parametresFactures>[1]) =>
    `/membre/cotisations${parametresFactures(filtres, changes)}`;
  const periode = filtres.annee ? `en ${filtres.annee}` : "au total";
  const delAnnee = factures.filter(
    (f) => !filtres.annee || f.date.startsWith(String(filtres.annee)),
  );
  const aRegler = delAnnee.filter((f) => f.statut === "envoyee");
  const enRetardListe = delAnnee.filter((f) => factureEnRetard(f));
  const relancees = factures.filter((f) => f.statut === "envoyee" && f.relanceeLe);
  const enLigne = listeFrancaise(
    modes
      .filter((x) => x === "paypal" || MODES_EN_LIGNE.includes(x))
      .map((x) => (x === "carte" ? "carte bancaire" : MODES[x].titre)),
  );
  const fenetre = (f: Invoice) => ({
    id: f.id,
    numero: f.numero,
    objet: f.objet,
    montant: fmtMontant(f.montant, f.devise),
  });

  return (
    <>
      <EnTeteAdmin
        surtitre="Mon entreprise"
        titre={
          <>
            Cotisations &amp; <Saillant>factures</Saillant>
          </>
        }
      />

      <div className="grid gap-3 sm:gap-4 mb-6 grid-cols-2 xl:grid-cols-4">
        <Compteur
          icone={<CheckCircle2 size={22} />}
          teinte="vert"
          libelle={`Réglé ${periode}`}
          valeur={<Montants factures={delAnnee.filter((f) => f.statut === "payee")} devise={m.formule?.devise ?? "CAD"} />}
          href={lien({ statut: "payee" })}
        />
        <Compteur
          icone={<Clock size={22} />}
          teinte="rouge"
          libelle={`À régler ${periode}`}
          valeur={<Montants factures={aRegler} devise={m.formule?.devise ?? "CAD"} />}
          detail={`${aRegler.length} facture${aRegler.length > 1 ? "s" : ""} en attente`}
          href={lien({ statut: "envoyee" })}
        />
        <Compteur
          icone={<FileText size={22} />}
          teinte="bleu"
          libelle={`Factures ${periode}`}
          valeur={delAnnee.length}
          href={lien({ statut: null })}
        />
        <Compteur
          icone={<AlarmClock size={22} />}
          teinte="rouge"
          libelle="Factures en retard"
          valeur={enRetardListe.length}
          href={lien({ statut: "retard" })}
        />
      </div>

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

          {relancees.length ? (
            <ul className="list-none m-0 p-0 mt-5 flex flex-col gap-2.5">
              {relancees.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-3 flex-wrap rounded-[var(--radius-s)] border border-bad/25 bg-bad-soft px-4 py-3"
                >
                  <BellRing size={18} className="text-bad shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-ink">
                      Facture {f.numero} à régler · {fmtMontant(f.montant, f.devise)}
                    </span>
                    <span className="block text-[12.5px] text-muted">{f.objet}</span>
                  </span>
                  <FenetreMoyens
                    facture={fenetre(f)}
                    modes={modes}
                    bientot={bientot}
                    ouverteAuDepart={regler === f.id}
                    declencheur={
                      <>
                        Régler <ChevronRight size={15} />
                      </>
                    }
                    classeDeclencheur="btn-action btn-action-sm"
                  />
                </li>
              ))}
            </ul>
          ) : null}

          {cotisation ? (
            <BlocCotisation cotisation={cotisation} modes={modes} />
          ) : null}

          <div className="grid gap-4 mt-6 pt-5 border-t border-line sm:grid-cols-2">
            <Donnee libelle="Membre depuis" valeur={fmtDate(m.adhesion)} />
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
              {enLigne.length
                ? `Réglez en ligne par ${enLigne}. L’équipe de la Chambre enregistre aussi les règlements reçus par virement ou en espèces.`
                : "L’équipe de la Chambre enregistre les règlements reçus en espèces ou par virement."}
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

      <Onglets
        actif={filtres.statut}
        onglets={[
          { cle: "toutes", libelle: "Toutes", href: lien({ statut: null }), compte: retenues.length },
          { cle: "envoyee", libelle: "À régler", href: lien({ statut: "envoyee" }), compte: retenues.filter((f) => f.statut === "envoyee").length },
          { cle: "retard", libelle: "En retard", href: lien({ statut: "retard" }), compte: retenues.filter((f) => factureEnRetard(f)).length },
          { cle: "payee", libelle: "Payées", href: lien({ statut: "payee" }), compte: retenues.filter((f) => f.statut === "payee").length },
        ]}
      />

      <FiltresAuto action="/membre/cotisations" className="flex gap-2.5 flex-wrap items-center mb-4">
        {filtres.statut !== "toutes" ? <input type="hidden" name="statut" value={filtres.statut} /> : null}
        <div className="relative flex-1 min-w-[220px] max-w-[380px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
          <input
            type="search"
            name="q"
            defaultValue={filtres.recherche}
            placeholder="Numéro, objet…"
            aria-label="Rechercher une facture"
            className="w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink pl-9 pr-3 py-2.5 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
        {annees.length > 1 ? (
          <select
            name="annee"
            defaultValue={filtres.annee ?? ""}
            aria-label="Année"
            className="rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.5px] outline-none focus:border-accent"
          >
            <option value="">Toutes les années</option>
            {annees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        ) : null}
        {plusieursDevises ? (
          <select
            name="devise"
            defaultValue={filtres.devise ?? ""}
            aria-label="Devise"
            className="rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.5px] outline-none focus:border-accent"
          >
            <option value="">Toutes devises</option>
            <option value="CAD">Dollars canadiens</option>
            <option value="MGA">Ariary</option>
          </select>
        ) : null}
        {filtres.recherche || filtres.annee || filtres.devise ? (
          <Link href={lien({ q: null, annee: null, devise: null })} className="text-[13px] font-semibold text-muted no-underline hover:text-accent">
            Effacer les filtres
          </Link>
        ) : null}
      </FiltresAuto>

      {liste.length === 0 ? (
        <Card>
          <Vide icone={<FileText size={26} />}>
            {factures.length ? "Aucune facture ne correspond à ces critères." : "Aucune facture pour le moment."}
          </Vide>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="hidden md:flex items-center gap-5 px-5 py-3 bg-surface-2 border-b border-line surtitre text-faint font-semibold">
            <span className="w-[170px] shrink-0">Facture</span>
            <span className="flex-1 min-w-0">Objet</span>
            <span className="w-[120px] shrink-0 text-right">Montant</span>
            <span className="w-[170px] shrink-0">Statut</span>
            <span className="w-[90px] shrink-0" />
          </div>
          <ul className="list-none m-0 p-0">
            {liste.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap md:flex-nowrap items-center gap-x-5 gap-y-1.5 px-4 md:px-5 py-3.5 border-b border-line last:border-b-0 hover:bg-surface-2 text-[13.4px]"
              >
                <Link
                  href={`/membre/cotisations/${f.id}`}
                  className="order-1 md:order-2 flex-1 min-w-0 font-semibold md:font-normal text-[14.5px] md:text-[13.4px] text-ink md:text-muted no-underline hover:text-accent"
                >
                  {f.objet}
                </Link>
                <span className="order-2 md:order-3 md:w-[120px] shrink-0 text-right font-semibold tabular-nums whitespace-nowrap">
                  {fmtMontant(f.montant, f.devise)}
                </span>
                <span className="order-3 basis-full h-0 md:hidden" aria-hidden />
                <span className="order-4 md:order-1 flex-1 md:flex-none md:w-[170px] min-w-0 truncate md:whitespace-normal">
                  <Link
                    href={`/membre/cotisations/${f.id}`}
                    className="font-[family-name:var(--font-mono)] font-semibold text-[12px] md:text-[13.4px] text-muted md:text-ink no-underline hover:text-accent"
                  >
                    {f.numero}
                  </Link>
                  <span className="text-[12px] text-muted md:hidden">
                    {" · "}
                    {fmtDate(f.date, { day: "numeric", month: "short" })}
                  </span>
                  <span className="hidden md:block text-[12px] text-muted">
                    {fmtDate(f.date, { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </span>
                <span className="order-5 md:w-[170px] shrink-0 inline-flex flex-wrap gap-1">
                  <StatusPill status={f.statut} />
                  {factureEnRetard(f) ? <Pill tone="bad">En retard</Pill> : null}
                </span>
                <span className={`order-6 md:w-[90px] shrink-0 md:text-right ${f.statut === "envoyee" ? "basis-full md:basis-auto pt-1 md:pt-0" : "hidden md:block"}`}>
                  {f.statut === "envoyee" ? (
                    <FenetreMoyens
                      facture={fenetre(f)}
                      modes={modes}
                      bientot={bientot}
                      ouverteAuDepart={regler === f.id && !relancees.some((r) => r.id === f.id)}
                      declencheur={
                        <>
                          Régler <ChevronRight size={15} />
                        </>
                      }
                      classeDeclencheur="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[13px] font-semibold text-accent hover:underline whitespace-nowrap"
                    />
                  ) : (
                    <Link
                      href={`/membre/cotisations/${f.id}`}
                      className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent no-underline hover:underline whitespace-nowrap"
                    >
                      Voir <ChevronRight size={15} />
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function Montants({ factures, devise }: { factures: Invoice[]; devise: Devise }) {
  const total = (d: Devise) =>
    factures.filter((f) => f.devise === d).reduce((somme, f) => somme + f.montant, 0);
  const autre: Devise = devise === "CAD" ? "MGA" : "CAD";
  return total(autre) ? (
    <span className="flex flex-col leading-tight">
      <span className="text-[22px]">{fmtMontant(total(devise), devise)}</span>
      <span className="text-[14px] text-muted">+ {fmtMontant(total(autre), autre)}</span>
    </span>
  ) : (
    <span className="text-[22px]">{fmtMontant(total(devise), devise)}</span>
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

function listeFrancaise(mots: string[]): string {
  return mots.length > 1 ? `${mots.slice(0, -1).join(", ")} ou ${mots[mots.length - 1]}` : (mots[0] ?? "");
}
