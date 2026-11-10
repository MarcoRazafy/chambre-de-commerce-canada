import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FactureDocument } from "@/components/FactureDocument";
import { getProfilChambre } from "@/lib/profil-chambre";
import { PrintButton } from "@/components/forms/PrintButton";
import { getFacture } from "@/lib/factures";
import { getCurrentUser } from "@/lib/session";

export default async function FactureMembre({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser("membre");
  const f = await getFacture(id);
  if (!f || f.membreId !== user.memberId) notFound();

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5 print:hidden">
        <Link
          href="/membre/cotisations"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted no-underline hover:text-accent"
        >
          <ArrowLeft size={14} /> Cotisations &amp; factures
        </Link>
        <PrintButton />
      </div>
      <FactureDocument facture={f} emetteur={await getProfilChambre()} />
    </>
  );
}
