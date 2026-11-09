import { notFound } from "next/navigation";
import { EnTeteAdmin } from "@/components/admin/ui";
import { FormulaireEvenement } from "@/components/forms/FormulaireEvenement";
import { Saillant } from "@/components/ui";
import { getEvent } from "@/lib/queries";

export default async function ModifierEvenement({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const e = await getEvent(id);
  if (!e) notFound();

  return (
    <>
      <EnTeteAdmin
        surtitre="Programme"
        titre={
          <>
            Modifier <Saillant>l’événement</Saillant>
          </>
        }
      >
        {e.titre}
      </EnTeteAdmin>
      <FormulaireEvenement event={e} />
    </>
  );
}
