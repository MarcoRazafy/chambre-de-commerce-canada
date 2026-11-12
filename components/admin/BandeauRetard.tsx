import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import type { EtatPaiement } from "@/lib/etat-paiement";

// En haut de l'espace : une facture de l'abonnement attend son paiement (et l'espace est peut-être restreint)
export function BandeauRetard({ etat, lien = true }: { etat: EtatPaiement; lien?: boolean }) {
  if (!etat.enRetard) return null;
  const texte =
    etat.restriction === "lecture"
      ? "Espace en lecture seule : une facture de l’abonnement attend son paiement."
      : etat.restriction === "blocage"
        ? "Espace bloqué : une facture de l’abonnement attend son paiement."
        : `La facture ${etat.numero} attend son paiement.`;
  return (
    <div role="alert" className="mb-5 flex items-center justify-between gap-3 flex-wrap rounded-[var(--radius-m)] border border-warn/40 bg-warn-soft px-4 py-3 text-[13.5px] text-ink">
      <span className="flex items-center gap-2.5">
        <TriangleAlert size={17} className="text-warn shrink-0" aria-hidden /> {texte}
      </span>
      {lien ? (
        <Link href="/admin/abonnement?onglet=factures#onglets" className="btn-contour btn-contour-sm text-ink hover:bg-surface no-underline">Payer</Link>
      ) : null}
    </div>
  );
}
