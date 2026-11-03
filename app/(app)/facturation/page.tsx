import Link from 'next/link';
import SettingsForm from '@/components/SettingsForm';

export default function FacturationPage() {
  return (
    <>
      <div className="head page-tools">
        <div className="actions"><Link className="btn" href="/formules">Formules d’adhésion</Link><Link className="btn" href="/secteurs">Secteurs d’activité</Link></div></div>
      <SettingsForm cle="org" />
      <SettingsForm cle="relances" />
    </>
  );
}
