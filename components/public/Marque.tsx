import Image from "next/image";

const SIGLES = {
  couleur: { src: "/marque/sigle.png", width: 900, height: 636, teinte: "text-[#0b1b33]" },
  blanc: { src: "/marque/sigle-blanc.png", width: 600, height: 424, teinte: "text-white" },
} as const;

export function LogoOfficiel({
  className = "",
  priority = false,
  version = "couleur",
}: {
  className?: string;
  priority?: boolean;
  version?: keyof typeof SIGLES;
}) {
  const sigle = SIGLES[version];
  return (
    <span className={`inline-flex items-center gap-[0.55em] whitespace-nowrap ${sigle.teinte} ${className}`}>
      <Image
        src={sigle.src}
        alt=""
        width={sigle.width}
        height={sigle.height}
        priority={priority}
        className="h-[1.55em] w-auto"
        sizes="64px"
      />
      <span className="font-extrabold tracking-[-0.02em] leading-none">L’Alliée Virtuelle</span>
    </span>
  );
}

export function Sigle({
  className = "",
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Image
      src="/marque/sigle.png"
      alt=""
      aria-hidden="true"
      width={900}
      height={636}
      className={className}
      style={{ width: size, height: "auto" }}
    />
  );
}
