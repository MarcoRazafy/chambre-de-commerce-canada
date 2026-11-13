"use server";

// Support IT, côté Admin GM : répondre à une Chambre (texte, photos, vidéos, PDF), marquer sa conversation lue
import { revalidatePath } from "next/cache";
import { compteGM } from "@/lib/gm";
import { ecrireSupportGM, lireSupportGM, type ResultatEnvoi } from "@/lib/support-it";

export async function repondreSupportIT(_avant: ResultatEnvoi | null, formData: FormData): Promise<ResultatEnvoi> {
  const gm = await compteGM();
  if (!gm) return { ok: false, erreur: "Session expirée : reconnectez-vous." };
  const chambreId = String(formData.get("chambreId") ?? "");
  const r = await ecrireSupportGM(gm, chambreId, formData);
  if (r.ok) revalidatePath("/gm", "layout");
  return r;
}

export async function marquerLuSupportIT(chambreId: string): Promise<void> {
  if (!(await compteGM())) return;
  await lireSupportGM(String(chambreId));
  revalidatePath("/gm", "layout");
}
