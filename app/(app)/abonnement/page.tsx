import ResourcePage from '@/components/ResourcePage';
import SettingsForm from '@/components/SettingsForm';
import AbonnementSummary from '@/components/AbonnementSummary';

export default function AbonnementPage() {
  return (
    <>
      <div className="head"><div><div className="eyebrow">Plateforme</div><h1>Abonnement & <em>utilisateurs</em></h1>
        <p className="muted">L’abonnement de la chambre à CanCham Connect et ses factures.</p></div></div>
      <AbonnementSummary />
      <SettingsForm cle="saas" />
      <ResourcePage table="platform_invoices" bare />
    </>
  );
}
