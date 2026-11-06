import AbonnementSummary from '@/components/AbonnementSummary';

// Formule, utilisateurs facturés, prochaine facture, historique ; les réglages s'ouvrent depuis la bannière
export default function AbonnementPage() {
  return (
    <>
      <div className="head og-head"><div><h1>Abonnement & utilisateurs</h1><p className="muted">Votre formule L’Alliée Virtuelle et les personnes de l’équipe qui ont accès au back-office.</p></div></div>
      <AbonnementSummary />
    </>
  );
}
