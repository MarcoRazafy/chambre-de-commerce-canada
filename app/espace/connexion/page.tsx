import { redirect } from 'next/navigation';

// Une seule page de connexion pour tout le monde (équipe et membres) : /connexion
export default function ConnexionMembre() {
  redirect('/connexion');
}
