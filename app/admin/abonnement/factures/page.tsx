import { redirect } from "next/navigation";

export default function FacturesAbonnement() {
  redirect("/admin/abonnement?onglet=factures#onglets");
}
