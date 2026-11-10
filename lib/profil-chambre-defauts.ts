// Profil de la Chambre (« Mon entreprise ») : chaque champ vide reprend la valeur par défaut de la plateforme
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
  nif: string;
  stat: string;
  logoFacture: string;
  mentionFacture: string;
};

export const NOM_CHAMBRE = "Chambre de Commerce et de Coopération Canada–Madagascar";

type Ligne = Partial<Record<keyof ProfilChambre, string | null>>;

export function completerProfil(l: Ligne | null): ProfilChambre {
  const v = (k: keyof ProfilChambre, defaut: string) => (l?.[k]?.trim() ? l[k]!.trim() : defaut);
  const nom = v("nom", NOM_CHAMBRE);
  const adresse = v("adresse", COORDONNEES.adresse);
  const logo = v("logo", "/marque/logo-couleur.png");
  return {
    nom,
    description: v("description", ""),
    adresse,
    telephone: v("telephone", COORDONNEES.telephone),
    email: v("email", COORDONNEES.email),
    site: v("site", COORDONNEES.site),
    logo,
    couverture: l?.couverture?.trim() || null,
    raisonSociale: v("raisonSociale", nom),
    adresseFacturation: v("adresseFacturation", adresse),
    neq: v("neq", ""),
    tps: v("tps", ""),
    tvq: v("tvq", ""),
    nif: v("nif", COORDONNEES.nif),
    stat: v("stat", COORDONNEES.stat),
    logoFacture: v("logoFacture", logo),
    mentionFacture: v("mentionFacture", ""),
  };
}

// Les numéros fiscaux à imprimer sur une facture (seulement ceux qui sont remplis)
export function numerosFiscaux(p: ProfilChambre): string[] {
  return [
    p.neq && `NEQ : ${p.neq}`,
    p.tps && `TPS : ${p.tps}`,
    p.tvq && `TVQ : ${p.tvq}`,
    p.nif && `NIF : ${p.nif}`,
    p.stat && `STAT : ${p.stat}`,
  ].filter((x): x is string => !!x);
}
