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
  logoFond: string | null;
  raisonSociale: string;
  adresseFacturation: string;
  neq: string;
  tps: string;
  tvq: string;
};

export type PartiesAdresse = { adresseRue?: string | null; codePostal?: string | null; ville?: string | null; province?: string | null; pays?: string | null };
function lignesAdresse(p: PartiesAdresse): string[] {
  const t = (x?: string | null) => x?.trim() ?? "";
  const provinceCp = [t(p.province), t(p.codePostal)].filter(Boolean).join(" ");
  return [t(p.adresseRue), [t(p.ville), provinceCp].filter(Boolean).join(", "), t(p.pays)].filter(Boolean);
}
export const adresseSurUneLigne = (p: PartiesAdresse) => lignesAdresse(p).join(", ");

export const couleurValide = (v?: string | null) => (v && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim().toLowerCase() : null);

export const NOM_CHAMBRE = "Chambre de Commerce et de Coopération Canada–Madagascar";

type Ligne = Partial<Record<keyof ProfilChambre, string | null>> & PartiesAdresse & { chambreId?: string | null };

export const sansDefauts = (l: { chambreId?: string | null } | null) => !!l?.chambreId && l.chambreId !== CHAMBRE_PRINCIPALE;

export function completerProfil(l: Ligne | null): ProfilChambre {
  const neutre = sansDefauts(l);
  const v = (k: keyof ProfilChambre, defaut: string) => (l?.[k]?.trim() ? l[k]!.trim() : neutre ? "" : defaut);
  const nom = v("nom", NOM_CHAMBRE);
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
    logoFond: couleurValide(l?.logoFond),
    raisonSociale: l?.raisonSociale?.trim() || nom,
    adresseFacturation: lignes.length ? lignes.join("\n") : adresse,
    neq: v("neq", ""),
    tps: v("tps", ""),
    tvq: v("tvq", ""),
  };
}

export function numerosFiscaux(p: ProfilChambre): string[] {
  return [
    p.neq && `NEQ : ${p.neq}`,
    p.tps && `TPS : ${p.tps}`,
    p.tvq && `TVQ : ${p.tvq}`,
  ].filter((x): x is string => !!x);
}
