import { redirect } from "next/navigation";

// Ancienne page « Équipe & accès » : elle est devenue une section d'Abonnement & utilisateurs
export default async function AdminEquipe({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  redirect(`/admin/abonnement${q ? `?q=${encodeURIComponent(q)}` : ""}#equipe`);
}
