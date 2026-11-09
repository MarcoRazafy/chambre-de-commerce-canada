import type { Space } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Autres adresses qui allument aussi cette entrée (ex. Rendez-vous sous « Agenda & rendez-vous ») */
  aussi?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// Menus construits comme ceux de la plateforme L'Alliée Virtuelle : Accueil, puis des rubriques
// (surtitre en couleur), et en pied les réglages et l'aide.
export const NAV_MEMBRE: NavGroup[] = [
  { label: "", items: [{ href: "/membre", label: "Accueil", icon: "home" }] },
  {
    label: "Mon entreprise",
    items: [
      { href: "/membre/profil", label: "Mon entreprise", icon: "building" },
      { href: "/membre/cotisations", label: "Cotisations & factures", icon: "card" },
    ],
  },
  {
    label: "Réseau",
    items: [
      { href: "/membre/annuaire", label: "Annuaire des membres", icon: "annuaire" },
      { href: "/membre/maillage", label: "Maillage", icon: "maillage" },
    ],
  },
  {
    label: "Activités",
    items: [
      { href: "/membre/evenements", label: "Événements", icon: "calendar" },
      {
        href: "/membre/agenda",
        label: "Agenda & rendez-vous",
        icon: "agenda",
        aussi: ["/membre/rendez-vous"],
      },
      { href: "/membre/actualites", label: "Actualités", icon: "news" },
      {
        href: "/membre/ressources",
        label: "Ressources & services",
        icon: "folder",
        aussi: ["/membre/offres-cancham"],
      },
    ],
  },
  {
    label: "Communication",
    items: [{ href: "/membre/messagerie", label: "Messagerie", icon: "chat" }],
  },
  {
    label: "Aide",
    items: [
      { href: "/membre/aide", label: "Besoin d’aide ?", icon: "help" },
      { href: "/membre/contact", label: "Contacter l’équipe", icon: "support" },
    ],
  },
];


export const NAV_ADMIN: NavGroup[] = [
  { label: "", items: [{ href: "/admin", label: "Accueil", icon: "home" }] },
  {
    label: "Membres",
    items: [
      { href: "/admin/membres", label: "Membres", icon: "users" },
      { href: "/admin/maillage", label: "Maillage", icon: "maillage" },
    ],
  },
  {
    label: "Activités",
    items: [
      { href: "/admin/evenements", label: "Événements", icon: "calendar" },
      { href: "/admin/agenda", label: "Agenda", icon: "agenda" },
      { href: "/admin/rendez-vous", label: "Rendez-vous", icon: "rendezvous" },
      { href: "/admin/actualites", label: "Actualités", icon: "news" },
      {
        href: "/admin/ressources",
        label: "Ressources & services",
        icon: "folder",
        aussi: ["/admin/offres-cancham"],
      },
    ],
  },
  {
    label: "Communication",
    items: [
      { href: "/admin/contacts", label: "Contacts", icon: "contacts" },
      { href: "/admin/messagerie", label: "Messagerie", icon: "chat" },
      { href: "/admin/newsletter", label: "Newsletter", icon: "newsletter" },
      { href: "/admin/etiquettes", label: "Tags", icon: "tag" },
    ],
  },
  {
    label: "Finances",
    items: [
      {
        href: "/admin/paiements",
        label: "Factures & paiements",
        icon: "card",
        aussi: ["/admin/reglements"],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/journal", label: "Journal d’activité", icon: "history" },
    ],
  },
  {
    label: "Plateforme",
    items: [
      { href: "/admin/abonnement", label: "Abonnement & utilisateurs", icon: "abonnement" },
    ],
  },
];



export function navFor(space: Space): NavGroup[] {
  return space === "admin" ? NAV_ADMIN : NAV_MEMBRE;
}

export const TITLES: Record<string, [string, string]> = {
  "/membre": ["Espace membre", "Vue d’ensemble"],
  "/membre/recherche": ["Espace membre", "Recherche"],
  "/membre/profil": ["Espace membre", "Mon entreprise"],
  "/membre/cotisations": ["Espace membre", "Cotisations & factures"],
  "/membre/offres-cancham": ["Espace membre", "Services CanCham"],
  "/membre/annuaire": ["Espace membre", "Annuaire"],
  "/membre/evenements": ["Espace membre", "Événements"],
  "/membre/agenda": ["Espace membre", "Agenda"],
  "/membre/rendez-vous": ["Espace membre", "Rendez-vous"],
  "/membre/actualites": ["Espace membre", "Actualités"],
  "/membre/messagerie": ["Espace membre", "Messagerie"],
  "/membre/ressources": ["Espace membre", "Ressources"],
  "/membre/contact": ["Espace membre", "Contacter l’équipe"],
  "/membre/aide": ["Espace membre", "Besoin d’aide ?"],
  "/admin": ["Back-office", "Tableau de bord"],
  "/admin/recherche": ["Back-office", "Recherche"],
  "/admin/journal": ["Back-office", "Journal d’activité"],
  "/admin/profil": ["Back-office", "Mon profil"],
  "/admin/membres": ["Back-office", "Membres"],
  "/admin/contacts": ["Back-office", "Contacts"],
  "/admin/maillage": ["Back-office", "Maillage"],
  "/admin/newsletter": ["Back-office", "Newsletter"],
  "/admin/newsletter/nouvelle": ["Back-office", "Nouvelle lettre"],
  "/admin/abonnement": ["Back-office", "Abonnement & utilisateurs"],
  "/admin/etiquettes": ["Back-office", "Tags"],
  "/admin/evenements": ["Back-office", "Événements"],
  "/admin/agenda": ["Back-office", "Agenda"],
  "/admin/rendez-vous": ["Back-office", "Rendez-vous"],
  "/admin/paiements": ["Back-office", "Paiements & factures"],
  "/admin/reglements": ["Back-office", "Règlements annoncés"],
  "/admin/reglements/coordonnees": ["Back-office", "Coordonnées de paiement"],
  "/membre/cotisations/payer": ["Espace membre", "Régler"],
  "/admin/offres-cancham": ["Back-office", "Services CanCham"],
  "/admin/messagerie": ["Back-office", "Messagerie"],
  "/admin/actualites": ["Back-office", "Actualités"],
  "/admin/ressources": ["Back-office", "Ressources"],
};

export function titrePour(
  chemin: string,
  defaut: [string, string],
): [string, string] {
  if (TITLES[chemin]) return TITLES[chemin];
  const cle = Object.keys(TITLES)
    .filter((k) => chemin.startsWith(`${k}/`))
    .sort((a, b) => b.length - a.length)[0];
  return cle ? TITLES[cle] : defaut;
}

// Fil d'Ariane de la barre du haut : l'espace (accueil), puis chaque niveau jusqu'à la page affichée.
// Les sous-pages sans titre propre (une fiche, « modifier »…) prennent un libellé générique.
export type Miette = { libelle: string; href: string | null };

const SOUS_PAGES: Record<string, string> = {
  modifier: "Modifier",
  nouvelle: "Nouvelle",
  nouveau: "Nouveau",
  apercu: "Aperçu",
  inscrits: "Inscrits",
  certificat: "Certificat",
  retour: "Retour du paiement",
};

const FICHES: Record<string, string> = {
  "/admin/membres": "Fiche du membre",
  "/admin/evenements": "Événement",
  "/admin/actualites": "Actualité",
  "/admin/ressources": "Ressource",
  "/admin/newsletter": "Lettre",
  "/admin/paiements": "Facture",
  "/admin/abonnement": "Factures",
  "/admin/abonnement/factures": "Facture",
  "/membre/annuaire": "Fiche",
  "/membre/evenements": "Événement",
  "/membre/actualites": "Actualité",
  "/membre/ressources": "Ressource",
  "/membre/cotisations": "Facture",
  "/membre/cotisations/payer": "Règlement",
};

// Pages dont le détail est dans l'adresse (« /admin/etiquettes?e=VIP ») : le paramètre donne le dernier niveau
const DETAIL_PAR_PARAMETRE: Record<string, string> = { "/admin/etiquettes": "e" };

export function filPour(chemin: string, racine: string, params?: URLSearchParams | null): Miette[] {
  const propre = chemin.replace(/\/+$/, "") || "/";
  const [espace, accueil] = TITLES[racine] ?? ["", ""];
  const fil: Miette[] = [{ libelle: espace, href: propre === racine ? null : racine }];
  if (propre === racine) return [...fil, { libelle: accueil, href: null }];

  // Le niveau connu le plus profond qui contient la page
  const connue = (c: string) => c !== racine && c.startsWith(`${racine}/`) && (propre === c || propre.startsWith(`${c}/`));
  const cles = Object.keys(TITLES).filter(connue).sort((a, b) => a.length - b.length);
  for (const cle of cles) fil.push({ libelle: TITLES[cle][1], href: cle });

  // La suite du chemin, au-delà du dernier niveau connu
  let base = cles.at(-1) ?? racine;
  for (const segment of propre.slice(base.length).split("/").filter(Boolean)) {
    const libelle = SOUS_PAGES[segment] ?? FICHES[base] ?? "Détail";
    base = `${base}/${segment}`;
    fil.push({ libelle, href: base });
  }
  const detail = DETAIL_PAR_PARAMETRE[propre] ? params?.get(DETAIL_PAR_PARAMETRE[propre])?.trim() : "";
  if (detail) fil.push({ libelle: detail, href: null });
  else fil[fil.length - 1] = { ...fil[fil.length - 1], href: null };
  return fil;
}
