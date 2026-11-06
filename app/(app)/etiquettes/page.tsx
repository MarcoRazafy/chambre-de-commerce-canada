import { EtiquettesOnglet } from '@/components/PagesGroupees';

// Étiquettes posées sur les membres et les abonnés, pour choisir les destinataires d'une lettre
export default function EtiquettesPage() {
  return (
    <>
      <div className="head og-head"><div><h1>Étiquettes</h1><p className="muted">Classez membres et abonnés pour les retrouver et leur écrire en un clic.</p></div></div>
      <EtiquettesOnglet />
    </>
  );
}
