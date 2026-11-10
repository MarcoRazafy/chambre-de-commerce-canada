import { redirect } from "next/navigation";

// Ancienne page « Équipe & accès » : elle est devenue un onglet d'Abonnement & utilisateurs
export default async function AdminEquipe({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  redirect(`/admin/abonnement?onglet=equipe${q ? `&q=${encodeURIComponent(q)}` : ""}#onglets`);
}
