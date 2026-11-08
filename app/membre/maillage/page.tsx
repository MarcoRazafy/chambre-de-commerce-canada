import { redirect } from "next/navigation";

// Le maillage du membre vit dans « Mon entreprise », onglet Maillage
export default function MaillageMembre() {
  redirect("/membre/profil?onglet=maillage");
}
