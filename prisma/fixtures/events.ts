import type { CanchamEvent, Registration } from "../../lib/types";

export const EVENTS: CanchamEvent[] = [
  {
    id: "e1",
    titre: "5 à 7 Réseautage",
    date: "2026-09-22",
    lieu: "Antananarivo",
    format: "Présentiel",
    cap: 80,
    inscrits: 52,
    payant: false,
    prix: 0,
    public: true,
    prixPublic: 0,
    photo: "/photos/cancham-25.jpg",
    desc: "Le rendez-vous régulier du réseau, dans une formule courte que chacun peut caser en fin de journée. Pas de tribune, pas de présentation en trente diapositives : on vient échanger debout, un verre à la main, avec des dirigeants qu’on n’aurait pas croisés autrement.\n\nChaque édition s’ouvre sur un tour de table express — deux minutes par entreprise pour dire qui l’on est et ce que l’on cherche. Le reste de la soirée est libre. L’équipe de la chambre circule pour provoquer les mises en relation que vos fiches membres laissent deviner, et repart avec la liste de celles à suivre.",
    debut: "17:30",
    fin: "20:00",
    pourQui:
      "Tous les membres à jour de cotisation, avec la possibilité d’inviter un collaborateur de l’entreprise.",
    programme: [
      {
        heure: "17 h 30",
        titre: "Accueil et émargement",
        detail: "Badge nominatif et pointage à l’entrée.",
      },
      {
        heure: "18 h 00",
        titre: "Tour de table express",
        detail:
          "Deux minutes par entreprise : qui vous êtes, ce que vous cherchez.",
      },
      {
        heure: "18 h 45",
        titre: "Réseautage libre",
        detail: "Cocktail et mises en relation accompagnées par l’équipe.",
      },
      {
        heure: "19 h 45",
        titre: "Mot de clôture",
        detail: "Annonces et prochains rendez-vous du réseau.",
      },
    ],
  },
  {
    id: "e2",
    titre: "Lancement officiel — MECC 9ᵉ édition",
    date: "2026-10-01",
    lieu: "Antananarivo",
    format: "Présentiel",
    cap: 120,
    inscrits: 64,
    payant: false,
    prix: 0,
    public: true,
    prixPublic: 0,
    photo: "/photos/cancham-10.jpg",
    desc: "La 9ᵉ Mission Économique et Commerciale au Canada s’ouvre sur un volet Tourisme et Éducation. Cette matinée de lancement pose le cadre : calendrier, pays et villes visités, secteurs ciblés, conditions de participation et budget prévisionnel par entreprise.\n\nLes résultats de l’édition précédente sont présentés sans filtre — contrats signés, contacts restés lettre morte, ce qui a fonctionné et ce qu’il faut changer. Les entreprises retenues pour la MECC 8 viennent témoigner de leur préparation et des erreurs qu’elles ne referaient pas.\n\nÀ l’issue de la matinée, le dossier de candidature est remis en main propre et l’équipe reste disponible pour un premier examen de votre projet.",
    debut: "08:30",
    fin: "12:30",
    pourQui:
      "Entreprises candidates à la mission, partenaires institutionnels et membres souhaitant comprendre le dispositif avant de s’engager.",
    programme: [
      { heure: "08 h 30", titre: "Accueil café", detail: null },
      {
        heure: "09 h 00",
        titre: "Ouverture officielle",
        detail: "Mot de la présidence de la chambre et des partenaires.",
      },
      {
        heure: "09 h 30",
        titre: "Les objectifs de la MECC 9",
        detail:
          "Calendrier, villes, secteurs ciblés et conditions de participation.",
      },
      {
        heure: "10 h 30",
        titre: "Restitution de la MECC 8",
        detail:
          "Résultats chiffrés et retours d’expérience des entreprises participantes.",
      },
      { heure: "11 h 30", titre: "Questions de la salle", detail: null },
      {
        heure: "12 h 00",
        titre: "Remise des dossiers de candidature",
        detail: "Échanges individuels avec l’équipe.",
      },
    ],
  },
  {
    id: "e3",
    titre: "Canada Expo — Caravane de régionalisation",
    date: "2026-10-09",
    lieu: "Tamatave",
    format: "Présentiel",
    cap: 150,
    inscrits: 71,
    payant: false,
    prix: 0,
    public: true,
    prixPublic: 0,
    photo: "/photos/cancham-16.jpg",
    desc: "La caravane Canada Expo descend sur Tamatave pour une journée entière consacrée aux entreprises de la côte Est. L’objectif est simple : rendre accessible, hors de la capitale, ce que la chambre propose habituellement à Antananarivo.\n\nLa journée mêle un espace d’exposition ouvert au public, des ateliers courts sur l’accès au marché canadien — normes, logistique portuaire, financement de l’export — et des rendez-vous d’affaires individuels de vingt minutes, à réserver à l’inscription.\n\nLe port de Tamatave étant le principal point de sortie des marchandises malgaches, une session est spécifiquement dédiée aux contraintes de fret vers l’Amérique du Nord.",
    debut: "08:00",
    fin: "16:00",
    pourQui:
      "Entreprises de la côte Est, quel que soit leur statut d’adhésion. L’entrée est libre pour les non-membres.",
    programme: [
      {
        heure: "08 h 00",
        titre: "Ouverture de l’espace d’exposition",
        detail: null,
      },
      {
        heure: "09 h 00",
        titre: "Présentation des services de la chambre",
        detail: "Ce que l’adhésion ouvre concrètement.",
      },
      {
        heure: "10 h 00",
        titre: "Atelier — Normes et certifications canadiennes",
        detail: null,
      },
      {
        heure: "11 h 30",
        titre: "Atelier — Fret maritime vers l’Amérique du Nord",
        detail: "Contraintes portuaires, délais et coûts réels.",
      },
      {
        heure: "13 h 30",
        titre: "Rendez-vous d’affaires individuels",
        detail: "Créneaux de 20 minutes, à réserver à l’inscription.",
      },
      { heure: "15 h 30", titre: "Clôture et cocktail régional", detail: null },
    ],
  },
  {
    id: "e4",
    titre: "Atelier en ligne — Mobilité francophone",
    date: "2026-10-15",
    lieu: "En ligne",
    format: "Webinaire",
    cap: 200,
    inscrits: 96,
    payant: false,
    prix: 0,
    public: true,
    prixPublic: 0,
    photo: "/photos/cancham-13.jpg",
    desc: "Une séance pratique sur les programmes de mobilité francophone vers le Canada, animée avec nos partenaires institutionnels. Le format est volontairement resserré : deux heures, en ligne, sans déplacement.\n\nSont passés en revue les dispositifs réellement ouverts aux profils malgaches — Entrée express, Programme des travailleurs étrangers temporaires, permis d’études avec permis de travail post-diplôme — avec, pour chacun, les délais constatés, les pièces qui bloquent le plus souvent et le coût total à prévoir.\n\nLa dernière demi-heure est réservée aux questions de la salle. Le support et l’enregistrement sont adressés à tous les inscrits le lendemain.",
    debut: "14:00",
    fin: "16:00",
    pourQui:
      "Dirigeants et responsables RH, ainsi que les membres accompagnant des collaborateurs dans un projet de mobilité.",
    programme: [
      {
        heure: "14 h 00",
        titre: "Accueil et cadrage",
        detail: "Ce que la séance couvre, et ce qu’elle ne couvre pas.",
      },
      {
        heure: "14 h 15",
        titre: "Panorama des dispositifs de mobilité",
        detail: "Entrée express, TET, permis d’études : à qui s’adresse quoi.",
      },
      {
        heure: "15 h 00",
        titre: "Les dossiers qui échouent",
        detail: "Pièces manquantes, délais sous-estimés, erreurs fréquentes.",
      },
      { heure: "15 h 30", titre: "Questions de la salle", detail: null },
      {
        heure: "16 h 00",
        titre: "Envoi du support et de l’enregistrement",
        detail: "Adressés à tous les inscrits le lendemain.",
      },
    ],
  },
  {
    id: "e5",
    titre: "5 à 7 Réseautage",
    date: "2026-11-27",
    lieu: "Antananarivo",
    format: "Présentiel",
    cap: 80,
    inscrits: 18,
    payant: false,
    prix: 0,
    public: true,
    prixPublic: 0,
    photo: "/photos/cancham-02.jpg",
    desc: "Dernière édition de l’année pour le rendez-vous régulier du réseau. La formule ne change pas — une fin de journée, un verre, des dirigeants qui se parlent — mais l’édition de novembre ouvre traditionnellement sur un bilan des mises en relation de l’année.\n\nLes entreprises entrées dans le réseau au cours des douze derniers mois sont présentées à l’ensemble des membres. C’est l’occasion, pour les adhérents de longue date, de repérer les nouveaux venus avant tout le monde.",
    debut: "17:30",
    fin: "20:00",
    pourQui:
      "Tous les membres à jour de cotisation, avec la possibilité d’inviter un collaborateur de l’entreprise.",
    programme: [
      { heure: "17 h 30", titre: "Accueil et émargement", detail: null },
      {
        heure: "18 h 00",
        titre: "Présentation des nouveaux membres",
        detail: "Les entreprises entrées dans le réseau cette année.",
      },
      {
        heure: "18 h 30",
        titre: "Bilan des mises en relation de l’année",
        detail: null,
      },
      {
        heure: "19 h 00",
        titre: "Réseautage libre",
        detail: "Cocktail et échanges.",
      },
      { heure: "19 h 45", titre: "Mot de clôture", detail: null },
    ],
  },
  {
    id: "e6",
    titre: "Canada Expo — Caravane de régionalisation",
    date: "2026-12-03",
    lieu: "SAVA",
    format: "Présentiel",
    cap: 100,
    inscrits: 9,
    payant: false,
    prix: 0,
    public: true,
    prixPublic: 0,
    photo: "/photos/cancham-05.jpg",
    desc: "Étape de la caravane dans la région SAVA, axée sur la vanille et les épices — la filière qui pèse le plus lourd dans les exportations malgaches vers l’Amérique du Nord.\n\nLa journée s’adresse d’abord aux producteurs et aux collecteurs, souvent éloignés des dispositifs d’accompagnement concentrés dans la capitale. Elle traite de la traçabilité exigée par les acheteurs canadiens, de la certification biologique et équitable, et du financement de la campagne.\n\nUn temps est réservé aux échanges avec les importateurs canadiens de la filière, en visioconférence depuis Montréal.",
    debut: "08:00",
    fin: "15:30",
    pourQui:
      "Producteurs, collecteurs et exportateurs de la région SAVA, ainsi que les entreprises de la transformation agroalimentaire.",
    programme: [
      { heure: "08 h 00", titre: "Accueil des participants", detail: null },
      {
        heure: "09 h 00",
        titre: "La filière vanille vue du Canada",
        detail: "Attentes des acheteurs, prix, volumes.",
      },
      {
        heure: "10 h 30",
        titre: "Atelier — Traçabilité et certification",
        detail: "Bio, équitable : ce qui est exigé et ce que cela coûte.",
      },
      {
        heure: "13 h 00",
        titre: "Visioconférence avec des importateurs canadiens",
        detail: "Échanges directs depuis Montréal.",
      },
      {
        heure: "14 h 30",
        titre: "Rendez-vous individuels avec l’équipe de la chambre",
        detail: null,
      },
    ],
  },
  {
    id: "e7",
    titre: "Gala des 10 ans CanCham + Restitution MECC 8",
    date: "2026-07-27",
    lieu: "Antananarivo — Radisson Blu",
    format: "Présentiel",
    cap: 220,
    inscrits: 214,
    payant: true,
    prix: 45,
    public: true,
    prixPublic: 45,
    photo: "/photos/cancham-23.jpg",
    desc: "Dix ans que la chambre existe. La soirée célèbre l’anniversaire et referme, dans le même mouvement, le cycle de la 8ᵉ Mission Économique et Commerciale.\n\nLa première partie est une restitution : chiffres de la mission, contrats conclus, partenariats engagés, et ce qui reste à transformer. Les entreprises participantes prennent la parole à tour de rôle.\n\nLa seconde partie est un dîner de gala, avec remise des distinctions aux membres fondateurs et animation musicale. Le tarif couvre le dîner et les boissons ; il est réglable sur place ou par virement avant la date.",
    debut: "18:00",
    fin: "23:00",
    pourQui:
      "Membres, partenaires institutionnels et invités de la chambre. Tenue de ville souhaitée.",
    programme: [
      {
        heure: "18 h 00",
        titre: "Accueil des invités",
        detail: "Cocktail de bienvenue.",
      },
      {
        heure: "19 h 00",
        titre: "Restitution de la MECC 8",
        detail: "Chiffres, contrats conclus et retours des entreprises.",
      },
      { heure: "20 h 00", titre: "Dîner de gala", detail: null },
      {
        heure: "21 h 30",
        titre: "Remise des distinctions",
        detail: "Hommage aux membres fondateurs de la chambre.",
      },
      {
        heure: "22 h 00",
        titre: "Animation musicale et soirée libre",
        detail: null,
      },
    ],
  },
  {
    id: "e8",
    titre: "Canada Expo Antananarivo",
    date: "2026-06-30",
    lieu: "Antananarivo",
    format: "Présentiel",
    cap: 150,
    inscrits: 150,
    payant: false,
    prix: 0,
    public: true,
    prixPublic: 0,
    photo: "/photos/cancham-07.jpg",
    desc: "L’étape capitale de la caravane Canada Expo, et la plus fréquentée : une journée entière d’exposition, d’ateliers et de rendez-vous d’affaires au cœur d’Antananarivo.\n\nLes stands réunissent les membres de la chambre, les institutions canadiennes présentes à Madagascar et les opérateurs de l’accompagnement à l’export. Les ateliers se succèdent en continu sur deux salles, du cadre réglementaire au financement, et n’excèdent jamais quarante-cinq minutes.\n\nLes rendez-vous d’affaires individuels se réservent à l’inscription. Ils partent vite : l’édition précédente avait affiché complet dix jours avant la date.",
    debut: "08:00",
    fin: "17:00",
    pourQui:
      "Ouvert à toutes les entreprises, membres comme non-membres. L’entrée est libre.",
    programme: [
      { heure: "08 h 00", titre: "Ouverture des stands", detail: null },
      {
        heure: "09 h 00",
        titre: "Discours d’ouverture",
        detail: "Chambre de commerce et partenaires institutionnels.",
      },
      {
        heure: "09 h 30",
        titre: "Ateliers en continu — salle A",
        detail: "Réglementation, normes, douane.",
      },
      {
        heure: "09 h 30",
        titre: "Ateliers en continu — salle B",
        detail: "Financement, logistique, propriété intellectuelle.",
      },
      {
        heure: "13 h 00",
        titre: "Rendez-vous d’affaires individuels",
        detail: "Créneaux de 20 minutes, réservés à l’inscription.",
      },
      { heure: "16 h 00", titre: "Clôture et cocktail", detail: null },
    ],
  },
  {
    id: "e9",
    titre: "5 à 7 Réseautage",
    date: "2026-08-28",
    lieu: "Antananarivo",
    format: "Présentiel",
    cap: 80,
    inscrits: 74,
    payant: false,
    prix: 0,
    public: true,
    prixPublic: 0,
    photo: "/photos/cancham-24.jpg",
    desc: "Édition d’août du rendez-vous régulier du réseau. Une fin de journée pour se retrouver avant la rentrée, et pour rencontrer les entreprises entrées dans le réseau pendant l’été.\n\nLa formule reste la même : un tour de table express, puis du temps libre pour échanger. L’équipe de la chambre est présente pour orienter vers les interlocuteurs utiles.",
    debut: "17:30",
    fin: "20:00",
    pourQui:
      "Tous les membres à jour de cotisation, avec la possibilité d’inviter un collaborateur de l’entreprise.",
    programme: [
      { heure: "17 h 30", titre: "Accueil et émargement", detail: null },
      { heure: "18 h 00", titre: "Tour de table express", detail: null },
      {
        heure: "18 h 45",
        titre: "Réseautage libre",
        detail: "Cocktail et mises en relation.",
      },
      { heure: "19 h 45", titre: "Mot de clôture", detail: null },
    ],
  },
];

export function findEvent(id: string): CanchamEvent | undefined {
  return EVENTS.find((e) => e.id === id);
}

export const REGISTRATIONS: Registration[] = [
  { eventId: "e2", memberId: "m1", code: "CC-E2-4718", date: "2026-09-04" },
  { eventId: "e4", memberId: "m1", code: "CC-E4-2093", date: "2026-09-07" },
  { eventId: "e7", memberId: "m1", code: "CC-E7-8845", date: "2026-07-12" },
];

export function registrationFor(
  eventId: string,
  memberId: string | null,
): Registration | undefined {
  if (!memberId) return undefined;
  return REGISTRATIONS.find(
    (r) => r.eventId === eventId && r.memberId === memberId,
  );
}
