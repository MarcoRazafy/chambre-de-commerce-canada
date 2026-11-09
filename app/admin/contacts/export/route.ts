import { exigerEquipe } from "@/lib/autorisations";
import { getTousContacts, lireFiltresContacts } from "@/lib/contacts-admin";
import { reponseCsv, versCsv } from "@/lib/csv";

export async function GET(requete: Request) {
  await exigerEquipe();
  const sp = new URL(requete.url).searchParams;
  const f = lireFiltresContacts(Object.fromEntries([...new Set(sp.keys())].map((k) => [k, sp.getAll(k)])));
  const contacts = await getTousContacts(f);
  return reponseCsv(
    "contacts",
    versCsv(
      ["Nom", "Fonction", "Entreprise", "E-mail", "Téléphone", "Contact principal", "Accès à la plateforme", "Tags"],
      contacts.map((c) => [c.nom, c.fonction, c.member?.nom, c.email, c.tel, c.contactPrincipal ? "Oui" : "Non", c.actif ? "Actif" : "Invitation en attente", c.etiquettes.join(", ")]),
    ),
  );
}
