import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { FactureDocument } from "@/components/FactureDocument";
import { getProfilChambre } from "@/lib/profil-chambre";
import {
  MarquerPayeeButton,
  SupprimerFactureButton,
} from "@/components/forms/FactureForms";
import { PrintButton } from "@/components/forms/PrintButton";
import { fmtMontant } from "@/lib/membership";
import { getFacture } from "@/lib/factures";

export default async function FactureAdmin({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const f = await getFacture(id);
  if (!f) notFound();

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5 print:hidden">
        <Link
          href="/admin/paiements"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted no-underline hover:text-accent"
        >
          <ArrowLeft size={14} /> Toutes les factures
        </Link>
        <div className="flex items-center gap-2.5 flex-wrap">
          {f.membreId ? (
            <Link
              href={`/admin/membres/${f.membreId}`}
              className="btn-contour btn-contour-sm text-ink no-underline hover:bg-surface-2"
            >
              Fiche du membre <ExternalLink size={13} />
            </Link>
          ) : (
            <span className="text-[12.5px] text-muted">
              Membre supprimé · facture conservée
            </span>
          )}
          {f.statut === "envoyee" ? (
            <MarquerPayeeButton
              factureId={f.id}
              numero={f.numero}
              montant={fmtMontant(f.montant, f.devise)}
              cotisation={/^cotisation/i.test(f.objet)}
            />
          ) : null}
          <PrintButton contour={f.statut === "envoyee"} />
          <SupprimerFactureButton
            factureId={f.id}
            numero={f.numero}
            montant={fmtMontant(f.montant, f.devise)}
            membre={f.membre}
            payee={f.statut === "payee"}
          />
        </div>
      </div>

      <FactureDocument facture={f} emetteur={await getProfilChambre()} />
    </>
  );
}
