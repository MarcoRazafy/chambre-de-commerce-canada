import { exigerEquipe } from "@/lib/autorisations";
import { getEntreprisesContacts, lireFiltresContacts } from "@/lib/contacts-admin";
import { reponseCsv, versCsv } from "@/lib/csv";
import { statusLabel } from "@/lib/format";

// Export de la page Contacts : une ligne par entreprise, avec son contact principal
export async function GET(requete: Request) {
  await exigerEquipe();
  const sp = new URL(requete.url).searchParams;
  const f = lireFiltresContacts(Object.fromEntries([...new Set(sp.keys())].map((k) => [k, sp.getAll(k)])));
  const entreprises = await getEntreprisesContacts(f);
  return reponseCsv(
    "contacts",
    versCsv(
      ["Entreprise", "Secteur", "Ville", "Situation", "Contact principal", "Fonction", "E-mail", "Téléphone", "Accès à la plateforme", "Tags"],
      entreprises.map((e) => [
        e.nom,
        e.secteur,
        e.ville,
        statusLabel(e.statut),
        e.contact?.nom,
        e.contact?.fonction,
        e.contact?.email,
        e.contact?.tel,
        e.contact ? (e.contact.actif ? "Actif" : "Invitation en attente") : "",
        e.etiquettes.join(", "),
      ]),
    ),
  );
}
