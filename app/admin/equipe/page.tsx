import { redirect } from "next/navigation";

// Ancienne page « Équipe & accès » : elle est devenue un onglet d'Abonnement & utilisateurs
export default function AdminEquipe() {
  redirect("/admin/abonnement?onglet=equipe#onglets");
}
