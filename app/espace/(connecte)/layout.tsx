import EspaceShell from '@/components/espace/EspaceShell';

// Pages de l'espace membre (connecté) : accueil, entreprise, questionnaire
export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  return <EspaceShell>{children}</EspaceShell>;
}
