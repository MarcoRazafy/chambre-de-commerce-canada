import { notFound } from "next/navigation";
import { EnTeteAdmin } from "@/components/admin/ui";
import { FormulaireEvenement } from "@/components/forms/FormulaireEvenement";
import { Saillant } from "@/components/ui";
import { getTousLesTags } from "@/lib/contacts-admin";
import { prisma } from "@/lib/db";
import { getEvent } from "@/lib/queries";

export default async function ModifierEvenement({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [e, tousTags, tags] = await Promise.all([
    getEvent(id),
    getTousLesTags(),
    // Lus à part : ces repères internes ne passent pas par la fiche partagée avec les membres
    prisma.event.findUnique({ where: { id }, select: { etiquettes: true } }),
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
      <FormulaireEvenement event={e} tousTags={tousTags} tags={tags?.etiquettes ?? []} />
    </>
  );
}
