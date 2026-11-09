import { notFound } from "next/navigation";
import { EnTeteAdmin } from "@/components/admin/ui";
import { FormulaireActualite } from "@/components/forms/AdminContenuForms";
import { Saillant } from "@/components/ui";
import { getNewsItem } from "@/lib/queries";

export default async function ModifierActualite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const n = await getNewsItem(id);
  if (!n) notFound();

  return (
    <>
      <EnTeteAdmin
        surtitre="Programme"
        titre={
          <>
            Modifier <Saillant>l’actualité</Saillant>
          </>
        }
      >
        {n.titre}
      </EnTeteAdmin>
      <FormulaireActualite news={n} />
    </>
  );
}
