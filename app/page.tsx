import { redirect } from "next/navigation";
import { utilisateurConnecte } from "@/lib/session";

// Pas de site vitrine : l'adresse du site ouvre l'espace de chacun, ou la connexion
export default async function Racine() {
  const u = await utilisateurConnecte();
  redirect(!u ? "/auth" : u.role === "admin" ? "/admin" : "/membre");
}
