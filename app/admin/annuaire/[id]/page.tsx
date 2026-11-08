import { redirect } from "next/navigation";

// Dans le back-office, un membre n'a qu'une fiche : celle de gestion.
// Cette adresse reste valable pour les anciens liens.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/membres/${encodeURIComponent(id)}`);
}
