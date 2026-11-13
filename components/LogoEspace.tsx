import Image from "next/image";

// Logo en tête de la barre latérale d'un espace (back-office, espace membre) : celui de la Chambre (Mon entreprise),
// sur une plaque blanche pour rester lisible sur la barre sombre quelles que soient ses couleurs ; sans logo, le logo
// IMPACT 261 en blanc
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
  return (
    <span className="inline-flex max-w-full items-center rounded-xl bg-white px-3 py-2 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.55)]">
      <Image src={logo} alt={nom} width={400} height={160} priority sizes="200px" className="block h-11 w-auto max-w-[200px] object-contain" />
    </span>
  );
}
