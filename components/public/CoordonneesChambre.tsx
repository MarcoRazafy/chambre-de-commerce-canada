import Image from "next/image";
import type { ProfilChambre } from "@/lib/profil-chambre-defauts";

// En tête des pages de connexion et d'adhésion : le logo de la Chambre (Mon entreprise)
export function LogoChambreAuth({ profil }: { profil: Pick<ProfilChambre, "nom" | "logo"> }) {
  return <Image src={profil.logo} alt={profil.nom} width={400} height={160} priority sizes="200px" className="h-14 w-auto max-w-[220px] object-contain object-left" />;
}

// En pied : son nom et ses coordonnées
export function CoordonneesChambre({ profil }: { profil: Pick<ProfilChambre, "nom" | "adresse" | "telephone" | "email"> }) {
  return (
    <span className="flex flex-col gap-0.5">
      <b className="text-[13px] font-semibold text-muted">{profil.nom}</b>
      {[profil.adresse, profil.telephone, profil.email].filter(Boolean).map((x) => (
        <span key={x} className="break-words">{x}</span>
      ))}
    </span>
  );
}
