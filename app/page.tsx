import { redirect } from "next/navigation";
import { utilisateurConnecte } from "@/lib/session";

export default async function Racine() {
  const u = await utilisateurConnecte();
  redirect(!u ? "/auth" : u.role === "admin" ? "/admin" : "/membre");
}
