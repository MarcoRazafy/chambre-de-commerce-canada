import { redirect } from "next/navigation";

// « Besoin d'aide ? » mène désormais à la page « Contacter l'équipe » ; l'ancienne adresse y renvoie
export default function Aide() {
  redirect("/membre/contact");
}
