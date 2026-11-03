import Calendar from '@/components/Calendar';
import ResourcePage from '@/components/ResourcePage';

export default function AgendaPage() {
  return (
    <>
      <Calendar />
      <ResourcePage table="agenda_rappels" bare />
    </>
  );
}
