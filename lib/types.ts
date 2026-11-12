import type { Cadrage } from "@/lib/cadrage";
import type { Devise, Formule } from "@/lib/membership";

export type MemberStatus =
  "candidature" | "refusee" | "en_attente" | "a_jour" | "en_retard";

export type MemberType = "morale" | "physique";

export type Space = "public" | "membre" | "admin";

export type UserRole = "visiteur" | "membre" | "admin";

export type NiveauEquipe = "administrateur" | "manager";

export interface User {
  id: string;
  role: UserRole;
  niveauEquipe: NiveauEquipe | null;
  space: Space;
  memberId: string | null;
  nom: string;
  fonction: string;
  email: string;
  tel?: string;
  initiales: string;
  photo?: string | null;
  // Visite de l'Admin GM (mode développeur) : son nom ; sinon null
  visiteGM?: string | null;
}

export interface Produit {
  id?: string;
  label: string;
  type?: "produit" | "service";
  description?: string | null;
  prix?: string | null;
  photos: string[];
}

export interface Member {
  id: string;
  type: MemberType;
  nom: string;
  secteur: string;
  ville: string;
  statut: MemberStatus;
  // La formule d'adhésion de la Chambre choisie par le membre (titre, profil, montant, devise)
  formule: Formule | null;
  adhesion: string;
  retardDepuis: string | null;
  activite: string;
  desc: string;
  besoins?: string;
  interets?: string;
  produits: Produit[];
  statutJuridique?: string;
  pays?: string;
  siteweb?: string;
  motivation?: string;
  paiementNote?: string;
  cover?: string | null;
  cadrage?: Cadrage;
  photo?: string | null;
  logo?: string | null;
  video?: string | null;
  accueilEnCours?: boolean;
}

export type EventFormat = "Présentiel" | "Webinaire" | "Hybride";

export interface CanchamEvent {
  id: string;
  titre: string;
  date: string;
  lieu: string;
  format: EventFormat;
  cap: number;
  inscrits: number;
  payant: boolean;
  prix: number;
  public: boolean;
  prixPublic: number;
  desc: string;
  photo: string | null;
  debut?: string | null;
  fin?: string | null;
  pourQui?: string | null;
  programme?: EtapeProgramme[];
  intervenants?: Intervenant[];
}

export interface EtapeProgramme {
  heure: string;
  titre: string;
  detail?: string | null;
}

export interface Intervenant {
  nom: string;
  fonction: string | null;
  entreprise: string | null;
  bio: string | null;
  photo: string | null;
}

export type AttendeeStatus = "confirmé" | "présent" | "absent";

export interface Attendee {
  id: string;
  eventId: string;
  nom: string;
  entreprise: string;
  email: string;
  statut: AttendeeStatus;
  code: string;
}

export type NewsCategory =
  "Programmation" | "Événement passé" | "Vie de la chambre" | "Formation";

export interface NewsMedia {
  type: "image" | "video";
  theme: "navy" | "green";
  duration?: string;
}

export interface Comment {
  id: string;
  auteur: string;
  entreprise: string;
  texte: string;
  date: string;
  moi: boolean;
  modifie: boolean;
  jaimes: number;
  jaimeParMoi: boolean;
}

export type CommentaireFixture = Pick<
  Comment,
  "id" | "auteur" | "entreprise" | "texte" | "date"
>;

export interface NoteMembre {
  id: string;
  texte: string;
  auteur: string;
  date: string;
  moi: boolean;
}

export interface NewsItem {
  id: string;
  titre: string;
  date: string;
  cat: NewsCategory;
  media: NewsMedia;
  extrait: string;
  corps: string;
  images: string[];
  public: boolean;
  auteur?: {
    membreId: string;
    membre: string;
    logo: string | null;
    personne: string | null;
  } | null;
  libre?: boolean;
  commentaires: Comment[];
  jaimes: number;
  jaimeParMoi: boolean;
}

export interface Offer {
  id: string;
  membreId: string | null;
  membre: string;
  titre: string;
  desc: string;
  image?: string | null;
  cover?: string | null;
  cadrage?: Cadrage;
  lien?: string | null;
  prix?: string | null;
  emplacement?: import("@/lib/offres").EmplacementOffre;
  membreSecteur?: string;
  membreVille?: string;
  membreLogo?: string | null;
  membreSite?: string | null;
  contact?: {
    nom: string;
    fonction: string;
    email: string;
    tel: string | null;
  } | null;
}

export interface CanchamService {
  id: string;
  titre: string;
  desc: string;
  type: "gratuit" | "payant";
  prix: number;
  icon: string;
  image: string | null;
  lien?: string | null;
}

export type ResourceCategory = "Guide" | "Modèle" | "Formation" | "Rapport";

export interface Resource {
  id: string;
  titre: string;
  cat: ResourceCategory;
  fmt: "PDF" | "DOCX" | "Vidéo" | "Photo" | "Page";
  taille: string;
  date: string;
  type: "gratuit" | "payant";
  prix: number;
  description?: string | null;
  commentaires: Comment[];
  cover?: string | null;
  dossierId?: string | null;
  pret?: boolean;
  accessible?: boolean;
  terminee?: boolean;
}

export interface AuteurDossier {
  nom: string;
  role: string | null;
  bio: string | null;
  photo: string | null;
}

export interface DossierRessource {
  id: string;
  nom: string;
  parentId: string | null;
  dossiers: number;
  ressources: number;
  cover: string | null;
  auteur: AuteurDossier | null;
  restreint: boolean;
  acces: string[];
}

export interface SectionDossier {
  dossier: DossierRessource;
  ressources: Resource[];
  sections: SectionDossier[];
}

export interface MaillonDossier {
  id: string;
  nom: string;
}

export type InvoiceStatus = "payee" | "envoyee";

export interface Invoice {
  id: string;
  numero: string;
  date: string;
  objet: string;
  montant: number;
  devise: Devise;
  statut: InvoiceStatus;
  membreId: string | null;
  membre: string;
}

export interface Message {
  id: string;
  de: string;
  moi: boolean;
  equipe: boolean;
  texte: string;
  heure: string;
  envoyeLe: string;
  pieces: PieceJointe[];
  modifie: boolean;
  supprime: boolean;
  transfere: boolean;
}

export interface Personne {
  id: string;
  nom: string;
  fonction: string;
  entreprise: string;
  photo: string | null;
}

export interface MessageThread {
  id: string;
  type: "individuel" | "groupe";
  equipe: boolean;
  nom: string;
  sousTitre: string;
  init: string;
  avatar?: string | null;
  membre?: { id: string; nom: string; siteweb: string | null } | null;
  contact?: {
    id: string;
    nom: string;
    fonction: string;
    email: string;
    tel: string | null;
    photo: string | null;
  } | null;
  participants: Personne[];
  unread: number;
  messages: Message[];
}

export interface PieceJointe {
  id: string;
  nom: string;
  type: "image" | "video" | "pdf";
  taille: number;
}

export interface Registration {
  eventId: string;
  memberId: string;
  code: string;
  date: string;
  aValider?: boolean;
  representants?: { nom: string; code: string }[];
}

export interface Contact {
  id: string;
  nom: string;
  fonction: string;
  email: string;
  tel: string | null;
  photo: string | null;
  principal: boolean;
  invitationEnAttente: boolean;
}
