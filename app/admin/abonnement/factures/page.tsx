import { redirect } from "next/navigation";

// Les factures de l'abonnement sont un onglet d'Abonnement & utilisateurs
export default function FacturesAbonnement() {
  redirect("/admin/abonnement?onglet=factures");
}
