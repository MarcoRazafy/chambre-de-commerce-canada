// Rechargé à chaque navigation : sert à jouer l'animation d'entrée de la page (voir .page-enter)
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
