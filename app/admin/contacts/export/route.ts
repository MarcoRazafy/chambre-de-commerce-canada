import { exigerEquipe } from "@/lib/autorisations";
import { getEntreprisesContacts, lireFiltresContacts, type EntrepriseContact } from "@/lib/contacts-admin";
import { reponseCsv, versCsv } from "@/lib/csv";
import { statusLabel } from "@/lib/format";

// Export de la page Contacts : une ligne par entreprise, avec son contact principal
function csv(entreprises: EntrepriseContact[]) {
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

// Selon les filtres de l'adresse
export async function GET(requete: Request) {
  await exigerEquipe();
  const sp = new URL(requete.url).searchParams;
  const f = lireFiltresContacts(Object.fromEntries([...new Set(sp.keys())].map((k) => [k, sp.getAll(k)])));
  return csv(await getEntreprisesContacts(f));
}

// Les entreprises sélectionnées dans le tableau (envoyées par formulaire)
export async function POST(requete: Request) {
  await exigerEquipe();
  const ids = new Set((await requete.formData()).getAll("entreprises").map(String));
  return csv((await getEntreprisesContacts()).filter((e) => ids.has(e.id)));
}
