import Image from "next/image";

// Logo en tête de la barre latérale d'un espace (back-office, espace membre) : celui de la Chambre (Mon entreprise),
// posé tel quel sur la barre ; sans logo, le logo IMPACT 261 en blanc
// centre : plus grand et au milieu de la barre (back-office)
export function LogoEspace({ logo, nom, centre = false }: { logo: string | null; nom: string; centre?: boolean }) {
  if (!logo) {
    return (
      <Image
        src="/marque/logo-blanc.png"
        alt="IMPACT 261"
        width={1600}
        height={647}
        priority
        sizes="170px"
        className="w-[170px] max-w-full h-auto"
      />
    );
  }
  return <Image src={logo} alt={nom} width={400} height={160} priority sizes="200px" className={centre ? "block mx-auto h-28 w-auto max-w-full object-contain object-center" : "block h-14 w-auto max-w-[200px] object-contain object-left"} />;
}
