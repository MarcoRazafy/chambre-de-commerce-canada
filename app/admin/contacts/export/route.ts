import { exigerEquipe } from "@/lib/autorisations";
import { getTousContacts, lireFiltresContacts } from "@/lib/contacts-admin";
import { reponseCsv, versCsv } from "@/lib/csv";

export async function GET(requete: Request) {
  await exigerEquipe();
  const f = lireFiltresContacts(Object.fromEntries(new URL(requete.url).searchParams));
  const contacts = await getTousContacts(f);
  return reponseCsv(
    "contacts",
    versCsv(
      ["Nom", "Fonction", "Entreprise", "E-mail", "Téléphone", "Contact principal", "Accès à la plateforme"],
      contacts.map((c) => [c.nom, c.fonction, c.member?.nom, c.email, c.tel, c.contactPrincipal ? "Oui" : "Non", c.actif ? "Actif" : "Invitation en attente"]),
    ),
  );
}
