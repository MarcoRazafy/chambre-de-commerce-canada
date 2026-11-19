import { redirect } from "next/navigation";

export default function AdminEquipe() {
  redirect("/admin/abonnement?onglet=equipe#onglets");
}
