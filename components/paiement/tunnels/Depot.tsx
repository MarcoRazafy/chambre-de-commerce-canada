import type { CSSProperties } from "react";
import Link from "next/link";
import { Caveat } from "next/font/google";
import { ArrowRight, CheckCircle2, ChevronLeft } from "lucide-react";
import { Copiable } from "@/components/paiement/Copiable";
import { AnnonceAdaptative } from "@/components/paiement/tunnels/AnnonceAdaptative";
import { BoutonImprimer } from "@/components/paiement/tunnels/BoutonImprimer";
import {
  chiffre,
  conclu,
  PastilleChambre,
  type PropsReglement,
} from "@/components/paiement/tunnels/commun";
import { fmtMontant } from "@/lib/membership";
import { enLettres } from "@/lib/reglements";

const manuscrite = Caveat({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

const VERT = "#2e5e3b";
const ENCRE = "#27398c";

export function TunnelDepot(p: PropsReglement) {
  const etape = conclu(p.statut) ? 3 : p.etape === "2" ? 2 : 1;
  const somme = fmtMontant(p.montant, p.devise);
  const page = `/membre/cotisations/payer/${p.reglementId}`;
  const precedent =
    etape === 2 ? page : etape === 3 ? "/membre/cotisations" : p.retour;
  const sousTitre = ["Le montant", "Votre bordereau", "Confirmation"][
    etape - 1
  ];

  return (
    <div
      style={
        {
          "--pf-bouton": VERT,
          "--pf-sur-bouton": "#ffffff",
          "--pf-bouton-survol": "#244b2f",
        } as CSSProperties
      }
      className="overflow-hidden rounded-[var(--radius-l)] bg-[#e6ece8] px-5 pb-10 pt-6 sm:px-10 print:rounded-none print:bg-white print:p-0"
    >
      <header className="mx-auto flex max-w-[640px] items-center gap-4 print:hidden">
        <Link
          href={precedent}
          aria-label={
            etape === 2
              ? "Revenir au montant"
              : "Choisir un autre moyen de paiement"
          }
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#2e5e3b] text-[#2e5e3b] no-underline transition-colors duration-200 hover:bg-[#2e5e3b] hover:text-white"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[12px] font-bold uppercase tracking-[0.12em] text-[#2e5e3b]">
            Dépôt bancaire
          </p>
          <p className="m-0 text-[16px] font-semibold text-ink">
            {sousTitre} · {etape}/3
          </p>
        </div>
        <PastilleChambre logo={p.logo} />
      </header>

      <div className="mx-auto mt-7 max-w-[640px]">
        {etape === 1 ? (
          <>
            <h1 className="m-0 text-[26px] font-bold leading-tight text-ink">
              Le montant à déposer au guichet
            </h1>
            <p className="m-0 mb-1.5 mt-5 text-[14px] font-semibold text-ink">
              Montant en ariary
            </p>
            <output
              className={`${manuscrite.className} block border-b-2 border-[#2e5e3b] bg-white px-4 pb-1 pt-2 text-[42px] leading-none text-[#27398c]`}
            >
              {chiffre(p.montant)}
            </output>
            <p
              className={`${manuscrite.className} m-0 mt-2 text-[22px] leading-tight text-[#27398c]`}
            >
              {enLettres(p.montant)} ariary
            </p>
            <p className="m-0 mt-4 text-[14px] text-muted">
              Pour <b className="text-ink">{p.objet}</b>
              {p.numeroFacture ? ` · facture ${p.numeroFacture}` : ""}
            </p>
            <Link
              href={`${page}?etape=2`}
              className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--pf-bouton)] px-6 text-[15px] font-bold text-white no-underline transition-colors duration-200 hover:bg-[var(--pf-bouton-survol)]"
            >
              Remplir mon bordereau <ArrowRight size={17} />
            </Link>
            <div className="mt-4 text-center">
              <Link
                href="/membre/cotisations"
                className="text-[14px] text-muted underline underline-offset-4 hover:text-ink"
              >
                Revenir plus tard
              </Link>
            </div>
          </>
        ) : etape === 2 ? (
          <>
            <h1 className="m-0 text-[26px] font-bold leading-tight text-ink print:hidden">
              Votre bordereau est prêt
            </h1>
            <Bordereau {...p} somme={somme} />
            <div className="mt-5 text-center print:hidden">
              <BoutonImprimer className="text-[#2e5e3b] hover:text-[#244b2f]">
                Imprimer le bordereau
              </BoutonImprimer>
            </div>
            <div className="mt-4 print:hidden">
              <AnnonceAdaptative
                reglementId={p.reglementId}
                libelle="N° du bordereau tamponné par la banque"
                aide="après le dépôt"
                exemple="Inscrit sur le reçu du guichet"
                plusTard="Je déposerai plus tard"
                fait="J’ai déposé · prévenir l’équipe"
                champ="rounded-[10px]"
              />
            </div>
          </>
        ) : (
          <div className="pt-4 text-center">
            <CheckCircle2
              size={48}
              aria-hidden
              className={`mx-auto ${p.statut === "reussie" ? "text-success" : "text-[#2e5e3b]"}`}
            />
            <h1 className="m-0 mt-4 text-[24px] font-bold text-ink">
              {p.statut === "reussie" ? "Dépôt reçu" : "Merci — c’est noté"}
            </h1>
            <p className="m-0 mx-auto mt-2 max-w-[440px] text-[15px] leading-relaxed text-muted">
              {p.statut === "reussie"
                ? `L’équipe a constaté l’arrivée de ${somme}. Il n’y a plus rien à faire.`
                : `L’équipe confirmera votre dépôt de ${somme} dès qu’il apparaîtra sur le compte de la chambre.`}
            </p>
            <div className="mx-auto mt-5 max-w-[400px] text-left">
              <Copiable libelle="Motif du dépôt" valeur={p.reference} accent />
            </div>
            <Link
              href="/membre/cotisations"
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-[var(--pf-bouton)] px-6 text-[15px] font-bold text-white no-underline transition-colors duration-200 hover:bg-[var(--pf-bouton-survol)]"
            >
              Revenir aux factures <ArrowRight size={17} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function dateBordereau(iso: string): string {
  const [a, m, j] = iso.split("-");
  return `${j}/${m}/${a}`;
}

function Bordereau({
  coordonnees: c,
  personne,
  montant,
  reference,
  aujourdhui,
  somme,
}: PropsReglement & { somme: string }) {
  const lignes: [string, string, boolean?][] = [
    ["Date", dateBordereau(aujourdhui)],
    ["Agence", c.agence || "—"],
    ["Compte à créditer", c.rib],
    ["Au nom de", c.titulaire],
    ["Versé par", personne],
    ["Montant en chiffres", somme, true],
    ["Montant en lettres", `${enLettres(montant)} ariary`, true],
    ["Motif", reference],
  ];

  return (
    <div className="relative mx-auto mt-6 max-w-[600px] print:mt-0 print:max-w-none">
      <div
        aria-hidden
        className="absolute inset-0 translate-x-3 translate-y-3 rotate-[1.2deg] rounded-[6px] bg-[#f3ccd3] print:hidden"
      />
      <section
        aria-label="Bordereau de versement"
        className="relative rounded-[6px] border border-[#cddbd1] bg-[#f4f8f5] bg-[repeating-linear-gradient(135deg,transparent_0_9px,rgba(46,94,59,0.04)_9px_10px)] p-5 shadow-[0_14px_30px_-20px_rgba(20,50,30,0.55)] sm:p-6 print:shadow-none"
      >
        <div className="flex items-end justify-between gap-4 border-b-2 border-[#2e5e3b] pb-2.5">
          <p className="m-0 text-[13px] font-bold uppercase tracking-[0.14em] text-[#2e5e3b]">
            Bordereau de versement
          </p>
          <p className="m-0 text-right text-[13px] font-semibold text-[#2e5e3b]">
            {c.banque}
          </p>
        </div>
        <dl className="m-0">
          {lignes.map(([libelle, valeur, fort]) => (
            <div
              key={libelle}
              className={`grid grid-cols-[112px_1fr] items-end gap-3 border-b border-[#a9c2b0] py-2 sm:grid-cols-[170px_1fr] ${
                fort ? "bg-white/70" : ""
              }`}
            >
              <dt className="text-[11px] font-semibold uppercase leading-tight tracking-[0.08em] text-[#556b5c] sm:text-[11.5px]">
                {libelle}
              </dt>
              <dd
                className={`${manuscrite.className} m-0 min-w-0 text-[21px] leading-tight [overflow-wrap:anywhere] sm:text-[23px]`}
                style={{ color: ENCRE }}
              >
                {valeur}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 h-[72px] rounded-[4px] border border-dashed border-[#a9c2b0] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#556b5c]">
          Signature du déposant
        </div>
      </section>
    </div>
  );
}
