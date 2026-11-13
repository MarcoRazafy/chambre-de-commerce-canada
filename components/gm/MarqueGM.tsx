// Marque de la plateforme sur les pages de connexion de l'espace GM (l'espace n'appartient à aucune Chambre)
export function MarqueGM() {
  return (
    <div className="mb-7">
      <span className="block text-[22px] font-bold leading-tight text-ink">L’Alliée Virtuelle</span>
      <span aria-hidden className="block mt-2 h-1 w-14 rounded-full" style={{ background: "var(--marque-degrade)" }} />
    </div>
  );
}

export const PIED_GM = <>© {new Date().getFullYear()} L’Alliée Virtuelle</>;
