'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NAV, PIED } from '@/lib/resources';
import Icon from './Icon';

type Statut = 'Corrigé' | 'Adapté' | 'Amélioré';
// Les 18 constats de la maquette « Propositions UX », avec ce qui a été fait dans l'application
const DIAG: [prio: 1 | 2 | 3, sujet: string, constat: string, statut: Statut, fait: string, href: string][] = [
  [1, 'Bug', 'Les pages de détail (facture, événement) restaient sur « Chargement… » quand on les ouvrait par un lien direct, une notification ou après actualisation.', 'Corrigé', 'Les fiches s’ouvrent directement, par lien comme après actualisation.', '/paiements'],
  [1, 'Navigation', 'Le menu mélangeait 4 accordéons fermés et des liens seuls : 18 entrées, les pages du quotidien demandaient 2 clics.', 'Corrigé', 'Menu en sections titrées, sans accordéon : tout est à un clic.', '/'],
  [1, 'Navigation', 'Réglages éparpillés : Équipe en haut, Facturation dans Finances, Formules et Secteurs cachés dans la page Facturation, Abonnement seul en bas.', 'Corrigé', 'Paramètres à onglets ; l’équipe est gérée dans Abonnement & utilisateurs.', '/parametres'],
  [1, 'Clarté', 'La même fonction avait 3 noms : Maillage, Rapprochements, Mises en relation ; et une page « Mises en relation » vide.', 'Corrigé', 'Un seul nom, « Mises en relation », avec les onglets Suggestions et Envoyées.', '/mises-en-relation'],
  [2, 'Navigation', '3 accès à la messagerie (menu, bulle en haut, fenêtre flottante qui masquait les boutons en bas des pages).', 'Adapté', 'La fenêtre flottante est retirée ; la Messagerie reste dans le menu (à votre demande) et en icône en haut.', '/messagerie'],
  [2, 'Navigation', 'Doublons : Newsletter / Abonnés à la lettre, Règlements annoncés dans le menu et en bouton dans Paiements.', 'Adapté', 'Abonnés, Règlements, Types de rendez-vous et Services sont devenus des onglets ; Actualités reste dans le menu.', '/newsletter'],
  [2, 'Lisibilité', 'La fiche membre empilait 18 blocs sur ~3 200 px ; la suppression était au milieu de la page.', 'Corrigé', '4 onglets (Profil, Adhésion, Activité, Notes) ; la suppression est rangée dans « ⋯ ».', '/membres'],
  [2, 'Lisibilité', 'La liste des membres affichait 104 lignes d’un coup (~7 900 px), sans pagination ni actions groupées.', 'Corrigé', '25 membres par page, cases à cocher et étiquetage groupé.', '/membres'],
  [2, 'Tableau de bord', '8 cartes de chiffres avant toute action ; rien ne disait « quoi faire maintenant ».', 'Corrigé', '« À faire aujourd’hui » en tête de l’accueil, puis 4 chiffres clés.', '/'],
  [2, 'Menu replié', 'Icônes seules, sans info-bulle ni compteur : on ne savait pas où l’on cliquait.', 'Corrigé', 'Info-bulle au survol et pastille rouge quand il y a quelque chose à traiter.', '/'],
  [3, 'Libellés', 'Boutons génériques « + Ajouter » (Rendez-vous, Mises en relation) au lieu de dire ce qu’ils créent.', 'Corrigé', '« Nouveau rendez-vous », « Ajouter un service », « Nouvelle facture »…', '/rendez-vous?onglet=rdv'],
  [3, 'Libellés', '« Newsletter », « Lettre », « Lettre d’information » : trois mots pour la même chose.', 'Corrigé', 'Un seul mot partout : « newsletter ».', '/newsletter'],
  [3, 'États vides', '« Rien ici pour le moment » sans explication ni étape suivante.', 'Corrigé', 'Chaque page vide dit ce qu’elle contiendra et propose le bon bouton.', '/rendez-vous?onglet=rdv'],
  [3, 'Journal', '20 lignes sur 23 étaient des « Connexion » : le journal noyait les vraies actions.', 'Corrigé', 'Les connexions sont masquées par défaut (case pour les afficher).', '/parametres?onglet=journal'],
  [3, 'Équipe', 'Des comptes jamais connectés restaient facturés 15 $/mois chacun, sans alerte.', 'Corrigé', 'Alerte sur la page Abonnement, avec « Désactiver ce compte ».', '/abonnement'],
  [3, 'Marque', 'Le menu affichait « L’Alliée Virtuelle » et non la Chambre cliente.', 'Corrigé', 'Le menu affiche le nom de la Chambre, « propulsé par L’Alliée Virtuelle », avec son logo.', '/'],
  [3, 'Performance', 'Chaque page rechargeait la liste complète des membres et s’affichait voilée 2 à 3 s.', 'Amélioré', 'Le menu ne charge plus que les compteurs ; quelques pages chargent encore la liste des membres pour afficher les noms.', '/membres'],
  [3, 'Petit écran', 'Légère barre de défilement horizontale sur écran étroit.', 'Corrigé', 'Toutes les pages vérifiées à 390 px de large : plus de défilement horizontal.', '/'],
];
const AVANT = `Tableau de bord
Journal d’activité
Équipe & accès
Adhérents ▾
   Membres · Annuaire
Programme ▾
   Événements · Agenda
   Rendez-vous · Actualités
Ressources
Services CanCham
Communication ▾
   Messagerie · Newsletter
   Abonnés à la lettre
Finances ▾
   Paiements & factures
   Règlements annoncés
   Réglages de facturation
Abonnement & utilisateurs`;
// Le menu actuel de l'application, écrit de la même façon
const APRES = [
  ...NAV.filter(([g]) => g !== PIED).flatMap(([g, items]) => [...(g ? [g.toUpperCase()] : []), ...items.filter(i => !i.parent).map(i => (g ? '  ' : '') + i.label)]),
  '──────────────',
  ...NAV.filter(([g]) => g === PIED).flatMap(([, items]) => items.filter(i => !i.parent && !i.admin).map(i => i.label)),
].join('\n');
const CHIP: Record<Statut, string> = { 'Corrigé': 'ok', 'Adapté': 'info', 'Amélioré': 'warn' };

// Diagnostic complet (maquette) : les 18 constats de l'ancien back-office et ce qui a été fait. Réservé aux administrateurs.
export default function Diagnostic() {
  const router = useRouter();
  const [admin, setAdmin] = useState<boolean | null>(null);
  useEffect(() => { fetch('/api/auth/me').then(r => (r.ok ? r.json() : null)).then(m => setAdmin(m?.user?.role === 'Administrateur')).catch(() => setAdmin(false)); }, []);
  if (admin === null) return <div className="card"><div className="skeleton"><span /><span /><span /></div></div>;
  if (!admin) return <div className="card empty-state"><Icon name="lock" size={22} /><b>Page réservée aux administrateurs</b></div>;

  const parPrio = (p: number) => DIAG.filter(d => d[0] === p);
  const corriges = DIAG.filter(d => d[3] !== 'Amélioré').length;
  return (
    <>
      <div className="head og-head"><div><h1>Diagnostic complet</h1>
        <p className="muted">Les 18 constats relevés en parcourant chaque écran de l’ancien back-office, classés par priorité, et ce qui a été fait. Cliquez une ligne pour ouvrir la page concernée.</p></div>
        <div className="actions"><span className="pchip ok">✓ {corriges} sur {DIAG.length} traités</span></div></div>

      <div className="grid g3">
        {([[1, 'bloquant ou très gênant', 'red'], [2, 'ralentit le travail', 'amber'], [3, 'finition', 'blue']] as const).map(([p, d, c]) => (
          <div key={p} className="card kpi4 static"><span className="eyebrow">Priorité {p}</span>
            <span className={`kpi4-v num diag-${c}`}>{parPrio(p).length}</span>
            <span className="small muted">{d} · {parPrio(p).filter(x => x[3] !== 'Amélioré').length} traité{parPrio(p).length > 1 ? 's' : ''}</span></div>
        ))}
      </div>

      <section className="card">
        <h2>Le menu, avant et après</h2>
        <div className="diag-compare">
          <div><div className="eyebrow">Avant · 18 entrées, 4 accordéons</div><pre>{AVANT}</pre></div>
          <div><div className="eyebrow">Aujourd’hui · sections, aucun accordéon</div><pre>{APRES}{'\n\nEn haut : 🔍 Recherche (Ctrl K) · + Créer · 💬 Messagerie · 🔔'}</pre></div>
        </div>
      </section>

      <section className="card mtbl-card">
        <div className="tbl">
          <table className="mtbl diag-table">
            <thead><tr><th>#</th><th>Priorité</th><th>Sujet</th><th>Constat</th><th>Ce qui a été fait</th><th /></tr></thead>
            <tbody>
              {DIAG.map(([p, sujet, constat, statut, fait, href], i) => (
                <tr key={i} className="click" onClick={() => router.push(href)}>
                  <td className="muted num">{i + 1}</td>
                  <td><span className={`prio p${p}`}>P{p}</span></td>
                  <td><b className="small">{sujet}</b></td>
                  <td className="small">{constat}</td>
                  <td className="small"><span className={`pchip ${CHIP[statut]}`}>{statut === 'Corrigé' ? '✓ ' : ''}{statut}</span><span className="inv-sub">{fait}</span></td>
                  <td className="r"><Link href={href} aria-label={`Ouvrir la page : ${sujet}`} onClick={e => e.stopPropagation()}><Icon name="caret" size={16} /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
