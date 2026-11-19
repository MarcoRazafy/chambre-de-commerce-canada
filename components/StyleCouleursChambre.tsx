import { chambreCouranteOuRien } from "@/lib/chambre-courante";
import { cssCouleurs } from "@/lib/couleurs";
import { prismaSysteme } from "@/lib/db";

export async function StyleCouleursChambre() {
  let id: string | null = null;
  try {
    id = await chambreCouranteOuRien();
  } catch {
    return null;
  }
  if (!id) return null;
  const p = await prismaSysteme.profilChambre.findUnique({
    where: { chambreId: id },
    select: { couleurPrincipale: true, couleurLaterale: true, couleurLaterale2: true, couleurHaut: true, couleurConnexion: true, couleurFondConnexion: true, couleurTexteConnexion: true },
  });
  const css = p ? cssCouleurs({ principale: p.couleurPrincipale, laterale: p.couleurLaterale, laterale2: p.couleurLaterale2, haut: p.couleurHaut, connexion: p.couleurConnexion, fondConnexion: p.couleurFondConnexion, texteConnexion: p.couleurTexteConnexion }) : "";
  return css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null;
}
