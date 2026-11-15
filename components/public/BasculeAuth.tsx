import Link from "next/link";

// Bascule « Connexion | Inscription » en tête des formulaires de l'espace membre
export function BasculeAuth({ actif, connexion, inscription }: { actif: "connexion" | "inscription"; connexion: string; inscription: string }) {
  const onglet = (cle: "connexion" | "inscription", href: string, libelle: string) => (
    <Link
      href={href}
      aria-current={actif === cle ? "page" : undefined}
      className={`flex-1 grid place-items-center min-h-[44px] rounded-full text-[15px] font-medium no-underline transition-colors ${
        actif === cle ? "bg-white text-marque-nuit font-semibold shadow-[0_4px_12px_-4px_rgba(15,29,44,0.25)]" : "text-muted hover:text-ink"
      }`}
    >
      {libelle}
    </Link>
  );
  return (
    <nav aria-label="Connexion ou inscription" className="mb-8 flex gap-1 rounded-full bg-surface-3 p-1">
      {onglet("connexion", connexion, "Connexion")}
      {onglet("inscription", inscription, "Inscription")}
    </nav>
  );
}
