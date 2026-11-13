import Image from "next/image";

// Logo en tête de la barre latérale d'un espace (back-office, espace membre) : celui de la Chambre (Mon entreprise),
// posé tel quel sur la barre ; sans logo, le logo IMPACT 261 en blanc
export function LogoEspace({ logo, nom }: { logo: string | null; nom: string }) {
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
  return <Image src={logo} alt={nom} width={400} height={160} priority sizes="200px" className="block h-14 w-auto max-w-[200px] object-contain object-left" />;
}
