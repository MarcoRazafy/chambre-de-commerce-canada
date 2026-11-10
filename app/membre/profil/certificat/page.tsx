import { notFound } from "next/navigation";
import { CertificatAdhesion } from "@/components/Certificat";
import { PrintButton } from "@/components/forms/PrintButton";
import { getInvoices, getMember } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { ADHESION_PENDING } from "@/lib/membership";
import { getProfilChambre } from "@/lib/profil-chambre";
import { renouvellementCotisation } from "@/lib/agenda";

export default async function CertificatPage() {
  const user = await getCurrentUser("membre");
  const m = user.memberId ? await getMember(user.memberId) : null;
  if (!m) notFound();
  if (ADHESION_PENDING.includes(m.statut)) notFound();

  const factures = await getInvoices(m.id);
  const fin = renouvellementCotisation({
    factures,
    adhesion: m.adhesion,
    aJour: m.statut === "a_jour",
  });

  return (
    <>
      <div className="flex justify-end gap-3 flex-wrap mb-4 no-print">
        <PrintButton />
      </div>

      <style>
        {"@media print { @page { size: A4 landscape; margin: 0 } }"}
      </style>

      <CertificatAdhesion membre={m} fin={fin} site={(await getProfilChambre()).site} />
    </>
  );
}
