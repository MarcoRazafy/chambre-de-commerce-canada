import { redirect } from 'next/navigation';

// Les réglages de facturation sont maintenant l'onglet « Chambre & facturation » des Paramètres
export default function FacturationPage() {
  redirect('/parametres');
}
