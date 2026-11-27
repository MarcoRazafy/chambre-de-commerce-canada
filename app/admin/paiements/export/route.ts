import { exigerEquipe } from "@/lib/autorisations";
import { reponseCsv, versCsv } from "@/lib/csv";
import { filtrerFactures, lireFiltresFactures } from "@/lib/filtres-factures";
import { getInvoices } from "@/lib/queries";
import { getDelais } from "@/lib/delais-chambre";

export async function GET(requete: Request) {
  await exigerEquipe();
  const params = Object.fromEntries(new URL(requete.url).searchParams);
  const factures = filtrerFactures(
    await getInvoices(),
    lireFiltresFactures(params),
    (await getDelais()).reglement,
  );

  const csv = versCsv(
    ["Numéro", "Date", "Membre", "Objet", "Montant", "Devise", "Statut"],
    factures.map((f) => [
      f.numero,
      f.date,
      f.membre,
      f.objet,
      f.montant,
      f.devise,
      f.statut === "payee" ? "Payée" : "À régler",
    ]),
  );
  return reponseCsv("factures-cancham", csv);
}
