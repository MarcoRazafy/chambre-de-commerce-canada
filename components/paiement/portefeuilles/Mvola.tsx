import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ChevronLeft } from "lucide-react";
import { Copiable } from "@/components/paiement/Copiable";
import {
  couleurs,
  etapeDu,
  LOGOS,
  MentionSecret,
  PaiementDirect,
  type PropsTunnel,
} from "@/components/paiement/portefeuilles/commun";
import { fmtMontant } from "@/lib/membership";
import { MODES } from "@/lib/modes-reglement";

export function TunnelMvola(p: PropsTunnel) {
  const titre = MODES[p.mode].titre;
  const somme = fmtMontant(p.montant, p.devise);
  const etape = etapeDu(p);

  const ETAPES = [
    { titre: "Montant", detail: "Ce que vous réglez, et pour quoi." },
    {
      titre: "Paiement",
      detail: "Votre numéro, puis la validation avec votre code secret.",
    },
    {
      titre: "Confirmation",
      detail: p.raccorde
        ? "Le débit confirmé, votre reçu arrive aussitôt."
        : "L’équipe confirme dès réception.",
    },
  ];

  return (
    <div
      style={couleurs(p.mode)}
      className="grid overflow-hidden rounded-[var(--radius-l)] border border-line bg-surface lg:grid-cols-[minmax(0,400px)_1fr]"
    >
      <aside className="bg-[var(--pf-fond)] p-7 text-[var(--pf-encre)]">
        <div className="flex items-center gap-4">
          <Image
            src="/marque/logo-vertical.png"
            alt="IMPACT 261"
            width={900}
            height={859}
            className="h-16 w-auto object-contain"
          />
          <span aria-hidden className="text-[15px] font-semibold opacity-60">
            ×
          </span>
          <Image
            src={LOGOS.mvola.src}
            alt={titre}
            width={LOGOS.mvola.largeur}
            height={LOGOS.mvola.hauteur}
            className="h-11 w-auto object-contain"
          />
        </div>

        <h2 className="m-0 mt-6 text-[26px] font-bold leading-[1.15] tracking-[-0.01em]">
          Votre règlement, en trois gestes
        </h2>
        <p className="m-0 mt-3 text-[14px] leading-relaxed text-[var(--pf-douce)]">
          Vous validez le paiement sur votre téléphone, avec votre code secret{" "}
          {titre}. Votre reçu arrive aussitôt.
        </p>

        <ol className="m-0 mt-6 list-none p-0">
          {ETAPES.map((e, i) => {
            const n = i + 1;
            const passee = n < etape;
            const courante = n === etape;
            return (
              <li
                key={e.titre}
                aria-current={courante ? "step" : undefined}
                className="flex gap-3.5 py-2.5"
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                    courante || passee
                      ? "bg-[var(--pf-encre)] text-[var(--pf-fond)]"
                      : "border border-[var(--pf-encre)]/25 text-[var(--pf-encre)]/60"
                  }`}
                >
                  {passee ? <Check size={15} aria-label="fait" /> : n}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14.5px] font-bold">
                    {e.titre}
                  </span>
                  <span className="block text-[13px] leading-snug text-[var(--pf-douce)]">
                    {e.detail}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>

        <dl className="m-0 mt-6 rounded-[var(--radius-m)] bg-[#101418] px-5 py-4 text-white">
          <Ligne libelle="Montant">
            <span className="text-[17px] font-bold text-[var(--pf-valeur)]">
              {somme}
            </span>
          </Ligne>
          <Ligne libelle="Pour">{p.objet}</Ligne>
          <Ligne libelle="Vers" dernier>
            {p.titulaire || "CanCham Madagascar"}
          </Ligne>
        </dl>

        <MentionSecret mode={p.mode} className="mt-5 text-[var(--pf-douce)]" />
      </aside>

      <section className="p-7">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={p.retour}
            aria-label="Choisir un autre moyen de paiement"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-ink no-underline transition-colors hover:bg-surface-3"
          >
            <ChevronLeft size={20} />
          </Link>
          <span className="text-[13px] font-semibold text-muted">
            Étape {etape} sur 3
          </span>
        </div>

        {etape === 1 ? (
          <>
            <h1 className="m-0 mt-5 text-[27px] font-bold leading-[1.15] tracking-[-0.015em]">
              Votre règlement par {titre}
            </h1>
            <div className="mt-5 overflow-hidden rounded-[var(--radius-m)]">
              <div className="bg-[var(--pf-fond)] px-6 py-5 text-[var(--pf-encre)]">
                <div className="text-[13px] font-semibold">
                  Montant à régler
                </div>
                <div className="mt-1 text-[34px] font-bold leading-none tracking-[-0.02em] tabular-nums">
                  {somme}
                </div>
              </div>
              <div className="grid grid-cols-2 bg-[#101418] text-white">
                <div className="px-6 py-3.5">
                  <div className="text-[12px] text-white/60">Pour</div>
                  <div className="truncate text-[13.4px] font-semibold">
                    {p.objet}
                  </div>
                </div>
                <div className="border-l border-white/12 px-6 py-3.5">
                  <div className="text-[12px] text-white/60">Vers</div>
                  <div className="truncate text-[13.4px] font-semibold">
                    {p.titulaire || "CanCham Madagascar"}
                  </div>
                </div>
              </div>
            </div>

            <PaiementDirect p={p} className="mt-6" />
            <div className="mt-5">
              <Link
                href={p.plusTard}
                className="text-[14px] font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
              >
                Payer plus tard
              </Link>
            </div>
          </>
        ) : (
          <Merci {...p} somme={somme} />
        )}
      </section>
    </div>
  );
}

function Ligne({
  libelle,
  children,
  dernier = false,
}: {
  libelle: string;
  children: React.ReactNode;
  dernier?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-2.5 ${
        dernier ? "" : "border-b border-dashed border-white/15"
      }`}
    >
      <dt className="shrink-0 text-[12.6px] text-white/60">{libelle}</dt>
      <dd className="m-0 min-w-0 truncate text-right text-[13.6px] font-semibold">
        {children}
      </dd>
    </div>
  );
}

function Merci({ statut, reference, somme }: PropsTunnel & { somme: string }) {
  const encaisse = statut === "reussie";
  return (
    <>
      <h1 className="m-0 mt-5 text-[27px] font-bold leading-[1.15] tracking-[-0.015em]">
        {encaisse ? "Règlement encaissé" : "Merci — c’est noté"}
      </h1>
      <p className="m-0 mt-3 text-[14.5px] leading-relaxed text-muted">
        {encaisse
          ? `L’équipe a constaté l’arrivée de ${somme}. Il n’y a plus rien à faire.`
          : `Vous avez annoncé un règlement de ${somme}. L’équipe le confirmera dès qu’elle aura constaté l’arrivée de l’argent, et vous le verrez dans votre espace.`}
      </p>
      <div className="mt-5 max-w-[420px]">
        <Copiable libelle="Référence du règlement" valeur={reference} accent />
      </div>
      <div className="mt-6">
        <Link
          href="/membre/cotisations"
          className="inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-m)] bg-[var(--pf-bouton)] px-6 text-[15px] font-bold text-[var(--pf-sur-bouton)] no-underline transition-colors hover:bg-[var(--pf-bouton-survol)]"
        >
          Revenir aux factures <ArrowRight size={17} />
        </Link>
      </div>
    </>
  );
}
