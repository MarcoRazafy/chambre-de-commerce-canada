import { redirect } from 'next/navigation';

// L'agenda est devenu un onglet de « Agenda & rendez-vous »
export default function AgendaPage() {
  redirect('/rendez-vous?onglet=agenda');
}
