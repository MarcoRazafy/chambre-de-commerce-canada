import Link from 'next/link';
import FacturationSettings from '@/components/FacturationSettings';

export default function FacturationPage() {
  return (
    <>
      <div className="head og-head"><div><h1>Réglages de facturation</h1><p className="muted">Coordonnées de la chambre, taxes, modalités de paiement et relances automatiques.</p></div>
        <div className="actions"><Link className="btn" href="/formules">Formules d’adhésion</Link><Link className="btn" href="/secteurs">Secteurs d’activité</Link></div></div>
      <FacturationSettings />
    </>
  );
}
