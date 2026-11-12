import { exigerEquipe } from "@/lib/autorisations";
import { reponseCsv, versCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";

const ORIGINE: Record<string, string> = { vitrine: "Inscrit depuis le site", import: "Importé" };

// Export des contacts sans entreprise cochés dans la page Contacts (envoyés par formulaire)
export async function POST(requete: Request) {
  await exigerEquipe();
  const ids = (await requete.formData()).getAll("contacts").map(String);
  const contacts = await prisma.abonne.findMany({ where: { id: { in: ids }, desabonneLe: null }, orderBy: { createdAt: "desc" } });
  return reponseCsv(
    "contacts-sans-entreprise",
    versCsv(
      ["Prénom", "Courriel", "Origine", "Depuis", "Adresse en erreur"],
      contacts.map((a) => [a.prenom, a.email, ORIGINE[a.source] ?? "Ajouté par l’équipe", a.createdAt.toISOString().slice(0, 10), a.erreurLe ? "Oui" : ""]),
    ),
  );
}
