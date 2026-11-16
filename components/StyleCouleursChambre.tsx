import { chambreCouranteOuRien } from "@/lib/chambre-courante";
import { cssCouleurs } from "@/lib/couleurs";
import { prismaSysteme } from "@/lib/db";

// Les couleurs réglées par la Chambre (Paramètres → Couleurs), posées sur ses espaces ; rien hors d'une Chambre
// (site, page de connexion d'un espace partagé sans Chambre choisie). Les valeurs sont vérifiées (« #rrggbb »).
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
    select: { couleurPrincipale: true, couleurLaterale: true, couleurLaterale2: true, couleurHaut: true, couleurConnexion: true },
  });
  const css = p ? cssCouleurs({ principale: p.couleurPrincipale, laterale: p.couleurLaterale, laterale2: p.couleurLaterale2, haut: p.couleurHaut, connexion: p.couleurConnexion }) : "";
  return css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null;
}
