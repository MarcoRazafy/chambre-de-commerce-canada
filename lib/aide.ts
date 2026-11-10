import { COORDONNEES } from "@/lib/coordonnees";
import {
  ORDRE_FORMULES,
  PHOTOS_PAR_PRODUIT,
  RETARD_BLOCAGE_JOURS,
  fmtCotisation,
  libelleFormule,
} from "@/lib/membership";

export interface Lien {
  href: string;
  libelle: string;
}

export interface Question {
  id: string;
  question: string;
  reponse: string;
  liens?: Lien[];
}

export interface Theme {
  id: string;
  titre: string;
  questions: Question[];
}

const grille = ORDRE_FORMULES.map(
  (f) => `· ${libelleFormule(f)} : ${fmtCotisation(f)} par an`,
).join("\n");

export const THEMES: Theme[] = [
  {
    id: "adhesion",
    titre: "Adhésion et cotisation",
    questions: [
      {
        id: "formules",
        question: "Quelles sont les formules d’adhésion et leurs tarifs ?",
        reponse: `La cotisation dépend de votre formule, choisie à l’inscription :\n\n${grille}\n\nVotre formule et son tarif sont indiqués dans « Cotisations & factures ».`,
        liens: [{ href: "/membre/cotisations", libelle: "Voir ma formule" }],
      },
      {
        id: "acces-restreint",
        question: "Pourquoi mon accès est-il restreint ?",
        reponse: `L’accès est restreint dans deux cas. Soit votre adhésion n’est pas encore active (candidature à valider ou cotisation à régler) : l’espace s’ouvre dès que le paiement est enregistré. Soit votre cotisation a plus de ${RETARD_BLOCAGE_JOURS} jours de retard.\n\nTant que le retard ne dépasse pas ${RETARD_BLOCAGE_JOURS} jours, tout reste accessible et un bandeau vous le signale. Au-delà, seules « Mon entreprise », « Cotisations & factures », ce centre d’aide et la page de contact restent ouvertes, le temps de régulariser.`,
        liens: [
          { href: "/membre/cotisations", libelle: "Mes cotisations" },
          { href: "/membre/contact", libelle: "Contacter l’équipe" },
        ],
      },
      {
        id: "payer",
        question: "Comment régler ma cotisation ?",
        reponse:
          "Le paiement en ligne n’est pas encore disponible. Vous réglez auprès de l’équipe CanCham, en espèces, par virement bancaire ou par chèque, et l’équipe enregistre le règlement.\n\nDès qu’il est enregistré, votre adhésion passe « À jour », l’accès complet s’ouvre et la facture apparaît dans « Cotisations & factures ».",
        liens: [{ href: "/membre/cotisations", libelle: "Mes factures" }],
      },
      {
        id: "certificat",
        question: "Où trouver mon certificat de membre ?",
        reponse:
          "Sur « Mon entreprise », bouton « Mon certificat ». Il est disponible dès que votre adhésion est validée, et s’imprime ou s’enregistre en PDF depuis votre navigateur.",
        liens: [{ href: "/membre/profil", libelle: "Mon entreprise" }],
      },
    ],
  },
  {
    id: "entreprise",
    titre: "Mon entreprise",
    questions: [
      {
        id: "ajouter-service",
        question: "Comment présenter un produit ou un service ?",
        reponse: `Sur « Mon entreprise », section « Produits & services », bouton « Ajouter un service ». Indiquez le titre, la nature (produit ou service), un prix indicatif, une description et jusqu’à ${PHOTOS_PAR_PRODUIT} photos.\n\nLa première photo sert de vignette. L’offre apparaît aussitôt sur votre fiche et dans l’annuaire ; un clic sur sa carte ouvre sa fiche de détail, où se trouvent aussi « Modifier » et « Retirer ».`,
        liens: [{ href: "/membre/profil", libelle: "Gérer mes services" }],
      },
      {
        id: "prix",
        question: "Dois-je indiquer un prix ?",
        reponse:
          "Non, le prix indicatif est facultatif et s’écrit en clair : « 25 000 Ar le flacon », « À partir de 300 $ », « Sur devis ». Pour un service chiffré au cas par cas, « Sur devis » est une réponse honnête.",
      },
      {
        id: "logo",
        question: "Comment changer mon logo ou ma photo de couverture ?",
        reponse:
          "Sur « Mon entreprise », bouton « Modifier ma fiche ». Un aperçu montre l’image en place ; choisissez-en une autre pour la remplacer, ou laissez le champ vide pour la garder.\n\nLes images sont redimensionnées automatiquement. Pour le logo, préférez un PNG sur fond transparent.",
        liens: [{ href: "/membre/profil", libelle: "Modifier ma fiche" }],
      },
      {
        id: "contacts",
        question:
          "Comment ajouter une personne à contacter dans mon entreprise ?",
        reponse:
          "Sur « Mon entreprise », section « Contacts », bouton « Ajouter un contact ». Le crayon d’une fiche permet de la modifier, portrait compris.\n\nLe contact principal est la personne que la chambre appelle en premier ; en désigner un nouveau retire ce rôle à l’ancien. Une entreprise garde toujours au moins un contact.",
        liens: [{ href: "/membre/profil", libelle: "Mes contacts" }],
      },
    ],
  },
  {
    id: "reseau",
    titre: "Annuaire et messagerie",
    questions: [
      {
        id: "ecrire-membre",
        question: "Comment écrire à un autre membre ?",
        reponse:
          "Ouvrez sa fiche dans l’annuaire et cliquez sur « Envoyer un message ». La conversation s’ouvre avec son contact principal ; si vous avez déjà échangé, vous retrouvez le fil existant.\n\nLes coordonnées de ses contacts figurent aussi sur sa fiche.",
        liens: [{ href: "/membre/annuaire", libelle: "Ouvrir l’annuaire" }],
      },
      {
        id: "trouver",
        question: "Comment trouver une entreprise ou un secteur ?",
        reponse:
          "La barre de recherche, en haut de chaque page, cherche dans les entreprises, les événements et les ressources. Dans l’annuaire, vous pouvez aussi filtrer par secteur.",
        liens: [{ href: "/membre/annuaire", libelle: "Annuaire" }],
      },
      {
        id: "reponse-equipe",
        question: "Où arrive la réponse de l’équipe CanCham ?",
        reponse:
          "Dans la bulle ronde qui flotte en bas de l’écran : elle ouvre la conversation avec l’équipe, sur n’importe quelle page, et la réponse y arrive sans recharger. Une pastille rouge signale un message non lu. Glissez la bulle où elle vous gêne le moins, elle garde sa place.\n\nC’est la même conversation que le fil « Équipe CanCham » de votre messagerie, où arrivent aussi les messages envoyés depuis la page de contact.",
        liens: [{ href: "/membre/messagerie", libelle: "Ma messagerie" }],
      },
    ],
  },
  {
    id: "evenements",
    titre: "Événements",
    questions: [
      {
        id: "inscription",
        question: "Comment m’inscrire à un événement ?",
        reponse:
          "Ouvrez l’événement depuis « Événements » et cliquez sur « S’inscrire ». La fiche indique les places restantes. Pour un événement payant, une facture est générée à l’inscription.\n\nVous pouvez annuler votre inscription depuis la même fiche.",
        liens: [
          { href: "/membre/evenements", libelle: "Événements" },
          // { href: "/membre/agenda", libelle: "Agenda" }, // Agenda retiré pour l'instant
        ],
      },
      // Agenda retiré pour l'instant : à décommenter pour le remettre
      // {
      //   id: "agenda",
      //   question: "À quoi sert l’agenda ?",
      //   reponse:
      //     "L’agenda s’ouvre depuis le menu, sous « Événements ». Il se consulte par mois, par semaine ou en liste.\n\nIl réunit les événements de la chambre — ceux où vous êtes inscrit en vert —, vos échéances et vos rappels personnels.\n\nLes échéances se calculent seules : le renouvellement de la cotisation au 31 janvier, et chaque facture à régler dans les 30 jours suivant son émission. Vos rappels ne sont visibles que par vous ; ceux du jour et du lendemain s’affichent aussi dans la cloche de notifications.",
      //   liens: [{ href: "/membre/agenda", libelle: "Ouvrir l’agenda" }],
      // },
      {
        id: "rendez-vous",
        question: "Comment prendre rendez-vous avec l’équipe ?",
        reponse:
          "Ouvrez « Rendez-vous » dans le menu, choisissez le type de rencontre, le jour puis l’heure : seuls les créneaux encore libres sont proposés. Une confirmation vous est envoyée par courriel.\n\nLes heures affichées sont celles de Madagascar (UTC+3), là où l’équipe reçoit.\n\nEn cas d’empêchement, annulez depuis la même page : le créneau se libère pour quelqu’un d’autre et l’équipe est prévenue.",
        liens: [
          { href: "/membre/rendez-vous", libelle: "Prendre rendez-vous" },
        ],
      },
      {
        id: "code",
        question: "Où retrouver mon code d’accueil ?",
        reponse:
          "Sur la fiche de l’événement, une fois inscrit. Présentez ce code à l’accueil le jour venu pour l’enregistrement.",
        liens: [{ href: "/membre/evenements", libelle: "Mes événements" }],
      },
    ],
  },
  {
    id: "ressources",
    titre: "Ressources",
    questions: [
      {
        id: "telecharger",
        question: "Pourquoi ne puis-je pas télécharger une ressource ?",
        reponse:
          "Les ressources sont réservées aux membres et se consultent dans la plateforme : « Lire » pour un document, « Regarder » pour une vidéo. Elles ne sont ni téléchargeables ni imprimables.\n\nChaque page est marquée à votre nom, pour que ces contenus restent entre membres.",
        liens: [{ href: "/membre/ressources", libelle: "Ressources" }],
      },
      {
        id: "payante",
        question: "Comment accéder à une ressource payante ?",
        reponse:
          "Le paiement en ligne n’est pas encore disponible. Pour obtenir une ressource payante, écrivez à l’équipe en précisant son titre : elle vous indiquera comment la régler.",
        liens: [
          { href: "/membre/contact", libelle: "Écrire à l’équipe" },
          { href: "/membre/ressources", libelle: "Ressources" },
        ],
      },
    ],
  },
];

export const AIDE_CONTACT = {
  telephone: COORDONNEES.telephone,
  email: COORDONNEES.email,
};
