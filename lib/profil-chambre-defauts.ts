// Profil de la Chambre (« Mon entreprise ») : chaque champ vide reprend la valeur par défaut.
// Les coordonnées par défaut (lib/coordonnees.ts) sont celles de la Chambre n° 1 : les autres Chambres
// n'en reçoivent pas (champ vide), pour ne jamais afficher les coordonnées d'une autre.
import { CHAMBRE_PRINCIPALE } from "@/lib/chambre-courante";
import { COORDONNEES } from "@/lib/coordonnees";

export type ProfilChambre = {
  nom: string;
  description: string;
  adresse: string;
  telephone: string;
  email: string;
  site: string;
  logo: string;
  couverture: string | null;
  raisonSociale: string;
  adresseFacturation: string;
  neq: string;
  tps: string;
  tvq: string;
};

// L'adresse en parties (rue, code postal, ville, pays) : sur une ligne, ou une ligne par partie (factures)
export type PartiesAdresse = { adresseRue?: string | null; codePostal?: string | null; ville?: string | null; pays?: string | null };
function lignesAdresse(p: PartiesAdresse): string[] {
  const t = (x?: string | null) => x?.trim() ?? "";
  return [t(p.adresseRue), [t(p.codePostal), t(p.ville)].filter(Boolean).join(" "), t(p.pays)].filter(Boolean);
}
export const adresseSurUneLigne = (p: PartiesAdresse) => lignesAdresse(p).join(", ");

export const NOM_CHAMBRE = "Chambre de Commerce et de Coopération Canada–Madagascar";

type Ligne = Partial<Record<keyof ProfilChambre, string | null>> & PartiesAdresse & { chambreId?: string | null };

// Une autre Chambre que la n° 1 : pas de coordonnées par défaut
export const sansDefauts = (l: { chambreId?: string | null } | null) => !!l?.chambreId && l.chambreId !== CHAMBRE_PRINCIPALE;

export function completerProfil(l: Ligne | null): ProfilChambre {
  const neutre = sansDefauts(l);
  const v = (k: keyof ProfilChambre, defaut: string) => (l?.[k]?.trim() ? l[k]!.trim() : neutre ? "" : defaut);
  const nom = v("nom", NOM_CHAMBRE);
  // L'adresse vient de ses parties si elles sont remplies, sinon de l'ancienne adresse d'un seul tenant
  const lignes = l ? lignesAdresse(l) : [];
  const adresse = lignes.length ? lignes.join(", ") : v("adresse", COORDONNEES.adresse);
  const logo = l?.logo?.trim() || "/marque/logo-couleur.png";
  return {
    nom,
    description: v("description", ""),
    adresse,
    telephone: v("telephone", COORDONNEES.telephone),
    email: v("email", COORDONNEES.email),
    site: v("site", COORDONNEES.site),
    logo,
    couverture: l?.couverture?.trim() || null,
    // Par défaut, le nom de la Chambre elle-même (pas une valeur d'une autre Chambre)
    raisonSociale: l?.raisonSociale?.trim() || nom,
    adresseFacturation: lignes.length ? lignes.join("\n") : adresse,
    neq: v("neq", ""),
    tps: v("tps", ""),
    tvq: v("tvq", ""),
  };
}

// Les numéros fiscaux à imprimer sur une facture (seulement ceux qui sont remplis)
export function numerosFiscaux(p: ProfilChambre): string[] {
  return [
    p.neq && `NEQ : ${p.neq}`,
    p.tps && `TPS : ${p.tps}`,
    p.tvq && `TVQ : ${p.tvq}`,
  ].filter((x): x is string => !!x);
}
