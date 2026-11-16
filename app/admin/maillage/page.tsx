import { redirect } from "next/navigation";

// Le maillage est retiré de l'application : l'ancienne adresse ramène à l'accueil du back-office
export default function Maillage() {
  redirect("/admin");
}
