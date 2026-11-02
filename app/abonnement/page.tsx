import ResourcePage from '@/components/ResourcePage';
import SettingsForm from '@/components/SettingsForm';

export default function AbonnementPage() {
  return (
    <>
      <div className="head"><div><div className="eyebrow">Réglages</div><h1>Abonnement & <em>utilisateurs</em></h1>
        <p className="muted">L’abonnement de la chambre à CanCham Connect et ses factures.</p></div></div>
      <SettingsForm cle="saas" />
      <ResourcePage table="platform_invoices" bare />
    </>
  );
}
