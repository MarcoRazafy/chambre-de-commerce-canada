import { notFound } from "next/navigation";
import { EnTeteAdmin } from "@/components/admin/ui";
import { FormulaireEvenement } from "@/components/forms/FormulaireEvenement";
import { Saillant } from "@/components/ui";
import { getTousLesTags } from "@/lib/contacts-admin";
import { prisma } from "@/lib/db";
import { getEvent } from "@/lib/queries";
import { couleursChambre } from "@/lib/evenements-publics";

export default async function ModifierEvenement({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [e, tousTags, tags, couleurs] = await Promise.all([
    getEvent(id),
    getTousLesTags(),
    prisma.event.findUnique({ where: { id }, select: { etiquettes: true } }),
    couleursChambre(),
  ]);
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
      <FormulaireEvenement event={e} tousTags={tousTags} tags={tags?.etiquettes ?? []} couleursChambre={couleurs} />
    </>
  );
}
