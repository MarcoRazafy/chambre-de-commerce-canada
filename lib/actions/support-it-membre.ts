"use server";

// Support IT, côté membre : écrire à l'Admin GM (texte, photos, vidéos, PDF), marquer les réponses lues
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { ecrireSupportITMembre, lireSupportITMembre, type ResultatEnvoi } from "@/lib/support-it";

export async function ecrireSupportIT(_avant: ResultatEnvoi | null, formData: FormData): Promise<ResultatEnvoi> {
  const user = await getCurrentUser("membre");
  const r = await ecrireSupportITMembre(user, formData);
  if (r.ok) revalidatePath("/membre/support-it");
  return r;
}

export async function marquerLuSupportITMembre(): Promise<void> {
  const user = await getCurrentUser("membre");
  await lireSupportITMembre(user.id);
}
