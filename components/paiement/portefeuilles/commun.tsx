import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Smartphone } from "lucide-react";
import { BoutonMarque } from "@/components/paiement/BoutonMarque";
import { payerParPortefeuille } from "@/lib/actions/paiements";
import { fmtMontant, type Devise } from "@/lib/membership";
import { MONTANT_MINIMUM_EN_LIGNE } from "@/lib/vanillapay";
import { MODES } from "@/lib/modes-reglement";
import { PORTEFEUILLES, type Portefeuille } from "@/lib/portefeuilles";

export interface PropsTunnel {
  mode: Portefeuille;
  reglementId: string;
  reference: string;
  montant: number;
  devise: Devise;
  objet: string;
  titulaire: string;
  statut: string;
  retour: string;
  plusTard: string;
  raccorde: boolean;
  marchand?: string | null;
  logo?: string;
}

export function PaiementDirect({
  p,
  className = "",
}: {
  p: PropsTunnel;
  className?: string;
}) {
  const titre = MODES[p.mode].titre;
  const somme = fmtMontant(p.montant, p.devise);
  const billets = /^participation/i.test(p.objet);
  if (!p.raccorde) {
    return (
      <div
        role="alert"
        className={`rounded-[var(--radius-m)] border border-warn/40 bg-warn-soft p-5 text-[14px] leading-relaxed text-warn ${className}`}
      >
        Le paiement par {titre} n’est pas disponible pour ce règlement : il faut
        un montant d’au moins {fmtMontant(MONTANT_MINIMUM_EN_LIGNE, "MGA")}, en
        ariary.{" "}
        <Link href={p.retour} className="font-semibold text-warn underline">
          Choisir un autre moyen
        </Link>
      </div>
    );
  }
  return (
    <div
      className={`rounded-[var(--radius-m)] border-2 border-[var(--pf-fond)] p-5 ${className}`}
    >
      <div className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--pf-fond)] text-[var(--pf-encre)]">
          <Smartphone size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="m-0 text-[19px] font-bold leading-tight">
            Payer maintenant, depuis {titre}
          </h2>
          <p className="m-0 mt-1.5 text-[13.5px] leading-relaxed text-muted">
            La page de paiement vous demande votre numéro {titre}, puis la
            validation avec votre code secret. {somme} sont alors débités, plus
            les frais de l’opérateur. Votre reçu
            {billets ? " et vos billets arrivent" : " arrive"} aussitôt.
          </p>
        </div>
      </div>
      <form
        action={payerParPortefeuille}
        className="mt-4 flex flex-wrap items-center gap-4"
      >
        <input type="hidden" name="reglementId" value={p.reglementId} />
        <BoutonMarque className="rounded-[var(--radius-m)]">
          Payer {somme} par {titre} <ArrowRight size={17} />
        </BoutonMarque>
      </form>
      {p.marchand ? (
        <p className="m-0 mt-3 text-[12.5px] leading-snug text-muted">
          Sur la page de paiement, le marchand affiché est{" "}
          <b className="text-ink">{p.marchand}</b> : il encaisse pour le compte
          de la CanCham.
        </p>
      ) : null}
    </div>
  );
}

export type Etape = 1 | 2 | 3;

export const ETAPES = ["Montant", "Paiement", "Reçu"] as const;

export function etapeDu(p: PropsTunnel): Etape {
  return p.statut === "annonce" || p.statut === "reussie" ? 3 : 1;
}

export function couleurs(mode: Portefeuille): CSSProperties {
  const c = PORTEFEUILLES[mode].palette;
  return {
    "--pf-fond": c.fond,
    "--pf-encre": c.encre,
    "--pf-douce": c.douce,
    "--pf-valeur": c.valeur,
    "--pf-bouton": c.bouton,
    "--pf-sur-bouton": c.surBouton,
    "--pf-bouton-survol": c.boutonSurvol,
  } as CSSProperties;
}

export const LOGOS: Record<
  Portefeuille,
  { src: string; largeur: number; hauteur: number }
> = {
  mvola: { src: "/paiement/mvola-detoure.png", largeur: 769, hauteur: 349 },
  orange_money: {
    src: "/paiement/orange-money-detoure.png",
    largeur: 626,
    hauteur: 255,
  },
  airtel_money: {
    src: "/paiement/airtel-money.png",
    largeur: 520,
    hauteur: 229,
  },
};

export function MentionSecret({
  mode,
  className = "",
}: {
  mode: Portefeuille;
  className?: string;
}) {
  return (
    <p
      className={`m-0 flex items-start gap-2 text-[13px] leading-snug ${className}`}
    >
      <ShieldCheck size={16} aria-hidden className="mt-px shrink-0" />
      La CanCham ne vous demandera jamais votre code secret {MODES[mode].titre}.
    </p>
  );
}
