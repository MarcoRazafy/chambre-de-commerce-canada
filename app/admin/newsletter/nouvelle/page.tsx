import { EnTeteAdmin } from "@/components/admin/ui";
import { EditeurLettre } from "@/components/newsletter/EditeurLettre";
import { Saillant } from "@/components/ui";
import { prisma } from "@/lib/db";
import { AUDIENCE_DEFAUT } from "@/lib/newsletter";

export default async function NouvelleLettre() {
  const ms = await prisma.member.findMany({ select: { etiquettes: true } });
  const etiquettes = [...new Set(ms.flatMap((m) => m.etiquettes))].sort((a, b) => a.localeCompare(b, "fr"));
  return (
    <>
      <EnTeteAdmin surtitre="Newsletter" titre={<>Nouvelle <Saillant>lettre</Saillant></>} />
      <EditeurLettre lettre={null} audience={AUDIENCE_DEFAUT} etiquettes={etiquettes} nbDestinataires={null} />
    </>
  );
}
