import { EnTeteAdmin } from "@/components/admin/ui";
import { FormulaireEvenement } from "@/components/forms/FormulaireEvenement";
import { Saillant } from "@/components/ui";
import { getTousLesTags } from "@/lib/contacts-admin";

export default async function NouvelEvenement() {
  return (
    <>
      <EnTeteAdmin
        surtitre="Programme"
        titre={
          <>
            Nouvel <Saillant>événement</Saillant>
          </>
        }
      />
      <FormulaireEvenement tousTags={await getTousLesTags()} />
    </>
  );
}
