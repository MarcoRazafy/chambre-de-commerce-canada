import type { Member, Produit } from "../../lib/types";

const DETAILS: Record<
  string,
  Pick<Produit, "type" | "prix" | "description">
> = {
  "Ravintsara BIO": {
    type: "produit",
    prix: "5 $ le flacon de 10 ml · tarif export sur devis",
    description:
      "Huile essentielle de ravintsara (Cinnamomum camphora, feuilles), distillée à la vapeur d’eau à Toliara à partir de feuilles récoltées en cueillette raisonnée.\n\nCertifiée biologique, livrée avec son bulletin d’analyse chromatographique. Conditionnement en flacons de 10 ml pour la revente, ou en bidons de 1 à 25 kg pour les formulateurs.",
  },
  "Coffret découverte": {
    type: "produit",
    prix: "20 $ le coffret",
    description:
      "Cinq huiles essentielles emblématiques de Madagascar — ravintsara, niaouli, girofle, géranium et saro — en flacons de 5 ml, présentées dans un coffret en raphia tressé.\n\nConçu comme cadeau d’entreprise : personnalisation du coffret possible à partir de 50 unités, délai de trois semaines.",
  },
  "Girofle vapeur": {
    type: "produit",
    prix: "Sur devis, par lot de 25 kg",
    description:
      "Huile essentielle de clou de girofle distillée à la vapeur, riche en eugénol, destinée à l’industrie cosmétique, dentaire et aromatique.\n\nVendue en vrac par lots de 25 kg, avec fiche technique et certificat d’origine. Expédition depuis Toamasina.",
  },
  "Huile essentielle de niaouli": {
    type: "produit",
    prix: "5 $ le flacon de 10 ml",
    description:
      "Niaouli (Melaleuca quinquenervia) distillé à partir de feuilles fraîches, aux notes camphrées et fraîches.\n\nDisponible en flacons de 10 ml ou en vrac. Même traçabilité et même certification biologique que l’ensemble de la gamme.",
  },
  "Savons artisanaux aux huiles essentielles": {
    type: "produit",
    prix: "2 $ le savon · 13 $ le lot de six",
    description:
      "Savons saponifiés à froid, parfumés uniquement aux huiles essentielles de la maison — ravintsara, girofle et géranium.\n\nFabriqués par petites séries à Toliara, emballés sans plastique. Idéal pour les boutiques bio et les hôtels.",
  },
  "Panier raphia XL": {
    type: "produit",
    prix: "14 $ pièce · remise dès 20 pièces",
    description:
      "Grand panier tressé à la main en raphia naturel, 50 cm de diamètre, par les artisanes de la coopérative sur les Hautes Terres.\n\nFinitions teintes aux pigments végétaux sur demande. Commandes groupées pour boutiques et décorateurs, délai de quatre semaines.",
  },
  "Sculpture palissandre": {
    type: "produit",
    prix: "Sur devis, selon la pièce",
    description:
      "Pièces uniques sculptées en palissandre issu de bois de récupération certifié, par des sculpteurs d’Ambositra.\n\nChaque sculpture est livrée avec un certificat d’origine du bois, indispensable à l’exportation vers le Canada.",
  },
  "Textile lamba": {
    type: "produit",
    prix: "21 $ le lamba de deux mètres",
    description:
      "Lamba tissé à la main sur métier traditionnel, en coton et soie sauvage, aux motifs géométriques des Hautes Terres.\n\nUtilisé en étole, en nappe ou en tenture murale. Coloris et dimensions personnalisables pour les commandes de plus de dix pièces.",
  },
  "Circuit Andasibe 5j": {
    type: "service",
    prix: "439 $ par personne, base deux",
    description:
      "Cinq jours dans le parc national d’Andasibe-Mantadia : visites diurnes et nocturnes guidées, rencontre avec l’indri, randonnée en forêt primaire.\n\nHébergement en lodge, pension complète, transport depuis Antananarivo et guide francophone certifié inclus.",
  },
  "Séjour Nosy Be": {
    type: "service",
    prix: "À partir de 879 $ par personne, 7 nuits",
    description:
      "Une semaine à Nosy Be : excursions en bateau vers Nosy Komba et Nosy Tanikely, plongée avec masque et tuba, journée détente.\n\nVols intérieurs, transferts et hôtel en bord de mer compris. Formules pour groupes et séminaires d’entreprise sur demande.",
  },
  "Trek Isalo": {
    type: "service",
    prix: "297 $ par personne, trois jours",
    description:
      "Randonnée de trois jours dans les canyons du massif de l’Isalo, avec baignade dans les piscines naturelles et nuit en bivouac.\n\nGuide local, portage, repas et matériel de camping fournis. Niveau de difficulté modéré.",
  },
  "Poivre sauvage Voatsiperifery": {
    type: "produit",
    prix: "Sur devis, par lot de 5 kg",
    description:
      "Poivre sauvage cueilli à la main sur les lianes des forêts du Sud-Est, séché au soleil et trié grain par grain.\n\nArômes boisés et agrumes, très recherché par la gastronomie nord-américaine. Vendu en vrac ou en pots de 50 g étiquetés pour la revente.",
  },
  "Confiture litchi": {
    type: "produit",
    prix: "4 $ le pot de 350 g",
    description:
      "Confiture de litchis de la côte Est, cuite en petites quantités avec 55 % de fruits et du sucre de canne local.\n\nConditionnée en pots de verre, conservation de dix-huit mois. Étiquetage bilingue français-anglais disponible pour l’export.",
  },
  "Vanille gousses": {
    type: "produit",
    prix: "Cours du jour, sur devis",
    description:
      "Gousses de vanille Bourbon de la SAVA, catégorie noire gourmet, 16 à 18 cm, taux d’humidité contrôlé.\n\nVendues au kilo, conditionnées sous vide. Chaque lot est tracé jusqu’au planteur, conformément aux exigences des acheteurs canadiens.",
  },
  "Annotation IA": {
    type: "service",
    prix: "Sur devis, selon le volume",
    description:
      "Annotation et étiquetage de données pour l’entraînement de modèles d’intelligence artificielle : images, textes et audio, en français et en anglais.\n\nÉquipe formée et encadrée, double contrôle qualité, respect de la confidentialité des jeux de données.",
  },
  "Centre d’appel FR": {
    type: "service",
    prix: "Sur devis, à l’heure-agent",
    description:
      "Relation client externalisée en français : réception d’appels, support par courriel et clavardage, prise de rendez-vous.\n\nPlages horaires alignées sur les fuseaux canadiens, agents formés à votre produit, rapports d’activité hebdomadaires.",
  },
  "Développement sur mesure": {
    type: "service",
    prix: "Sur devis",
    description:
      "Conception et développement d’applications web et mobiles : sites vitrines, outils métiers, plateformes de réservation.\n\nMéthode agile, démonstrations toutes les deux semaines, maintenance et hébergement proposés après la mise en ligne.",
  },
  "Béryl brut": {
    type: "produit",
    prix: "Sur devis, au carat ou au lot",
    description:
      "Béryls bruts extraits de gisements artisanaux encadrés du centre du pays, triés par couleur et par pureté.\n\nChaque lot est accompagné de sa traçabilité et des documents d’exportation réglementaires.",
  },
  "Quartz industriel": {
    type: "produit",
    prix: "Sur devis, à la tonne",
    description:
      "Quartz de haute pureté destiné aux usages industriels — verrerie, électronique, fonderie.\n\nAnalyses de composition fournies. Enlèvement au port de Toamasina ou livraison selon incoterm convenu.",
  },
  "Grenat calibré": {
    type: "produit",
    prix: "Sur devis, selon le calibre",
    description:
      "Grenats taillés et calibrés en série, prêts pour la joaillerie, du 3 au 8 mm.\n\nTaille réalisée à Antananarivo, lots homogènes en couleur. Échantillons disponibles sur demande.",
  },
  "Montage export": {
    type: "service",
    prix: "Honoraires sur devis",
    description:
      "Structuration financière d’une première opération d’exportation : besoins de trésorerie, garanties, choix des moyens de paiement internationaux.\n\nPour PME malgaches qui visent le marché canadien. Accompagnement jusqu’au premier encaissement.",
  },
  "Ligne de crédit PME": {
    type: "service",
    prix: "Taux et plafond selon étude du dossier",
    description:
      "Financement de fonds de roulement pour les PME exportatrices : préfinancement de commandes, stocks saisonniers.\n\nÉtude du dossier sous quinze jours, remboursement adapté au cycle de l’activité.",
  },
  "Audit financier": {
    type: "service",
    prix: "À partir de 545 $",
    description:
      "Revue des comptes et du contrôle interne, préparation aux due diligences d’investisseurs ou de partenaires étrangers.\n\nRapport détaillé avec recommandations priorisées, restitution en présentiel.",
  },
  "Formation export": {
    type: "service",
    prix: "106 $ par participant, deux jours",
    description:
      "Deux jours pour préparer une démarche d’exportation vers le Canada : réglementation, normes, logistique, négociation.\n\nSessions mensuelles à Antananarivo, douze participants au plus, support et attestation remis.",
  },
  "Cours de français affaires": {
    type: "service",
    prix: "55 $ le module de vingt heures",
    description:
      "Français professionnel pour les échanges avec des partenaires québécois : courriels, réunions, présentations, négociation.\n\nGroupes de six personnes, en présentiel ou à distance, niveau évalué à l’entrée.",
  },
  "Atelier gestion de projet": {
    type: "service",
    prix: "76 $ par participant, une journée",
    description:
      "Une journée pratique pour planifier et piloter un projet : découpage, calendrier, budget, suivi des risques.\n\nExercices sur les projets réels des participants, outils gratuits présentés et remis.",
  },
  "Accompagnement export": {
    type: "service",
    prix: "Forfait diagnostic : 182 $",
    description:
      "Diagnostic de la capacité d’une entreprise à exporter vers le Canada, puis plan d’action chiffré sur douze mois.\n\nMise en relation avec les acteurs utiles au Québec et suivi des premières démarches.",
  },
  "Montage de partenariat": {
    type: "service",
    prix: "Sur devis",
    description:
      "Recherche, sélection et approche de partenaires canadiens — distributeurs, agents, investisseurs — puis accompagnement jusqu’à la signature.\n\nPréparation des rencontres, rédaction des documents de présentation et suivi de la négociation.",
  },
  "Coaching porteur de projet": {
    type: "service",
    prix: "36 $ la séance de deux heures",
    description:
      "Séances individuelles pour structurer un projet d’entreprise : modèle d’affaires, positionnement, premières ventes.\n\nEn présentiel à Antananarivo ou en visioconférence, cycle recommandé de six séances.",
  },
  "Fauteuil raphia": {
    type: "produit",
    prix: "97 $ pièce",
    description:
      "Fauteuil en rotin tressé de raphia, assise large et dossier enveloppant, fabriqué à la main dans notre atelier.\n\nCoussin en coton inclus. Fabrication à la commande, délai de cinq semaines.",
  },
  "Table basse palissandre": {
    type: "produit",
    prix: "Sur devis, fabrication à la commande",
    description:
      "Table basse en palissandre massif issu de bois de récupération certifié, finition huilée.\n\nDimensions sur mesure. Livrée avec certificat d’origine du bois pour l’exportation.",
  },
  "Luminaire fibres": {
    type: "produit",
    prix: "29 $ pièce",
    description:
      "Suspension tressée en fibres naturelles de raphia et de sisal, diffusant une lumière douce et chaleureuse.\n\nTrois diamètres disponibles. Compatible avec les normes électriques canadiennes sur demande.",
  },
};

const p = (label: string, ...photos: string[]): Produit => ({
  label,
  photos,
  ...DETAILS[label],
});

export const MEMBERS: Member[] = [
  {
    id: "m1",
    type: "morale",
    nom: "Bio Sud Essences",
    secteur: "Agribusiness",
    ville: "Toliara",
    siteweb: "https://www.biosudessences.mg",
    statut: "a_jour",
    formule: "mg_entreprise",
    pays: "Madagascar",
    motivation:
      "Trouver un distributeur bio au Québec et nous appuyer sur le réseau de la chambre pour sécuriser nos premières exportations vers le Canada.",
    adhesion: "2021-03-14",
    retardDepuis: null,
    activite: "Distillation et export d’huiles essentielles biologiques.",
    desc: "Distillation et export d’huiles essentielles biologiques (girofle, ravintsara, niaouli) vers l’Amérique du Nord et l’Europe.",
    besoins:
      "Recherche un distributeur bio établi au Québec pour ses huiles essentielles et cosmétiques naturels.",
    interets:
      "Partenariats avec des marques de cosmétique naturelle ou de bien-être canadiennes.",
    cover:
      "https://images.unsplash.com/photo-1556760544-74068565f05c?w=1200&q=80&auto=format&fit=crop",
    photo:
      "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&h=450&q=80&auto=format&fit=crop",
    logo: "/logos/m1-coeur-et-conscience.png",
    produits: [
      p(
        "Ravintsara BIO",
        "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&h=450&q=80&auto=format&fit=crop",
        "https://images.pexels.com/photos/7795817/pexels-photo-7795817.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/6915310/pexels-photo-6915310.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Coffret découverte",
        "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=600&h=450&q=80&auto=format&fit=crop",
        "https://images.pexels.com/photos/6621470/pexels-photo-6621470.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/10155373/pexels-photo-10155373.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Girofle vapeur",
        "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&h=450&q=80&auto=format&fit=crop",
        "https://images.pexels.com/photos/6087276/pexels-photo-6087276.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/8804297/pexels-photo-8804297.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Huile essentielle de niaouli",
        "https://images.pexels.com/photos/5682924/pexels-photo-5682924.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/6693878/pexels-photo-6693878.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Savons artisanaux aux huiles essentielles",
        "https://images.pexels.com/photos/7055158/pexels-photo-7055158.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/6930879/pexels-photo-6930879.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
    ],
  },
  {
    id: "m2",
    type: "morale",
    nom: "Highlands Artisanat",
    secteur: "Artisanat",
    ville: "Antananarivo",
    siteweb: "https://www.highlands-artisanat.mg",
    statut: "a_jour",
    formule: "mg_consultant",
    pays: "Madagascar",
    motivation:
      "Faire connaître le savoir-faire de nos artisans auprès d’acheteurs canadiens et participer aux salons où la chambre représente Madagascar.",
    adhesion: "2019-09-02",
    retardDepuis: null,
    activite: "Coopérative de tisserands et sculpteurs sur bois précieux.",
    desc: "Coopérative de tisserands et sculpteurs sur bois précieux, gamme premium pour le marché canadien.",
    cover:
      "https://images.unsplash.com/photo-1590751518505-1fc2d227ef9b?w=1200&q=80&auto=format&fit=crop",
    photo:
      "https://images.pexels.com/photos/29193598/pexels-photo-29193598.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop",
    logo: "/logos/m2-humanite-et-inclusion.png",
    produits: [
      p(
        "Panier raphia XL",
        "https://images.pexels.com/photos/6125620/pexels-photo-6125620.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/36319631/pexels-photo-36319631.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/29193598/pexels-photo-29193598.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop",
      ),
      p(
        "Sculpture palissandre",
        "https://images.pexels.com/photos/18758710/pexels-photo-18758710.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop",
        "https://images.pexels.com/photos/36590087/pexels-photo-36590087.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/37795822/pexels-photo-37795822.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Textile lamba",
        "https://images.pexels.com/photos/6634465/pexels-photo-6634465.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop",
        "https://images.pexels.com/photos/6634460/pexels-photo-6634460.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/6634692/pexels-photo-6634692.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
    ],
  },
  {
    id: "m3",
    type: "morale",
    nom: "Tsara Voyages",
    secteur: "Tourisme",
    ville: "Antananarivo",
    siteweb: "https://www.tsaravoyages.mg",
    statut: "a_jour",
    formule: "mg_entreprise",
    pays: "Madagascar",
    motivation:
      "Développer une clientèle canadienne francophone et nouer des partenariats avec des agences de voyages au Québec.",
    adhesion: "2022-06-20",
    retardDepuis: null,
    activite: "Agence réceptive spécialisée circuits nature et écotourisme.",
    desc: "Agence réceptive spécialisée circuits nature et écotourisme, partenaire d’opérateurs québécois.",
    besoins:
      "À la recherche d’un partenaire réceptif basé au Canada pour des offres croisées.",
    interets:
      "Collaboration avec des tour-opérateurs spécialisés en écotourisme et voyage responsable.",
    cover:
      "https://images.unsplash.com/photo-1749585071939-4cd62be90967?w=1200&h=800&q=80&auto=format&fit=crop",
    photo:
      "https://images.pexels.com/photos/18852638/pexels-photo-18852638.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop",
    logo: "/logos/m3-aqoci.png",
    produits: [
      p(
        "Circuit Andasibe 5j",
        "https://images.pexels.com/photos/18852638/pexels-photo-18852638.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop",
        "https://images.pexels.com/photos/31849008/pexels-photo-31849008.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/21935230/pexels-photo-21935230.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Séjour Nosy Be",
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=450&q=80&auto=format&fit=crop",
        "https://images.pexels.com/photos/188014/pexels-photo-188014.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/18558249/pexels-photo-18558249.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Trek Isalo",
        "https://images.unsplash.com/photo-1533240332313-0db49b459ad6?w=600&h=450&q=80&auto=format&fit=crop",
        "https://images.pexels.com/photos/29499913/pexels-photo-29499913.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/34776974/pexels-photo-34776974.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
    ],
  },
  {
    id: "m4",
    type: "morale",
    nom: "Sahanala Agro",
    secteur: "Agribusiness",
    ville: "Antsirabe",
    siteweb: "https://www.sahanala-agro.mg",
    statut: "en_attente",
    formule: "mg_entreprise",
    pays: "Madagascar",
    motivation:
      "Obtenir un accompagnement sur les normes d’importation canadiennes pour nos épices et nos confitures.",
    adhesion: "2020-01-11",
    retardDepuis: null,
    activite:
      "Transformation de fruits et épices pour la distribution spécialisée.",
    desc: "Transformation de fruits et épices, ligne de confitures et poivres pour la distribution spécialisée.",
    cover:
      "https://images.unsplash.com/photo-1682482198446-4cbf92f85a4b?w=1200&q=80&auto=format&fit=crop",
    photo:
      "https://images.pexels.com/photos/31717561/pexels-photo-31717561.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop",
    logo: "/logos/m4-developpement-et-paix.png",
    produits: [
      p(
        "Poivre sauvage Voatsiperifery",
        "https://images.pexels.com/photos/31717561/pexels-photo-31717561.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop",
        "https://images.pexels.com/photos/8559086/pexels-photo-8559086.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/33948998/pexels-photo-33948998.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Confiture litchi",
        "https://images.pexels.com/photos/9160297/pexels-photo-9160297.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop",
        "https://images.pexels.com/photos/7586251/pexels-photo-7586251.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/6588431/pexels-photo-6588431.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Vanille gousses",
        "https://images.pexels.com/photos/14381802/pexels-photo-14381802.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop",
        "https://images.pexels.com/photos/4963318/pexels-photo-4963318.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/14381803/pexels-photo-14381803.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
    ],
  },
  {
    id: "m5",
    type: "morale",
    nom: "MadaTech Solutions",
    secteur: "Digital",
    ville: "Antananarivo",
    siteweb: "https://www.madatech-solutions.mg",
    statut: "a_jour",
    formule: "mg_entreprise",
    pays: "Madagascar",
    motivation:
      "Rencontrer des entreprises canadiennes à la recherche d’un prestataire francophone fiable pour externaliser leurs services numériques.",
    adhesion: "2023-02-08",
    retardDepuis: null,
    activite: "Centre de services numériques francophone.",
    desc: "Centre de services numériques francophone : annotation de données, support client, développement logiciel.",
    besoins:
      "Cherche des clients canadiens pour des mandats d’annotation de données ou de développement logiciel.",
    interets:
      "Échanges avec d’autres membres du secteur technologie et centres de services partagés.",
    cover:
      "https://images.pexels.com/photos/7988116/pexels-photo-7988116.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop",
    photo:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=450&q=80&auto=format&fit=crop",
    logo: "/logos/m5-unicef.png",
    produits: [
      p(
        "Annotation IA",
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=450&q=80&auto=format&fit=crop",
        "https://images.pexels.com/photos/7947999/pexels-photo-7947999.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/5831661/pexels-photo-5831661.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Centre d’appel FR",
        "https://images.unsplash.com/photo-1560264280-88b68371db39?w=600&h=450&q=80&auto=format&fit=crop",
        "https://images.pexels.com/photos/7709231/pexels-photo-7709231.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/8681899/pexels-photo-8681899.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Développement sur mesure",
        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=450&q=80&auto=format&fit=crop",
        "https://images.pexels.com/photos/9553905/pexels-photo-9553905.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/3861959/pexels-photo-3861959.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
    ],
  },
  {
    id: "m6",
    type: "morale",
    nom: "Terres Rouges Mines",
    secteur: "Mines et ressources naturelles",
    ville: "Antananarivo",
    siteweb: "https://www.terresrouges.mg",
    statut: "a_jour",
    formule: "sur_mesure",
    pays: "Madagascar",
    motivation:
      "Soutenir la coopération économique entre les deux pays en tant que partenaire de la chambre, et rencontrer des acheteurs responsables.",
    adhesion: "2018-11-30",
    retardDepuis: null,
    activite: "Extraction et négoce de pierres fines et minéraux industriels.",
    desc: "Extraction et négoce de pierres fines et minéraux industriels, conformité ESG en cours de certification.",
    cover:
      "https://images.unsplash.com/photo-1627289601745-5813e24c9bc1?w=1200&q=80&auto=format&fit=crop",
    photo:
      "https://images.pexels.com/photos/6806371/pexels-photo-6806371.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop",
    logo: "/logos/m6-bnp-paribas.png",
    produits: [
      p(
        "Béryl brut",
        "https://images.pexels.com/photos/6806371/pexels-photo-6806371.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop",
        "https://images.pexels.com/photos/37999720/pexels-photo-37999720.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/34514255/pexels-photo-34514255.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Quartz industriel",
        "https://images.pexels.com/photos/4028957/pexels-photo-4028957.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop",
        "https://images.pexels.com/photos/3725709/pexels-photo-3725709.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/10545696/pexels-photo-10545696.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Grenat calibré",
        "https://images.pexels.com/photos/8581107/pexels-photo-8581107.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop",
        "https://images.pexels.com/photos/37964714/pexels-photo-37964714.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/34514246/pexels-photo-34514246.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
    ],
  },
  {
    id: "m7",
    type: "morale",
    nom: "Fandresena Finance",
    secteur: "Services financiers",
    ville: "Antananarivo",
    siteweb: "https://www.fandresena-finance.mg",
    statut: "a_jour",
    formule: "mg_entreprise",
    pays: "Madagascar",
    motivation:
      "Accompagner les PME membres dans leur financement à l’export et identifier des partenaires financiers canadiens.",
    adhesion: "2021-07-19",
    retardDepuis: null,
    activite: "Conseil en structuration financière et accompagnement export.",
    desc: "Conseil en structuration financière et accompagnement des PME malgaches à l’export.",
    cover:
      "https://images.unsplash.com/photo-1758518730384-be3d205838e8?w=1200&h=800&q=80&auto=format&fit=crop",
    photo:
      "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=600&h=450&q=80&auto=format&fit=crop",
    logo: "/logos/m7-desjardins.png",
    produits: [
      p(
        "Montage export",
        "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=600&h=450&q=80&auto=format&fit=crop",
        "https://images.pexels.com/photos/14020705/pexels-photo-14020705.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/31244440/pexels-photo-31244440.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Ligne de crédit PME",
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=450&q=80&auto=format&fit=crop",
        "https://images.pexels.com/photos/8962458/pexels-photo-8962458.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/5912590/pexels-photo-5912590.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Audit financier",
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=450&q=80&auto=format&fit=crop",
        "https://images.pexels.com/photos/6779567/pexels-photo-6779567.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/7821689/pexels-photo-7821689.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
    ],
  },
  {
    id: "m8",
    type: "morale",
    nom: "Institut Vola Formation",
    secteur: "Formation & accompagnement",
    ville: "Antananarivo",
    siteweb: "https://www.institutvola.mg",
    statut: "en_retard",
    formule: "mg_entreprise",
    pays: "Madagascar",
    motivation:
      "Proposer nos formations aux entreprises du réseau et bâtir des partenariats avec des établissements canadiens.",
    adhesion: "2020-05-05",
    retardDepuis: "2026-07-01",
    activite:
      "Organisme de formation continue en gestion et commerce international.",
    desc: "Organisme de formation continue en gestion, commerce international et langues, partenaire d’entreprises membres.",
    cover:
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&q=80&auto=format&fit=crop",
    photo:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=450&q=80&auto=format&fit=crop",
    logo: "/logos/m8-save-the-children.png",
    produits: [
      p(
        "Formation export",
        "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=450&q=80&auto=format&fit=crop",
        "https://images.pexels.com/photos/8761327/pexels-photo-8761327.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/8761323/pexels-photo-8761323.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Cours de français affaires",
        "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&h=450&q=80&auto=format&fit=crop",
        "https://images.pexels.com/photos/5427870/pexels-photo-5427870.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/6503100/pexels-photo-6503100.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Atelier gestion de projet",
        "https://images.unsplash.com/photo-1531538606174-0f90ff5dce83?w=600&h=450&q=80&auto=format&fit=crop",
        "https://images.pexels.com/photos/5990265/pexels-photo-5990265.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/6592364/pexels-photo-6592364.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
    ],
  },
  {
    id: "m9",
    type: "physique",
    nom: "Mialy Razanadrakoto",
    secteur: "Formation & accompagnement",
    ville: "Antananarivo",
    siteweb: "https://www.razanadrakoto-conseil.mg",
    statut: "a_jour",
    formule: "mg_consultant",
    pays: "Madagascar",
    motivation:
      "Élargir mon réseau de clients parmi les PME malgaches qui visent le marché canadien, et collaborer avec des consultants du Québec.",
    adhesion: "2024-03-01",
    retardDepuis: null,
    activite: "Consultante indépendante en accompagnement à l’export.",
    desc: "Consultante indépendante en accompagnement à l’export et montage de partenariats Canada-Madagascar, pour PME et porteurs de projet.",
    besoins:
      "Recherche des mandats ponctuels auprès de PME malgaches en démarche d’internationalisation.",
    interets:
      "Mise en réseau avec des consultants et cabinets-conseils canadiens actifs en Afrique.",
    cover:
      "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=1200&q=80&auto=format&fit=crop",
    photo:
      "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=400&q=80&auto=format&fit=crop&crop=faces",
    produits: [
      p(
        "Accompagnement export",
        "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=600&h=450&q=80&auto=format&fit=crop",
        "https://images.pexels.com/photos/5816300/pexels-photo-5816300.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/36765718/pexels-photo-36765718.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Montage de partenariat",
        "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&h=450&q=80&auto=format&fit=crop",
        "https://images.pexels.com/photos/8112186/pexels-photo-8112186.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/12903031/pexels-photo-12903031.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Coaching porteur de projet",
        "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=450&q=80&auto=format&fit=crop",
        "https://images.pexels.com/photos/9034992/pexels-photo-9034992.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/38748858/pexels-photo-38748858.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
    ],
  },
  {
    id: "m10",
    type: "morale",
    nom: "Zafy Design",
    secteur: "Autres services",
    ville: "Antananarivo",
    statut: "candidature",
    formule: "mg_entreprise",
    adhesion: "2026-09-05",
    retardDepuis: null,
    activite: "Studio de design mobilier en matériaux locaux.",
    desc: "Studio de design spécialisé dans le mobilier contemporain en raphia, bois et fibres locales, pour l’hôtellerie et la décoration haut de gamme.",
    besoins:
      "Cherche à identifier des acheteurs canadiens dans l’hôtellerie et la décoration d’intérieur.",
    interets:
      "Participation aux missions économiques et aux salons professionnels au Canada.",
    statutJuridique: "SARL",
    pays: "Madagascar",
    siteweb: "https://www.zafydesign.mg",
    motivation:
      "Nous souhaitons rejoindre CanCham pour accéder au réseau d’acheteurs canadiens et bénéficier de l’accompagnement à l’export. Notre production est prête pour l’exportation mais nous manquons de contacts qualifiés sur le marché nord-américain.",
    cover:
      "https://images.unsplash.com/photo-1597960194599-22929afc25b1?w=1200&q=80&auto=format&fit=crop",
    photo:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=450&q=80&auto=format&fit=crop",
    produits: [
      p(
        "Fauteuil raphia",
        "https://images.pexels.com/photos/5825409/pexels-photo-5825409.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/7737412/pexels-photo-7737412.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=450&q=80&auto=format&fit=crop",
      ),
      p(
        "Table basse palissandre",
        "https://images.pexels.com/photos/19370207/pexels-photo-19370207.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop",
        "https://images.pexels.com/photos/12277130/pexels-photo-12277130.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/14063637/pexels-photo-14063637.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
      ),
      p(
        "Luminaire fibres",
        "https://images.pexels.com/photos/3554241/pexels-photo-3554241.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.pexels.com/photos/6752283/pexels-photo-6752283.jpeg?auto=compress&cs=tinysrgb&w=900&h=675&fit=crop",
        "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=600&h=450&q=80&auto=format&fit=crop",
      ),
    ],
  },
];

export function findMember(id: string): Member | undefined {
  return MEMBERS.find((m) => m.id === id);
}
