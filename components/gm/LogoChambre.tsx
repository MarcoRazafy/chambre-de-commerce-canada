import Image from "next/image";

// Le logo d'une Chambre (réglé dans « Mon entreprise »), comme celui des entreprises membres dans le back-office ;
// sans logo : ses initiales, dans un cadre de même taille (les listes restent alignées). Le nom est toujours affiché
// à côté : l'image est décorative
export function LogoChambre({ nom, logo, taille = 40 }: { nom: string; logo: string | null; taille?: number }) {
  const largeur = Math.round(taille * 1.6);
  if (logo) {
    return (
      <span
        aria-hidden
        className="rounded-[var(--radius-s)] bg-white border border-line flex items-center justify-center shrink-0 px-1.5 py-1"
        style={{ width: largeur, height: taille }}
      >
        <Image src={logo} alt="" width={largeur} height={taille} sizes={`${largeur}px`} className="w-full h-full object-contain" />
      </span>
    );
  }
  const initiales = nom.split(/\s+/).filter(Boolean).map((m) => m[0]).slice(0, 2).join("").toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className="rounded-[var(--radius-s)] bg-navy-soft text-navy border border-line font-bold flex items-center justify-center shrink-0"
      style={{ width: largeur, height: taille, fontSize: Math.round(taille * 0.33) }}
    >
      {initiales}
    </span>
  );
}
