import Calendar from '@/components/Calendar';
import ResourcePage from '@/components/ResourcePage';

export default function AgendaPage() {
  return (
    <>
      <div className="head"><div><div className="eyebrow">Programme</div><h1><em>Agenda</em></h1>
        <p className="muted">Les événements, rendez-vous et rappels de l’équipe sur un même calendrier.</p></div></div>
      <Calendar />
      <ResourcePage table="agenda_rappels" bare />
    </>
  );
}
