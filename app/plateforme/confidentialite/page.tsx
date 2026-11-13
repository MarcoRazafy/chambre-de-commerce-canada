import type { Metadata } from "next";
import Link from "next/link";
import { PageTexte } from "@/components/plateforme/site/blocs";
import { identitePlateforme } from "@/lib/identite-plateforme";

// Lu à chaque visite : l'identité de la plateforme (Paramètres GM) changent sans redéploiement (et la base n'est pas joignable à la construction)
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { absolute: "Confidentialité · L’Alliée Virtuelle" } };

// Politique de confidentialité : ce que la plateforme traite, pourquoi, combien de temps, avec qui
export default async function Confidentialite() {
  const p = await identitePlateforme();
  const contact = p.courriel ? ` à ${p.courriel}` : "";

  return (
    <PageTexte titre="Politique de confidentialité" intro="Ce que la plateforme enregistre, pourquoi, combien de temps, et vos droits." maj="13 novembre 2026">
      <h2>Qui est responsable</h2>
      <p>
        {p.nom} est responsable des données des comptes de la plateforme (équipes des Chambres, comptes d’administration). Chaque Chambre est responsable des données qu’elle saisit sur ses membres dans son espace : la plateforme les traite pour son compte.
      </p>

      <h2>Les données traitées</h2>
      <ul>
        <li>Comptes : nom, adresse e-mail, fonction, mot de passe (enregistré sous forme hachée, jamais en clair), dates de connexion.</li>
        <li>Chambres : nom, adresse de l’espace, coordonnées, logo, réglages, factures de l’abonnement.</li>
        <li>Membres des Chambres : fiches des entreprises, contacts, adhésions, cotisations et factures, inscriptions aux événements, messages, saisis par la Chambre ou par les membres eux-mêmes.</li>
        <li>Paiements par carte : traités par Stripe. La plateforme ne conserve jamais de numéro de carte, seulement la marque, les quatre derniers chiffres et la date d’expiration, pour l’affichage.</li>
        <li>Courriels : adresse du destinataire, sujet et état de remise des messages envoyés par la plateforme.</li>
        <li>Journaux techniques : adresse IP et horodatage des connexions et des actions sensibles, pour la sécurité.</li>
      </ul>

      <h2>Pourquoi</h2>
      <ul>
        <li>Fournir le service : ouvrir et faire fonctionner l’espace de chaque Chambre et celui de ses membres.</li>
        <li>Facturer l’abonnement et encaisser les cotisations par carte.</li>
        <li>Envoyer les courriels nécessaires : confirmations, factures, relances, lettres d’information décidées par la Chambre.</li>
        <li>Assurer la sécurité : limiter les tentatives de connexion, tracer les actions d’administration.</li>
      </ul>
      <p>Ces traitements reposent sur l’exécution du contrat qui nous lie à la Chambre, et sur notre intérêt légitime à sécuriser la plateforme.</p>

      <h2>Combien de temps</h2>
      <p>
        Les données d’un compte sont gardées tant que le compte existe. Les factures et les écritures de paiement sont conservées le temps imposé par les obligations comptables et fiscales. Les journaux techniques sont effacés au bout de douze mois au plus.
      </p>

      <h2>Avec qui</h2>
      <ul>
        <li>Stripe, pour les paiements par carte, selon ses propres conditions.</li>
        <li>Notre fournisseur d’envoi de courriels, pour la remise des messages.</li>
        <li>{p.hebergeur ? `Notre hébergeur : ${p.hebergeur}.` : "Notre hébergeur, pour le stockage et l’exploitation de la plateforme."}</li>
      </ul>
      <p>Aucune donnée n’est vendue ni transmise à des fins publicitaires.</p>

      <h2>Séparation des espaces</h2>
      <p>
        Chaque Chambre a son espace : ses membres, ses paiements et ses fichiers ne sont visibles que d’elle. L’équipe de la plateforme n’entre dans un espace que si la Chambre l’y autorise, pour la durée qu’elle choisit, et chaque entrée est notée dans l’historique de la Chambre.
      </p>

      <h2>Cookies</h2>
      <p>
        Le site et les espaces n’utilisent que des cookies nécessaires au fonctionnement : la session de connexion, et le cas échéant l’autorisation d’une visite du support. Aucun cookie publicitaire, aucune mesure d’audience tierce.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez accéder à vos données, les corriger, les faire effacer ou en demander une copie. Les membres d’une Chambre s’adressent d’abord à leur Chambre, qui gère leur fiche. Pour un compte de la plateforme, écrivez-nous depuis la <Link href="/contact">page Contact</Link>{contact}.
      </p>

      <h2>Sécurité</h2>
      <p>
        Les échanges sont chiffrés (HTTPS), les mots de passe sont hachés, les tentatives de connexion sont limitées et les actions d’administration sont journalisées.
      </p>
    </PageTexte>
  );
}
