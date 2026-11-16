import { redirect } from "next/navigation";

// Le maillage est retiré de l'application : l'ancienne adresse (liens déjà envoyés) ramène à l'accueil de l'espace
export default function Maillage() {
  redirect("/membre");
}
