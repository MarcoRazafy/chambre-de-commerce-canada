import Image from "next/image";

export function LogoEspace({ logo, nom, centre = false }: { logo: string | null; nom: string; centre?: boolean }) {
  if (!logo) {
    return (
      <Image
        src="/marque/logo-blanc.png"
        alt="L’Alliée Virtuelle"
        width={1000}
        height={871}
        priority
        sizes="120px"
        className={centre ? "block mx-auto h-24 w-auto" : "block h-20 w-auto"}
      />
    );
  }
  return <Image src={logo} alt={nom} width={400} height={160} priority sizes="200px" className={centre ? "block mx-auto h-28 w-auto max-w-full object-contain object-center" : "block h-14 w-auto max-w-[200px] object-contain object-left"} />;
}
