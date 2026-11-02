import Link from 'next/link';
import SettingsForm from '@/components/SettingsForm';

export default function FacturationPage() {
  return (
    <>
      <div className="head"><div><div className="eyebrow">Finances</div><h1>Réglages de <em>facturation</em></h1>
        <p className="muted">Ces informations apparaissent sur les factures envoyées aux membres.</p></div>
        <div className="actions"><Link className="btn" href="/formules">Formules d’adhésion</Link><Link className="btn" href="/secteurs">Secteurs d’activité</Link></div></div>
      <SettingsForm cle="org" />
      <SettingsForm cle="relances" />
    </>
  );
}
