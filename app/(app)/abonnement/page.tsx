import ResourcePage from '@/components/ResourcePage';
import SettingsForm from '@/components/SettingsForm';
import AbonnementSummary from '@/components/AbonnementSummary';

export default function AbonnementPage() {
  return (
    <>
      <AbonnementSummary />
      <SettingsForm cle="saas" />
      <ResourcePage table="platform_invoices" bare />
    </>
  );
}
