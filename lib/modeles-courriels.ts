import "server-only";

import { gabarit, type Courriel } from "@/lib/courriel";
import { pngQr } from "@/lib/qr";

const prenom = (nom: string) => nom.split(" ")[0] || nom;

export function courrielReinitialisation(
  a: string,
  nom: string,
  lien: string,
): Courriel {
  return {
    a,
    sujet: "Réinitialiser votre mot de passe CanCham Connect",
    ...gabarit({
      titre: "Réinitialiser votre mot de passe",
      paragraphes: [
        `Bonjour ${prenom(nom)},`,
        "Vous avez demandé à changer le mot de passe de votre compte CanCham Connect. Ce lien est valable une heure et ne sert qu’une fois.",
      ],
      bouton: { libelle: "Choisir un nouveau mot de passe", url: lien },
      apres: [
        "Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : votre mot de passe actuel reste valable.",
      ],
    }),
  };
}

export function courrielInvitation(
  a: string,
  nom: string,
  entreprise: string | null,
  lien: string,
): Courriel {
  return {
    a,
    sujet: "Votre accès à CanCham Connect",
    ...gabarit({
      titre: "Votre accès à CanCham Connect",
      paragraphes: [
        `Bonjour ${prenom(nom)},`,
        `Un accès à CanCham Connect, la plateforme des membres de la Chambre de Commerce et de Coopération Canada–Madagascar, a été ouvert à votre nom${
          entreprise ? ` pour ${entreprise}` : ""
        }.`,
        "Choisissez votre mot de passe pour vous connecter : annuaire des membres, événements, messagerie et ressources vous attendent.",
      ],
      bouton: { libelle: "Choisir mon mot de passe", url: lien },
      apres: [
        "Ce lien est valable sept jours. Passé ce délai, utilisez « Mot de passe oublié ? » sur la page de connexion.",
      ],
    }),
  };
}

export function courrielDemandeRecue(a: string, nom: string): Courriel {
  return {
    a,
    sujet: "Votre demande d’adhésion à CanCham est bien reçue",
    ...gabarit({
      titre: "Votre demande d’adhésion est bien reçue",
      paragraphes: [
        `Bonjour ${prenom(nom)},`,
        "Merci de votre intérêt pour la Chambre de Commerce et de Coopération Canada–Madagascar. Votre demande d’adhésion est enregistrée, et l’équipe CanCham l’examine.",
        "Dès qu’elle sera validée, vous recevrez un e-mail avec un lien pour créer votre mot de passe. Vous pourrez alors vous connecter à CanCham Connect et compléter votre fiche : logo, couverture, produits et services.",
      ],
    }),
  };
}

export function courrielNouvelleInscription(
  a: string,
  email: string,
  precisions: (string | null)[],
  lien: string,
): Courriel {
  return {
    a,
    sujet: `Nouvelle demande d’adhésion : ${email}`,
    ...gabarit({
      titre: "Nouvelle demande d’adhésion",
      paragraphes: [
        `${email} vient de déposer une demande d’adhésion. Sa connexion reste fermée tant que vous ne l’avez pas validée.`,
        ...precisions.filter((p): p is string => !!p),
        "S’il s’agit d’un collaborateur de la chambre, promouvez-le plutôt depuis « Équipe & accès ».",
      ],
      bouton: { libelle: "Examiner la demande", url: lien },
    }),
  };
}

export function courrielRelanceCotisation(
  a: string,
  d: {
    nom: string;
    entreprise: string;
    montant: string | null;
    formule: string | null;
    retardJours: number | null;
    enLigne: boolean;
    lien: string;
  },
): Courriel {
  return {
    a,
    sujet: `Cotisation CanCham — ${d.entreprise}`,
    ...gabarit({
      titre: "Votre cotisation CanCham",
      paragraphes: [
        `Bonjour ${prenom(d.nom)},`,
        `La cotisation de ${d.entreprise}${
          d.formule && d.montant ? ` (${d.formule}, ${d.montant} par an)` : ""
        } est en attente de règlement${
          d.retardJours
            ? ` depuis ${d.retardJours} jour${d.retardJours > 1 ? "s" : ""}`
            : ""
        }.`,
        d.enLigne
          ? "Vous pouvez la régler en ligne depuis votre espace membre, par carte bancaire ou mobile money, ou auprès de l’équipe CanCham, en espèces ou par virement."
          : "Vous pouvez la régler auprès de l’équipe CanCham, en espèces, par virement ou par chèque. Votre espace membre indique votre situation et vos factures.",
      ],
      bouton: {
        libelle: d.enLigne ? "Régler ma cotisation" : "Voir mes cotisations",
        url: d.lien,
      },
      apres: [
        "Si vous avez déjà réglé, merci de ne pas tenir compte de ce message : l’enregistrement peut prendre quelques jours.",
      ],
    }),
  };
}

export function courrielDemandeApprouvee(
  a: string,
  d: {
    nom: string;
    entreprise: string;
    montant: string | null;
    formule: string | null;
    enLigne: boolean;
    lien: string;
    creerMotDePasse: boolean;
  },
): Courriel {
  return {
    a,
    sujet: "Votre demande d’adhésion est validée",
    ...gabarit({
      titre: "Votre demande d’adhésion est validée",
      paragraphes: [
        `Bonjour ${prenom(d.nom)},`,
        `L’équipe CanCham a validé la demande d’adhésion de ${d.entreprise}. Bienvenue dans la chambre !`,
        d.creerMotDePasse
          ? "Créez votre mot de passe pour vous connecter à CanCham Connect : quelques étapes vous permettent ensuite de compléter votre fiche — activité, logo, couverture, produits et services."
          : "Connectez-vous dès maintenant avec votre adresse et votre mot de passe : quelques étapes vous permettent de compléter votre fiche — activité, logo, couverture, produits et services.",
        d.formule && d.montant
          ? `Votre espace s’ouvre ensuite entièrement dès le règlement de la cotisation annuelle (${d.formule}, ${d.montant}). ${
              d.enLigne
                ? "Vous la réglez en ligne depuis votre espace, par carte bancaire ou mobile money, ou auprès de l’équipe, en espèces ou par virement."
                : "Elle se règle auprès de l’équipe, en espèces, par virement ou par chèque."
            }`
          : "Votre espace s’ouvre ensuite entièrement dès le règlement de la cotisation annuelle. Choisissez d’abord votre formule en complétant votre dossier : c’est elle qui en fixe le montant.",
      ],
      bouton: {
        libelle: d.creerMotDePasse ? "Créer mon mot de passe" : "Me connecter",
        url: d.lien,
      },
      apres: d.creerMotDePasse
        ? [
            "Ce lien est valable sept jours. Passé ce délai, utilisez « Mot de passe oublié ? » sur la page de connexion.",
          ]
        : [],
    }),
  };
}

export function courrielCompteEquipe(
  a: string,
  d: { fonction: string; niveau: string; motDePasse: string; lien: string },
): Courriel {
  return {
    a,
    sujet: "Votre accès à l’équipe CanCham Connect",
    ...gabarit({
      titre: "Bienvenue dans l’équipe CanCham Connect",
      paragraphes: [
        "Bonjour,",
        `Un accès au back-office de CanCham Connect vient d’être ouvert pour vous, en tant que « ${d.fonction} », avec le niveau ${d.niveau}.`,
        `Votre identifiant : ${a}`,
        `Votre mot de passe provisoire : ${d.motDePasse}`,
        "Dès votre première connexion, ouvrez « Mon profil » pour indiquer votre nom et choisir votre propre mot de passe.",
      ],
      bouton: { libelle: "Me connecter", url: d.lien },
      apres: [
        "Si vous n’attendiez pas cet accès, ignorez ce message et prévenez l’équipe CanCham.",
      ],
    }),
  };
}

interface Rendezvous {
  evenement: string;
  quand: string;
  lieu: string;
  participants: { nom: string; code: string }[];
  lien: string;
}

export async function courrielBilletsEvenement(
  a: string,
  d: Rendezvous,
): Promise<Courriel> {
  const plusieurs = d.participants.length > 1;
  const pieces = await Promise.all(
    d.participants.map(async (p) => ({
      nom: `billet-${p.code}.png`,
      contenu: await pngQr(p.code),
      type: "image/png",
      cid: `qr-${p.code}`,
    })),
  );
  return {
    a,
    sujet: `Votre billet — ${d.evenement}`,
    pieces,
    ...gabarit({
      titre: "Votre inscription est confirmée",
      paragraphes: [
        "Bonjour,",
        `Votre inscription à « ${d.evenement} » est confirmée.`,
        `Quand : ${d.quand}`,
        `Où : ${d.lieu}`,
        plusieurs
          ? `${d.participants.length} participants, chacun avec son QR code :`
          : "Votre QR code d’entrée :",
      ],
      images: d.participants.map((p) => ({
        cid: `qr-${p.code}`,
        legende: `${p.nom ? `${p.nom} — ` : ""}${p.code}`,
      })),
      bouton: {
        libelle: plusieurs ? "Voir les billets" : "Voir mon billet",
        url: d.lien,
      },
      apres: [
        `Présentez ${plusieurs ? "chacun son" : "votre"} QR code à l’accueil : il suffit de le montrer sur un téléphone, ou imprimé. Le code écrit sous l’image fait foi si le QR ne se lit pas.`,
        "Gardez cet e-mail. Pour toute question, répondez simplement à ce message.",
      ],
    }),
  };
}

export function courrielInscriptionEnAttente(
  a: string,
  d: Omit<Rendezvous, "participants"> & {
    participants: { nom: string }[];
    aRegler: string;
  },
): Courriel {
  const plusieurs = d.participants.length > 1;
  return {
    a,
    sujet: `Inscription enregistrée, en attente de validation — ${d.evenement}`,
    ...gabarit({
      titre: "Votre inscription attend d’être validée",
      paragraphes: [
        "Bonjour,",
        `Votre inscription à « ${d.evenement} » est enregistrée. L’événement étant payant, elle attend la validation de l’équipe CanCham.`,
        `Quand : ${d.quand}`,
        `Où : ${d.lieu}`,
        plusieurs
          ? `Inscrits : ${d.participants.map((p) => p.nom).join(", ")}`
          : `Inscrit : ${d.participants[0]?.nom ?? ""}`,
        `À régler : ${d.aRegler}. Choisissez votre moyen de paiement depuis la page de votre inscription (bouton ci-dessous) — ou réglez auprès de l’équipe CanCham.`,
        `Dès que le règlement est constaté, vous recevez un second e-mail avec ${plusieurs ? "les QR codes d’entrée" : "votre QR code d’entrée"}. C’est lui qui vous ouvre l’accueil : sans lui, l’entrée n’est pas assurée.`,
      ],
      bouton: { libelle: "Voir mon inscription", url: d.lien },
      apres: [
        "Si vous avez déjà réglé, ne tenez pas compte de ce rappel : l’enregistrement peut prendre quelques heures. Pour toute question, répondez simplement à ce message.",
      ],
    }),
  };
}

export function courrielReglementEcarte(
  a: string,
  d: { evenement: string; reference: string; lien: string },
): Courriel {
  return {
    a,
    sujet: `Paiement non retrouvé — ${d.evenement}`,
    ...gabarit({
      titre: "Nous n’avons pas retrouvé votre paiement",
      paragraphes: [
        "Bonjour,",
        `Vous avez annoncé un paiement pour votre inscription à « ${d.evenement} » (référence ${d.reference}). L’équipe CanCham ne l’a pas retrouvé : votre inscription attend toujours son règlement.`,
        "Depuis la page de votre inscription, vous pouvez choisir à nouveau un moyen de paiement.",
      ],
      bouton: { libelle: "Voir mon inscription", url: d.lien },
      apres: [
        "Si vous avez bien payé, répondez simplement à ce message avec la preuve du paiement : l’équipe le vérifiera.",
      ],
    }),
  };
}

export function courrielQuestionVisiteur(
  a: string,
  d: {
    nom: string;
    email: string;
    telephone: string;
    question: string;
    lien: string;
  },
): Courriel {
  return {
    a,
    sujet: `Question depuis le site : ${d.nom}`,
    ...gabarit({
      titre: "Une question posée depuis le site",
      paragraphes: [
        `${d.nom} vient d’écrire à l’équipe depuis la page publique.`,
        `Pour la rappeler : ${d.telephone} · ${d.email}`,
        "Sa question :",
        d.question,
        "La réponse écrite dans l’assistance lui parvient aussitôt, et un e-mail la prévient.",
      ],
      bouton: { libelle: "Répondre dans l’assistance", url: d.lien },
    }),
  };
}

export function courrielReponseVisiteur(
  a: string,
  d: { nom: string; reponse: string; lien: string },
): Courriel {
  return {
    a,
    sujet: "L’équipe CanCham vous a répondu",
    ...gabarit({
      titre: "L’équipe CanCham vous a répondu",
      paragraphes: [
        `Bonjour ${prenom(d.nom)},`,
        "Voici la réponse de l’équipe à votre question :",
        d.reponse,
        "Vous pouvez poursuivre la conversation depuis le site, dans la bulle d’assistance en bas de page.",
      ],
      bouton: { libelle: "Poursuivre la conversation", url: d.lien },
      apres: [
        "Vous pouvez aussi répondre directement à ce message : il arrive à l’équipe CanCham.",
      ],
    }),
  };
}

interface RendezvousCourriel {
  type: string;
  jour: string;
  horaire: string;
  personne: string;
  entreprise: string | null;
  motif: string | null;
  lien: string;
  /** Qui reçoit (sinon : l'équipe CanCham) */
  avec?: string | null;
  /** Où : « Bureau de la CanCham », « Téléphone », « Visio » */
  lieu?: string;
  lienVisio?: string | null;
  aConfirmer?: boolean;
  /** Invitation de calendrier (.ics) jointe */
  ics?: string | null;
}

const ouLigne = (d: RendezvousCourriel) =>
  d.lieu
    ? [`Où : ${d.lieu}${d.lienVisio ? ` — ${d.lienVisio}` : d.lieu === "Visio" ? " (le lien vous sera communiqué avant la rencontre)" : ""}`]
    : [];
const piecesIcs = (d: RendezvousCourriel) =>
  d.ics ? [{ nom: "rendez-vous.ics", contenu: Buffer.from(d.ics, "utf8"), type: "text/calendar; charset=utf-8" }] : undefined;

export function courrielRendezvousPris(
  a: string,
  d: RendezvousCourriel,
): Courriel {
  const avec = d.avec ? `avec ${d.avec}` : "avec l’équipe CanCham";
  return {
    a,
    sujet: d.aConfirmer ? `Demande de rendez-vous enregistrée — ${d.jour}` : `Rendez-vous confirmé — ${d.jour}`,
    pieces: d.aConfirmer ? undefined : piecesIcs(d),
    ...gabarit({
      titre: d.aConfirmer ? "Votre demande de rendez-vous est enregistrée" : "Votre rendez-vous est confirmé",
      paragraphes: [
        `Bonjour ${prenom(d.personne)},`,
        d.aConfirmer
          ? `Votre demande de rendez-vous « ${d.type} » ${avec} est enregistrée. L’équipe la confirme rapidement : vous recevrez un second courriel.`
          : `Votre rendez-vous « ${d.type} » ${avec} est confirmé.`,
        `Quand : ${d.jour}, ${d.horaire} (heure de Madagascar)`,
        ...ouLigne(d),
        ...(d.motif ? [`Ce que vous souhaitez aborder : ${d.motif}`] : []),
        ...(d.ics && !d.aConfirmer ? ["L’invitation jointe (rendez-vous.ics) l’ajoute à votre agenda : Google Agenda, Outlook ou iPhone."] : []),
      ],
      bouton: { libelle: "Voir mes rendez-vous", url: d.lien },
      apres: [
        "Un empêchement ? Annulez depuis votre espace membre plutôt que de laisser le créneau vide : il repart aussitôt à quelqu’un d’autre.",
      ],
    }),
  };
}

// L'équipe confirme une demande de rendez-vous
export function courrielRendezvousConfirme(
  a: string,
  d: RendezvousCourriel,
): Courriel {
  return {
    a,
    sujet: `Rendez-vous confirmé — ${d.jour}`,
    pieces: piecesIcs(d),
    ...gabarit({
      titre: "Votre rendez-vous est confirmé",
      paragraphes: [
        `Bonjour ${prenom(d.personne)},`,
        `L’équipe CanCham confirme votre rendez-vous « ${d.type} »${d.avec ? ` avec ${d.avec}` : ""}.`,
        `Quand : ${d.jour}, ${d.horaire} (heure de Madagascar)`,
        ...ouLigne(d),
        ...(d.ics ? ["L’invitation jointe (rendez-vous.ics) l’ajoute à votre agenda."] : []),
      ],
      bouton: { libelle: "Voir mes rendez-vous", url: d.lien },
    }),
  };
}

export function courrielRendezvousEquipe(
  a: string,
  d: RendezvousCourriel,
): Courriel {
  return {
    a,
    sujet: `${d.aConfirmer ? "Rendez-vous à confirmer" : "Nouveau rendez-vous"} : ${d.personne} — ${d.jour}`,
    pieces: d.aConfirmer ? undefined : piecesIcs(d),
    ...gabarit({
      titre: d.aConfirmer ? "Un membre demande un rendez-vous" : "Un membre a réservé un créneau",
      paragraphes: [
        `${d.personne}${d.entreprise ? ` · ${d.entreprise}` : ""} ${d.aConfirmer ? "demande" : "vient de réserver"} « ${d.type} »${d.avec ? `, avec ${d.avec}` : ""}.`,
        `Quand : ${d.jour}, ${d.horaire} (heure de Madagascar)`,
        ...ouLigne(d),
        ...(d.motif
          ? [`Motif indiqué : ${d.motif}`]
          : ["Aucun motif indiqué."]),
        ...(d.aConfirmer ? ["Confirmez-le depuis la page Rendez-vous : le membre est prévenu aussitôt."] : []),
      ],
      bouton: { libelle: d.aConfirmer ? "Confirmer le rendez-vous" : "Voir les rendez-vous", url: d.lien },
    }),
  };
}

export function courrielRendezvousAnnule(
  a: string,
  d: RendezvousCourriel & { par: string },
): Courriel {
  return {
    a,
    sujet: `Rendez-vous annulé — ${d.jour}`,
    pieces: piecesIcs(d),
    ...gabarit({
      titre: "Un rendez-vous a été annulé",
      paragraphes: [
        `Le rendez-vous « ${d.type} » du ${d.jour}, ${d.horaire}, a été annulé par ${d.par}.`,
        `Il concernait ${d.personne}${d.entreprise ? ` · ${d.entreprise}` : ""}.`,
        "Le créneau est de nouveau libre.",
      ],
      bouton: { libelle: "Prendre un autre rendez-vous", url: d.lien },
    }),
  };
}

// Relance du questionnaire de maillage : le membre n'a pas encore répondu (ou pas tout)
export function courrielRelanceMaillage(
  a: string,
  d: { nom: string; entreprise: string; faites: number; total: number; lien: string },
): Courriel {
  return {
    a,
    sujet: `Questionnaire de maillage — ${d.entreprise}`,
    ...gabarit({
      titre: "Votre questionnaire de maillage",
      paragraphes: [
        `Bonjour ${prenom(d.nom)},`,
        d.faites
          ? `Vous avez commencé le questionnaire de maillage de ${d.entreprise} (${d.faites} réponses sur ${d.total}). Il ne reste que quelques questions.`
          : `La Chambre aimerait mieux connaître ${d.entreprise} pour vous présenter les bons partenaires parmi ses membres.`,
        "Le questionnaire prend une quinzaine de minutes ; vos réponses s’enregistrent au fur et à mesure. Plus elles sont précises, plus les mises en relation sont utiles.",
      ],
      bouton: { libelle: "Répondre au questionnaire", url: d.lien },
    }),
  };
}
