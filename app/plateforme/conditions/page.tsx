import type { Metadata } from "next";
import Link from "next/link";
import { PageTexte } from "@/components/plateforme/site/blocs";
import { identitePlateforme } from "@/lib/identite-plateforme";

// Lu à chaque visite : l'identité de la plateforme (Paramètres GM) changent sans redéploiement (et la base n'est pas joignable à la construction)
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { absolute: "Conditions d’utilisation · L’Alliée Virtuelle" } };

// Conditions d'utilisation de la plateforme par les Chambres
export default async function Conditions() {
  const p = await identitePlateforme();

  return (
    <PageTexte titre="Conditions d’utilisation" intro="Les règles entre une Chambre et la plateforme, en termes simples." maj="13 novembre 2026">
      <h2>1. Objet</h2>
      <p>
        {p.nom} met à disposition des Chambres de commerce et des associations d’affaires un espace de gestion en ligne, avec un espace pour leurs membres. En créant une Chambre, la personne qui s’inscrit accepte ces conditions au nom de la Chambre.
      </p>

      <h2>2. Compte et accès</h2>
      <ul>
        <li>Une adresse e-mail correspond à un seul compte. La personne qui crée la Chambre en devient le super admin et peut ouvrir des comptes à son équipe.</li>
        <li>Chaque personne garde son mot de passe confidentiel et prévient la plateforme en cas d’usage non autorisé.</li>
        <li>Un nom de Chambre ou un domaine trompeur peut être refusé.</li>
      </ul>

      <h2>3. Offres et prix</h2>
      <ul>
        <li>Les offres et leurs prix sont ceux affichés sur la page <Link href="/tarifs">Tarifs</Link> au moment du choix, en dollars canadiens, avant taxes. La TPS et la TVQ s’ajoutent sur la facture.</li>
        <li>Une offre payante est facturée chaque mois : le forfait, plus chaque compte d’équipe actif au-delà des comptes offerts. Les membres d’une Chambre ne sont jamais facturés.</li>
        <li>Avec l’offre à la carte, la Chambre choisit ses fonctions ; un changement s’applique à la facture suivante.</li>
        <li>Un changement de prix est annoncé à la Chambre au moins trente jours avant de s’appliquer.</li>
      </ul>

      <h2>4. Paiement et retard</h2>
      <ul>
        <li>Le paiement se fait par carte, sur la page sécurisée de Stripe. La carte enregistrée sert aux factures suivantes.</li>
        <li>Une facture impayée donne lieu à des relances par courriel. Passé le délai indiqué dans ces relances, l’espace passe en lecture seule ou est fermé, sauf la page de l’abonnement, jusqu’au paiement.</li>
      </ul>

      <h2>5. Cotisations des membres</h2>
      <p>
        Les cotisations payées par carte par les membres arrivent sur le compte Stripe de la Chambre. La plateforme peut prélever sur ces paiements la part indiquée dans l’offre ; la Chambre reste seule responsable de ses formules, de ses tarifs et de ses reçus envers ses membres.
      </p>

      <h2>6. Contenus et données</h2>
      <ul>
        <li>La Chambre est responsable des contenus publiés dans son espace et des données qu’elle saisit sur ses membres. Elle s’engage à avoir le droit de les traiter.</li>
        <li>Les contenus illicites, trompeurs ou portant atteinte à des tiers sont interdits.</li>
        <li>Les données de la Chambre lui appartiennent. Elle peut en demander une copie à tout moment.</li>
      </ul>

      <h2>7. Disponibilité et support</h2>
      <p>
        La plateforme est accessible en continu, hors maintenance annoncée et incidents. Le support répond depuis l’espace de la Chambre (Support IT). Il n’entre dans l’espace que si la Chambre l’autorise.
      </p>

      <h2>8. Suspension et fin</h2>
      <ul>
        <li>La Chambre peut cesser d’utiliser la plateforme à tout moment ; l’offre en cours reste due jusqu’à la fin du mois facturé.</li>
        <li>La plateforme peut suspendre un espace en cas de manquement grave à ces conditions ou de facture impayée au-delà du délai annoncé, après en avoir informé la Chambre.</li>
        <li>À la fin de la relation, la Chambre dispose de trente jours pour récupérer ses données ; elles sont ensuite effacées, sauf obligation légale de conservation.</li>
      </ul>

      <h2>9. Responsabilité</h2>
      <p>
        La plateforme est fournie avec le soin d’un professionnel, sans garantie d’absence d’erreur. Sa responsabilité, si elle est engagée, est limitée aux sommes payées par la Chambre au cours des douze derniers mois.
      </p>

      <h2>10. Évolution des conditions</h2>
      <p>
        Ces conditions peuvent évoluer. Les Chambres en sont informées par courriel au moins trente jours avant l’entrée en vigueur d’un changement important.
      </p>

      <h2>11. Droit applicable</h2>
      <p>
        Ces conditions sont régies par les lois applicables au Québec et au Canada. Avant tout recours, les parties cherchent une solution amiable, par écrit, depuis la <Link href="/contact">page Contact</Link>.
      </p>
    </PageTexte>
  );
}
