import Link from 'next/link';
import Icon from '@/components/Icon';

// Tous les réglages au même endroit (proposition de la maquette) : ils étaient éparpillés dans le menu
const REGLAGES: [href: string, icon: string, titre: string, detail: string][] = [
  ['/equipe', 'team', 'Équipe & accès', 'Comptes de l’équipe, rôles, invitations et accès au back-office.'],
  ['/facturation', 'gear', 'Réglages de facturation', 'Coordonnées de la chambre, taxes, modalités de paiement, relances automatiques.'],
  ['/formules', 'card', 'Formules d’adhésion', 'Les formules proposées aux membres et leur cotisation annuelle.'],
  ['/secteurs', 'tag', 'Secteurs d’activité', 'La liste des secteurs utilisée dans l’annuaire et pour cibler la newsletter.'],
  ['/journal', 'log', 'Journal d’activité', 'Qui a fait quoi, et quand : ajouts, modifications, envois.'],
  ['/abonnement', 'star', 'Abonnement & utilisateurs', 'L’abonnement à la plateforme et ses factures.'],
  ['/profil', 'user', 'Mon profil', 'Votre nom, votre photo, votre mot de passe.'],
];

export default function Parametres() {
  return (
    <>
      <div className="head"><div><h1>Paramètres</h1><p className="muted">Tous les réglages de la plateforme, au même endroit.</p></div></div>
      <div className="grid g3 set-grid">
        {REGLAGES.map(([href, icon, titre, detail]) => (
          <Link key={href} href={href} className="card set-card">
            <span className="tile-ic"><Icon name={icon} size={18} fill /></span>
            <div><h2>{titre}</h2><p className="small muted">{detail}</p></div>
            <Icon name="caret" size={16} />
          </Link>
        ))}
      </div>
    </>
  );
}
