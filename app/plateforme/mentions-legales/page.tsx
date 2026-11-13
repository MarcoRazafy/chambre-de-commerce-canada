import type { Metadata } from "next";
import Link from "next/link";
import { PageTexte } from "@/components/plateforme/site/blocs";
import { identitePlateforme, numerosPlateforme } from "@/lib/identite-plateforme";

// Lu à chaque visite : l'identité de la plateforme (Paramètres GM) changent sans redéploiement (et la base n'est pas joignable à la construction)
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { absolute: "Mentions légales · L’Alliée Virtuelle" } };

// Mentions légales du site : l'éditeur vient des Paramètres de l'Admin GM (Plateforme)
export default async function MentionsLegales() {
  const p = await identitePlateforme();
  const numeros = numerosPlateforme(p);
  const editeur = p.raisonSociale && p.raisonSociale !== p.nom ? `${p.nom} (${p.raisonSociale})` : p.nom;

  return (
    <PageTexte titre="Mentions légales" maj="13 novembre 2026">
      <h2>Éditeur du site</h2>
      <p>
        Ce site et la plateforme L’Alliée Virtuelle sont édités par {editeur}.
        {p.adresse ? ` Adresse : ${p.adresse.replace(/\n/g, ", ")}.` : ""}
        {p.courriel ? ` Courriel : ${p.courriel}.` : ""}
        {p.telephone ? ` Téléphone : ${p.telephone}.` : ""}
      </p>
      {numeros.length ? <p>{numeros.join(" · ")}</p> : null}
      {p.hebergeur ? (
        <>
          <h2>Hébergement</h2>
          <p>{p.hebergeur}</p>
        </>
      ) : null}

      <h2>Objet</h2>
      <p>
        L’Alliée Virtuelle est un espace de gestion pour les Chambres de commerce et les associations d’affaires : adhésions, cotisations, événements, communication, avec un espace pour leurs membres. Chaque Chambre dispose de son propre espace, à sa propre adresse.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        La plateforme, sa structure, ses textes et ses éléments graphiques appartiennent à l’éditeur. Les contenus saisis par une Chambre (son nom, son logo, ses documents, les fiches de ses membres) restent la propriété de cette Chambre ou de ses membres.
      </p>

      <h2>Responsabilité</h2>
      <p>
        L’éditeur met tout en œuvre pour que la plateforme soit disponible et exacte, sans pouvoir garantir l’absence d’interruption. Chaque Chambre est responsable des contenus qu’elle publie dans son espace et des données qu’elle y saisit sur ses membres.
      </p>

      <h2>Données personnelles et cookies</h2>
      <p>
        Le traitement des données est décrit dans la <Link href="/confidentialite">politique de confidentialité</Link>. Le site n’utilise que des cookies nécessaires au fonctionnement (session de connexion), sans suivi publicitaire.
      </p>

      <h2>Nous écrire</h2>
      <p>
        Pour toute question sur le site, utilisez la <Link href="/contact">page Contact</Link>
        {p.courriel ? <> ou écrivez à {p.courriel}</> : null}.
      </p>
    </PageTexte>
  );
}
