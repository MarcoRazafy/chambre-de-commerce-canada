import { EnTeteAdmin } from "@/components/admin/ui";
import { EditeurRappel } from "@/components/rappels/EditeurRappel";
import { Saillant } from "@/components/ui";
import { estDeclencheur } from "@/lib/rappels-membres-base";

export default async function NouveauRappel({ searchParams }: { searchParams: Promise<{ declencheur?: string }> }) {
  const { declencheur: brut } = await searchParams;
  const declencheur = estDeclencheur(brut) ? brut : "facture";
  return (
    <>
      <EnTeteAdmin surtitre="Rappels" titre={<>Nouveau <Saillant>rappel</Saillant></>} />
      <EditeurRappel rappel={{ declencheur, jours: declencheur === "facture" ? 7 : 30, sujet: "", contenu: "", actif: true }} />
    </>
  );
}
