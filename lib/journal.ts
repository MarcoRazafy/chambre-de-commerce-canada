export type FamilleJournal = "adhesion" | "finance" | "programme" | "contenu";

export interface ActionJournal {
  libelle: string;
  famille: FamilleJournal;
  ton: "ok" | "bad" | "info";
}

export const ACTIONS_JOURNAL: Record<string, ActionJournal> = {
  candidature_deposee: {
    libelle: "Demande d’adhésion déposée",
    famille: "adhesion",
    ton: "info",
  },
  candidature_approuvee: {
    libelle: "Demande approuvée",
    famille: "adhesion",
    ton: "ok",
  },
  candidature_refusee: {
    libelle: "Demande refusée",
    famille: "adhesion",
    ton: "bad",
  },
  membre_cree: { libelle: "Membre ajouté", famille: "adhesion", ton: "ok" },
  membre_supprime: {
    libelle: "Membre supprimé",
    famille: "adhesion",
    ton: "bad",
  },
  membre_renomme: {
    libelle: "Entreprise renommée",
    famille: "adhesion",
    ton: "info",
  },
  contact_ajoute: {
    libelle: "Contact ajouté",
    famille: "adhesion",
    ton: "info",
  },
  contact_retire: {
    libelle: "Contact retiré",
    famille: "adhesion",
    ton: "bad",
  },
  paiement_enregistre: {
    libelle: "Paiement enregistré",
    famille: "finance",
    ton: "ok",
  },
  facture_emise: {
    libelle: "Facture émise",
    famille: "finance",
    ton: "info",
  },
  facture_payee: {
    libelle: "Facture marquée payée",
    famille: "finance",
    ton: "ok",
  },
  reglement_confirme: {
    libelle: "Règlement confirmé",
    famille: "finance",
    ton: "ok",
  },
  reglement_refuse: {
    libelle: "Règlement écarté",
    famille: "finance",
    ton: "bad",
  },
  paiement_en_ligne: {
    libelle: "Paiement en ligne encaissé",
    famille: "finance",
    ton: "ok",
  },
  paiement_refuse: {
    libelle: "Paiement en ligne refusé",
    famille: "finance",
    ton: "bad",
  },
  lettre_envoyee: {
    libelle: "Newsletter envoyée",
    famille: "contenu",
    ton: "ok",
  },
  maillage_relance: {
    libelle: "Relance du questionnaire de maillage",
    famille: "adhesion",
    ton: "info",
  },
  maillage_complete: {
    libelle: "Questionnaire de maillage complété",
    famille: "adhesion",
    ton: "ok",
  },
  mise_en_relation: {
    libelle: "Mise en relation",
    famille: "adhesion",
    ton: "ok",
  },
  relance_envoyee: {
    libelle: "Relance de cotisation",
    famille: "finance",
    ton: "info",
  },
  acces_ouvert: {
    libelle: "Accès à une ressource ouvert",
    famille: "contenu",
    ton: "ok",
  },
  acces_retire: {
    libelle: "Accès à une ressource retiré",
    famille: "contenu",
    ton: "bad",
  },
  dossier_acces: {
    libelle: "Accès à un dossier réglé",
    famille: "contenu",
    ton: "info",
  },
  ressource_achetee: {
    libelle: "Demande d’achat de ressource",
    famille: "finance",
    ton: "info",
  },
  service_reserve: {
    libelle: "Demande de paiement d’un service",
    famille: "finance",
    ton: "info",
  },
  acces_active: {
    libelle: "Accès activé",
    famille: "adhesion",
    ton: "ok",
  },
  mot_de_passe_reinitialise: {
    libelle: "Mot de passe réinitialisé",
    famille: "adhesion",
    ton: "info",
  },
  equipe_ajoutee: {
    libelle: "Compte d’équipe créé",
    famille: "adhesion",
    ton: "ok",
  },
  mot_de_passe_modifie: {
    libelle: "Mot de passe modifié",
    famille: "adhesion",
    ton: "info",
  },
  admin_promu: {
    libelle: "Accès à l’équipe accordé",
    famille: "adhesion",
    ton: "ok",
  },
  admin_retire: {
    libelle: "Accès à l’équipe retiré",
    famille: "adhesion",
    ton: "bad",
  },
  niveau_equipe_modifie: {
    libelle: "Niveau d’accès modifié",
    famille: "adhesion",
    ton: "info",
  },
  inscription_publique: {
    libelle: "Inscription depuis la vitrine",
    famille: "programme",
    ton: "info",
  },
  abonne_infolettre: {
    libelle: "Inscription à la lettre d’information",
    famille: "programme",
    ton: "ok",
  },
  question_visiteur: {
    libelle: "Question depuis le site",
    famille: "programme",
    ton: "info",
  },
  rendezvous_pris: {
    libelle: "Rendez-vous réservé",
    famille: "programme",
    ton: "ok",
  },
  rendezvous_annule: {
    libelle: "Rendez-vous annulé",
    famille: "programme",
    ton: "bad",
  },
  rendezvous_reglages: {
    libelle: "Réglages des rendez-vous",
    famille: "programme",
    ton: "info",
  },
  inscription_validee: {
    libelle: "Inscription validée",
    famille: "programme",
    ton: "ok",
  },
  fiche_modifiee: {
    libelle: "Fiche modifiée par l’équipe",
    famille: "adhesion",
    ton: "info",
  },
  adhesion_modifiee: {
    libelle: "Date d’adhésion modifiée",
    famille: "adhesion",
    ton: "info",
  },
  formule_modifiee: {
    libelle: "Formule d’adhésion modifiée",
    famille: "adhesion",
    ton: "info",
  },
  reglement_modifie: {
    libelle: "Date de règlement corrigée",
    famille: "finance",
    ton: "info",
  },
  facture_supprimee: {
    libelle: "Facture supprimée",
    famille: "finance",
    ton: "bad",
  },
  compte_supprime: {
    libelle: "Compte supprimé par son titulaire",
    famille: "adhesion",
    ton: "bad",
  },
  acces_envoye: {
    libelle: "Accès envoyé",
    famille: "adhesion",
    ton: "info",
  },
  invitation_renvoyee: {
    libelle: "Invitation renvoyée",
    famille: "adhesion",
    ton: "info",
  },
  service_gratuit_reserve: {
    libelle: "Réservation d’un service gratuit",
    famille: "programme",
    ton: "info",
  },
  evenement_cree: {
    libelle: "Événement créé",
    famille: "programme",
    ton: "ok",
  },
  evenement_modifie: {
    libelle: "Événement modifié",
    famille: "programme",
    ton: "info",
  },
  evenement_supprime: {
    libelle: "Événement supprimé",
    famille: "programme",
    ton: "bad",
  },
  actualite_publiee: {
    libelle: "Actualité publiée",
    famille: "contenu",
    ton: "ok",
  },
  actualite_modifiee: {
    libelle: "Actualité modifiée",
    famille: "contenu",
    ton: "info",
  },
  actualite_supprimee: {
    libelle: "Actualité supprimée",
    famille: "contenu",
    ton: "bad",
  },
  commentaire_supprime: {
    libelle: "Commentaire retiré",
    famille: "contenu",
    ton: "bad",
  },
  ressource_ajoutee: {
    libelle: "Ressource ajoutée",
    famille: "contenu",
    ton: "ok",
  },
  ressource_modifiee: {
    libelle: "Ressource modifiée",
    famille: "contenu",
    ton: "info",
  },
  ressource_supprimee: {
    libelle: "Ressource supprimée",
    famille: "contenu",
    ton: "bad",
  },
  service_ajoute: {
    libelle: "Service CanCham ajouté",
    famille: "contenu",
    ton: "ok",
  },
  service_modifie: {
    libelle: "Service CanCham modifié",
    famille: "contenu",
    ton: "info",
  },
  service_supprime: {
    libelle: "Service CanCham retiré",
    famille: "contenu",
    ton: "bad",
  },
  seed: {
    libelle: "Chargement des données",
    famille: "contenu",
    ton: "info",
  },
};

export const FAMILLES_JOURNAL: Record<FamilleJournal, string> = {
  adhesion: "Adhésions",
  finance: "Paiements",
  programme: "Événements",
  contenu: "Contenus",
};

export function actionJournal(code: string): ActionJournal {
  return (
    ACTIONS_JOURNAL[code] ?? {
      libelle: code.replace(/_/g, " "),
      famille: "contenu",
      ton: "info",
    }
  );
}

export function codesDeFamille(famille: FamilleJournal): string[] {
  return Object.entries(ACTIONS_JOURNAL)
    .filter(([, a]) => a.famille === famille)
    .map(([code]) => code);
}

export function lienJournal(
  action: string,
  entite: string,
  entiteId: string,
): string | null {
  if (/supprime|refusee/.test(action)) return null;
  switch (entite) {
    case "Member":
      return `/admin/membres/${entiteId}`;
    case "Invoice":
      return `/admin/paiements?q=${encodeURIComponent(entiteId)}`;
    case "Event":
      return `/admin/evenements/${entiteId}`;
    case "News":
      return `/admin/actualites/${entiteId}`;
    case "Resource":
      return "/admin/ressources";
    case "CanchamService":
      return "/admin/offres-cancham";
    case "Rendezvous":
      return "/admin/rendez-vous";
    case "MessageThread":
      return `/admin/messagerie?t=${entiteId}`;
    case "User":
      return "/admin/equipe";
    default:
      return null;
  }
}
