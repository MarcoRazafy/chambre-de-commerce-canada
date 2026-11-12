"use server";

import { revalidatePath } from "next/cache";
import { chambreCourante } from "@/lib/chambre-courante";
import { prisma, prismaSysteme } from "@/lib/db";
import { courrielsActifs, envoyerCourriel, urlPublique } from "@/lib/courriel";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import {
  destinataireDe,
  numeroFacture,
  SELECTION_DESTINATAIRE,
} from "@/lib/factures";
import {
  cotisationEnLigne,
  factureCotisationOuverte,
  OBJET_ADHESION,
  OBJET_RENOUVELLEMENT,
} from "@/lib/cotisation";
import { jourBase, jourSaisi } from "@/lib/format";
import { creerJeton } from "@/lib/jetons";
import {
  FORMULES,
  fmtCotisation,
  fmtMontant,
  libelleFormule,
  type Devise,
  type FormuleId,
} from "@/lib/membership";
import {
  courrielDemandeApprouvee,
  courrielInvitation,
  courrielRelanceCotisation,
} from "@/lib/modeles-courriels";
import { enregistrerImage, ImageRefusee } from "@/lib/uploads";
import { supprimerVideo } from "@/lib/videos";
import { normaliserSite } from "@/lib/liens";
import { cadrageValide } from "@/lib/cadrage";
import { PAYS, PROVISOIRE } from "@/lib/accueil";
import { estSecteur, secteurOuProvisoire } from "@/lib/secteurs";
import { BESOINS_PAR_FICHE, PHOTOS_PAR_PRODUIT } from "@/lib/membership";
import {
  champsProduit,
  creerProduit,
  recevoirPhotosProduit,
} from "@/lib/produits";
import {
  exigerContact,
  exigerEquipe,
  exigerFiche,
  exigerProduit,
} from "@/lib/autorisations";
import { getCurrentUser } from "@/lib/session";
import type { MemberStatus, MemberType } from "@/lib/types";
import { after } from "next/server";
import { notifierMembre } from "@/lib/push";

const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function journal(
  action: string,
  entite: string,
  entiteId: string,
  acteur: string,
  detail?: string,
) {
  await prisma.auditLog.create({
    data: { action, entite, entiteId, acteur, detail },
  });
}

function revalideTout() {
  revalidatePath("/", "layout");
}

async function acteurEquipe(): Promise<string> {
  return (await getCurrentUser("admin")).nom;
}

function retourInterne(fd: FormData, defaut: string): string {
  const r = texte(fd, "retour");
  return r.startsWith("/") && !r.startsWith("//") ? r : defaut;
}

async function tracerEquipe(
  estEquipe: boolean,
  memberId: string,
  retour: string,
  detail: string,
) {
  if (!estEquipe) return;
  await journal(
    "fiche_modifiee",
    "Member",
    memberId,
    await acteurDepuis(retour),
    detail,
  );
}

async function acteurDepuis(retour: string): Promise<string> {
  return (
    await getCurrentUser(retour.startsWith("/admin") ? "admin" : "membre")
  ).nom;
}

async function inviter(
  userId: string,
  email: string,
  nom: string,
  entreprise: string | null,
): Promise<boolean> {
  const base = await urlPublique("/auth/nouveau-mot-de-passe");
  const jeton = await creerJeton(userId, "invitation");
  return envoyerCourriel(
    courrielInvitation(email, nom, entreprise, `${base}?jeton=${jeton}`),
  );
}

function suiteAcces(envoye: boolean, email: string): string {
  if (envoye) return `lien de connexion envoyé à ${email}`;
  return courrielsActifs()
    ? `l’e-mail n’a pas pu partir vers ${email} : réessayez dans un instant`
    : "e-mails non configurés : le lien est écrit dans le journal du serveur";
}

function suiteInvitation(envoyee: boolean, email: string): string {
  if (envoyee) return `invitation envoyée à ${email}`;
  return courrielsActifs()
    ? `l’invitation n’a pas pu partir vers ${email} : renvoyez-la depuis les contacts de la fiche`
    : "e-mails non configurés : le lien d’invitation est écrit dans le journal du serveur";
}

const ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function contactDe(memberId: string) {
  return prisma.user.findFirst({
    where: { memberId, role: "membre" },
    orderBy: [{ contactPrincipal: "desc" }, { createdAt: "asc" }],
    select: { nom: true, email: true },
  });
}

export async function donnerAcces(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "memberId");
  const retour = retourInterne(formData, `/admin/membres/${id}`);

  const m = await prisma.member.findUnique({
    where: { id },
    select: { nom: true, type: true, statut: true, formule: true },
  });
  if (!m) redirectWithErreur("/admin/membres", "Membre introuvable.");
  const contact = await prisma.user.findFirst({
    where: { memberId: id, role: "membre" },
    orderBy: [{ contactPrincipal: "desc" }, { createdAt: "asc" }],
    select: { id: true, nom: true, email: true, motDePasse: true },
  });
  if (!contact) {
    redirectWithErreur(
      retour,
      `${m.nom} n’a aucun contact : il faut une adresse e-mail pour lui envoyer son accès.`,
    );
  }

  const candidature = m.statut === "candidature";
  if (!candidature && contact.motDePasse) {
    redirectWithFlash(
      retour,
      `${contact.nom} a déjà son accès : il se connecte avec ${contact.email}`,
    );
  }

  const acteur = await acteurEquipe();
  if (candidature) {
    await prisma.member.update({
      where: { id },
      data: { statut: "en_attente" },
    });
    await journal(
      "candidature_approuvee",
      "Member",
      id,
      acteur,
      `${m.nom} · en attente du paiement de la cotisation.`,
    );
  }

  const lien = contact.motDePasse
    ? await urlPublique(
        `/auth?${new URLSearchParams({ email: contact.email })}`,
      )
    : `${await urlPublique("/auth/nouveau-mot-de-passe")}?jeton=${await creerJeton(contact.id, "invitation")}`;
  const envoye = await envoyerCourriel(
    candidature
      ? courrielDemandeApprouvee(contact.email, {
          nom: contact.nom,
          entreprise: m.nom,
          formule: m.formule ? libelleFormule(m.formule) : null,
          montant: m.formule ? fmtCotisation(m.formule) : null,
          enLigne: cotisationEnLigne(m.formule),
          lien,
          creerMotDePasse: !contact.motDePasse,
        })
      : courrielInvitation(
          contact.email,
          contact.nom,
          m.type === "morale" ? m.nom : null,
          lien,
        ),
  );
  if (!envoye && courrielsActifs() && !contact.motDePasse) {
    await prisma.jetonCompte.deleteMany({
      where: { userId: contact.id, usage: "invitation", utiliseLe: null },
    });
  }
  await journal(
    "acces_envoye",
    "Member",
    id,
    acteur,
    `Accès envoyé à ${contact.nom} (${contact.email})${envoye ? "" : " · e-mail non parti"}.`,
  );

  revalideTout();
  const debut = candidature ? `Demande de ${m.nom} validée · ` : "";
  const message = `${debut}${suiteAcces(envoye, contact.email)}`;
  if (!envoye && courrielsActifs()) redirectWithErreur(retour, message);
  redirectWithFlash(retour, message);
}

const COMMENTAIRE_MAX = 2000;

export async function rejectCandidature(formData: FormData) {
  const user = await exigerEquipe();
  const id = texte(formData, "memberId");
  const m = await prisma.member.findUnique({
    where: { id },
    select: { nom: true, statut: true },
  });
  if (!m) redirectWithErreur("/admin/membres", "Demande introuvable.");
  if (m.statut !== "candidature") {
    redirectWithErreur(
      `/admin/membres/${id}`,
      m.statut === "refusee"
        ? "Cette demande est déjà refusée."
        : "Cette demande n’est plus à l’examen : elle a déjà été tranchée.",
    );
  }

  const commentaire = texte(formData, "commentaire");
  if (!commentaire) {
    redirectWithErreur(
      `/admin/membres/${id}`,
      "Indiquez pourquoi la demande n’est pas validée : ce commentaire reste au dossier.",
    );
  }
  if (commentaire.length > COMMENTAIRE_MAX) {
    redirectWithErreur(
      `/admin/membres/${id}`,
      `Le commentaire dépasse ${COMMENTAIRE_MAX} caractères : gardez l’essentiel.`,
    );
  }

  await prisma.$transaction([
    prisma.member.update({ where: { id }, data: { statut: "refusee" } }),
    prisma.noteMembre.create({
      data: {
        memberId: id,
        texte: commentaire,
        auteur: user.nom,
        userId: user.id,
      },
    }),
  ]);
  await journal(
    "candidature_refusee",
    "Member",
    id,
    await acteurEquipe(),
    `Demande de ${m.nom} refusée : « ${commentaire.length > 160 ? `${commentaire.slice(0, 157)}…` : commentaire} ».`,
  );
  revalideTout();
  redirectWithFlash(
    "/admin/membres?statut=refusee",
    `Demande de ${m.nom} refusée`,
  );
}

export async function ajouterNoteMembre(formData: FormData) {
  const user = await exigerEquipe();
  const memberId = texte(formData, "memberId");
  const retour = `/admin/membres/${memberId}`;

  const contenu = texte(formData, "texte");
  if (!contenu) redirectWithErreur(retour, "Le commentaire est vide.");
  if (contenu.length > COMMENTAIRE_MAX) {
    redirectWithErreur(
      retour,
      `Le commentaire dépasse ${COMMENTAIRE_MAX} caractères : gardez l’essentiel.`,
    );
  }

  const membre = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true },
  });
  if (!membre) redirectWithErreur("/admin/membres", "Membre introuvable.");

  await prisma.noteMembre.create({
    data: { memberId, texte: contenu, auteur: user.nom, userId: user.id },
  });
  revalidatePath(retour);
  redirectWithFlash(retour, "Commentaire ajouté");
}

export async function supprimerNoteMembre(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "noteId");

  const note = await prisma.noteMembre.findUnique({
    where: { id },
    select: { memberId: true },
  });
  if (!note) redirectWithErreur("/admin/membres", "Commentaire introuvable.");

  const retour = `/admin/membres/${note.memberId}`;
  await prisma.noteMembre.delete({ where: { id } });
  revalidatePath(retour);
  redirectWithFlash(retour, "Commentaire retiré");
}

export async function reconsidererCandidature(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "memberId");
  const m = await prisma.member.findUnique({
    where: { id },
    select: { nom: true, statut: true },
  });
  if (!m) redirectWithErreur("/admin/membres", "Demande introuvable.");
  if (m.statut !== "refusee") {
    redirectWithErreur(
      `/admin/membres/${id}`,
      "Cette demande n’est pas refusée.",
    );
  }

  await prisma.member.update({
    where: { id },
    data: { statut: "candidature" },
  });
  await journal(
    "candidature_deposee",
    "Member",
    id,
    await acteurEquipe(),
    `Demande de ${m.nom} remise à l’examen.`,
  );
  revalideTout();
  redirectWithFlash(
    `/admin/membres/${id}`,
    `Demande de ${m.nom} remise à l’examen`,
  );
}

export async function modifierDateAdhesion(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "memberId");
  const retour = `/admin/membres/${id}`;
  const jour = jourSaisi(texte(formData, "adhesion"));
  if (!jour) redirectWithErreur(retour, "Indiquez une date d’adhésion valide.");

  const avant = await prisma.member.findUnique({
    where: { id },
    select: { nom: true, adhesion: true },
  });
  if (!avant) redirectWithErreur("/admin/membres", "Membre introuvable.");

  const ancienne = avant.adhesion.toISOString().slice(0, 10);
  if (ancienne === jour) redirectWithFlash(retour, "Date d’adhésion inchangée");

  await prisma.member.update({
    where: { id },
    data: { adhesion: jourBase(jour) },
  });
  await journal(
    "adhesion_modifiee",
    "Member",
    id,
    await acteurEquipe(),
    `${avant.nom} · adhésion du ${ancienne} au ${jour}.`,
  );
  revalideTout();
  redirectWithFlash(retour, "Date d’adhésion mise à jour");
}

export async function modifierFormule(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "memberId");
  const retour = `/admin/membres/${id}`;
  const choix = texte(formData, "formule");
  if (!(choix in FORMULES)) {
    redirectWithErreur(retour, "Choisissez une formule de la grille.");
  }
  const formule = choix as FormuleId;

  const avant = await prisma.member.findUnique({
    where: { id },
    select: { nom: true, formule: true },
  });
  if (!avant) redirectWithErreur("/admin/membres", "Membre introuvable.");
  if (avant.formule === formule) {
    redirectWithFlash(retour, "Formule inchangée");
  }

  await prisma.member.update({ where: { id }, data: { formule } });
  await journal(
    "formule_modifiee",
    "Member",
    id,
    await acteurEquipe(),
    `${avant.nom} · ${libelleFormule(avant.formule)} → ${libelleFormule(formule)} (${fmtCotisation(formule)} par an).`,
  );
  revalideTout();
  redirectWithFlash(
    retour,
    `Formule mise à jour : ${libelleFormule(formule)} · ${fmtCotisation(formule)} par an`,
  );
}

export async function registerPayment(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "memberId");
  const mode = texte(formData, "mode") || "Espèces";
  const dateSaisie = texte(formData, "date");
  const date = jourBase(jourSaisi(dateSaisie) ?? undefined);
  const note = texte(formData, "note");

  const avant = await prisma.member.findUnique({
    where: { id },
    select: { nom: true, paiementNote: true, formule: true },
  });
  if (!avant) redirectWithErreur("/admin/membres", "Membre introuvable.");

  if (!avant.formule) {
    redirectWithErreur(
      `/admin/membres/${id}`,
      "Choisissez d’abord la formule de ce membre : c’est elle qui donne le montant et la devise.",
    );
  }

  const tarif = FORMULES[avant.formule];
  const montant = Number(formData.get("montant")) || tarif.montant;
  const devise: Devise = tarif.devise;

  const premier = !avant.paiementNote;
  const ouverte = await factureCotisationOuverte(id);
  const numero = ouverte?.numero ?? (await numeroFacture(date));

  await prisma.$transaction([
    prisma.member.update({
      where: { id },
      data: {
        statut: "a_jour",
        retardDepuis: null,
        ...(premier ? { adhesion: date } : {}),
        paiementNote: `Payé par ${mode.toLowerCase()} · ${fmtMontant(montant, devise)} · le ${date.toLocaleDateString("fr-FR", { timeZone: "UTC" })}${note ? ` · ${note}` : ""}`,
      },
    }),
    ouverte
      ? prisma.invoice.update({
          where: { id: ouverte.id },
          data: { montant, devise, statut: "payee", payeeLe: date },
        })
      : prisma.invoice.create({
          data: {
            numero,
            date,
            objet: premier ? OBJET_ADHESION : OBJET_RENOUVELLEMENT,
            montant,
            devise,
            statut: "payee",
            payeeLe: date,
            memberId: id,
          },
        }),
    prisma.auditLog.create({
      data: {
        action: "paiement_enregistre",
        entite: "Invoice",
        entiteId: numero,
        acteur: await acteurEquipe(),
        detail: `${fmtMontant(montant, devise)} par ${mode} pour ${avant.nom}.`,
      },
    }),
  ]);

  after(() =>
    notifierMembre(id, {
      titre: premier
        ? "Bienvenue : votre adhésion est active"
        : "Cotisation enregistrée",
      corps: `Facture ${numero} · ${fmtMontant(montant, devise)} · merci !`,
      url: "/membre/cotisations",
    }),
  );

  revalideTout();
  redirectWithFlash(
    `/admin/membres/${id}`,
    `${premier ? "Adhésion activée" : "Paiement enregistré"} pour ${avant.nom} · facture ${numero} ${ouverte ? "réglée" : "générée"}`,
  );
}

export async function sendReminder(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "memberId");
  const fiche = `/admin/membres/${id}`;
  const m = await prisma.member.findUnique({
    where: { id },
    select: { nom: true, formule: true, retardDepuis: true },
  });
  if (!m) redirectWithErreur("/admin/membres", "Membre introuvable.");
  const contact = await contactDe(id);
  if (!contact) {
    redirectWithErreur(
      fiche,
      `${m.nom} n’a aucun contact à qui écrire : ajoutez-en un d’abord.`,
    );
  }

  const retardJours = m.retardDepuis
    ? Math.max(
        0,
        Math.floor(
          (jourBase().getTime() - m.retardDepuis.getTime()) / 86_400_000,
        ),
      )
    : null;
  const envoye = await envoyerCourriel(
    courrielRelanceCotisation(contact.email, {
      nom: contact.nom,
      entreprise: m.nom,
      formule: m.formule ? libelleFormule(m.formule) : null,
      montant: m.formule ? fmtCotisation(m.formule) : null,
      retardJours: retardJours || null,
      enLigne: cotisationEnLigne(m.formule),
      lien: await urlPublique("/membre/cotisations"),
    }),
  );
  if (!envoye) {
    redirectWithErreur(
      fiche,
      courrielsActifs()
        ? `La relance n’a pas pu partir vers ${contact.email}. Réessayez plus tard.`
        : "L’envoi d’e-mails n’est pas encore configuré (variables SMTP de Brevo) : aucune relance n’est partie.",
    );
  }

  await journal(
    "relance_envoyee",
    "Member",
    id,
    await acteurEquipe(),
    `Relance de cotisation envoyée à ${contact.email}.`,
  );
  revalideTout();
  redirectWithFlash(fiche, `Relance envoyée à ${contact.email}`);
}

export async function createMember(formData: FormData) {
  await exigerEquipe();
  const type = (texte(formData, "type") || "morale") as MemberType;
  const rep = texte(formData, "rep") || "À préciser";
  const nomSaisi = texte(formData, "nom");
  const nom = nomSaisi || (type === "physique" ? rep : "");

  if (!nom) {
    redirectWithErreur("/admin/membres", "Le nom de l’entreprise est requis.");
  }

  const email = texte(formData, "email").toLowerCase();
  if (!email) {
    redirectWithErreur(
      "/admin/membres",
      "Indiquez l’adresse e-mail du contact : c’est à elle que partira son accès.",
    );
  }
  if (!ADRESSE.test(email)) {
    redirectWithErreur(
      "/admin/membres",
      `« ${email} » n’est pas une adresse e-mail valide.`,
    );
  }
  // Une adresse = un seul espace : cherchée dans toutes les Chambres (sans rien montrer d'une autre)
  const occupe = await prismaSysteme.user.findUnique({
    where: { email },
    select: { role: true, chambreId: true, member: { select: { nom: true } } },
  });
  if (occupe && occupe.chambreId !== (await chambreCourante())) {
    redirectWithErreur("/admin/membres", `${email} est déjà utilisée sur un autre espace.`);
  }
  if (occupe) {
    redirectWithErreur(
      "/admin/membres",
      `${email} a déjà un compte${
        occupe.role === "admin"
          ? " dans l’équipe"
          : occupe.member
            ? ` (${occupe.member.nom})`
            : ""
      } : indiquez une autre adresse pour le contact de ce membre.`,
    );
  }

  const formuleSaisie = texte(formData, "formule");
  const formule =
    formuleSaisie in FORMULES ? (formuleSaisie as FormuleId) : undefined;

  const m = await prisma.member.create({
    data: {
      type,
      nom,
      ...(formule ? { formule } : {}),
      secteur: secteurOuProvisoire(
        texte(formData, "secteur"),
        PROVISOIRE.secteur,
      ),
      ville: texte(formData, "ville") || "Antananarivo",
      statut: (texte(formData, "statut") || "en_attente") as MemberStatus,
      adhesion: jourBase(),
      activite: texte(formData, "desc").slice(0, 120) || "Activité à préciser.",
      desc: texte(formData, "desc") || "Description à compléter.",
    },
  });

  await prisma.user.create({
    data: {
      role: "membre",
      nom: rep,
      fonction: texte(formData, "repTitre") || "Représentant(e)",
      email,
      tel: texte(formData, "tel") || null,
      memberId: m.id,
      contactPrincipal: true,
    },
  });

  await journal(
    "membre_cree",
    "Member",
    m.id,
    await acteurEquipe(),
    `Ajout manuel de ${nom}.`,
  );
  revalideTout();
  redirectWithFlash(
    `/admin/membres/${m.id}`,
    `${nom} a été ajouté · « Envoyer l’accès » lui envoie son lien de connexion`,
  );
}

export async function updateMemberProfile(formData: FormData) {
  const retour = retourInterne(formData, "/membre/profil");
  const { memberId: id, estEquipe } = await exigerFiche(
    texte(formData, "memberId"),
    retour,
  );

  const actuel = await prisma.member.findUnique({
    where: { id },
    select: { cover: true, logo: true, nom: true, pays: true },
  });
  if (!actuel) redirectWithErreur(retour, "Fiche introuvable.");

  const nom = texte(formData, "nom").slice(0, 120);
  if (!nom) {
    redirectWithErreur(retour, "Le nom de l’entreprise est requis.");
  }
  const paysSaisi = texte(formData, "pays");
  const pays =
    (PAYS as readonly string[]).includes(paysSaisi) || paysSaisi === actuel.pays
      ? paysSaisi
      : undefined;

  const siteSaisi = texte(formData, "siteweb");
  const siteweb = normaliserSite(siteSaisi);
  if (siteSaisi && !siteweb) {
    redirectWithErreur(
      retour,
      `« ${siteSaisi} » n’est pas une adresse de site valide.`,
    );
  }

  let couverture: string | null = null;
  let logo: string | null = null;
  try {
    couverture = await enregistrerImage(formData.get("cover"), {
      prefixe: `couverture-${id}`,
      largeur: 1600,
    });
    logo = await enregistrerImage(formData.get("logo"), {
      prefixe: `logo-${id}`,
      largeur: 600,
      transparence: true,
    });
  } catch (e) {
    if (e instanceof ImageRefusee) redirectWithErreur(retour, e.message);
    throw e;
  }

  await prisma.member.update({
    where: { id },
    data: {
      nom,
      ville: texte(formData, "ville").slice(0, 80) || undefined,
      pays,
      motivation: texte(formData, "motivation").slice(0, 1000) || null,
      secteur: estSecteur(texte(formData, "secteur"))
        ? texte(formData, "secteur")
        : undefined,
      activite: texte(formData, "activite") || undefined,
      desc: texte(formData, "desc") || undefined,
      besoins: texte(formData, "besoins") || null,
      interets: null,
      siteweb,
      cover: couverture ?? actuel.cover,
      ...(couverture ? { coverX: 50, coverY: 50 } : {}),
      logo: logo ?? actuel.logo,
    },
  });

  if (nom !== actuel.nom) {
    await journal(
      "membre_renomme",
      "Member",
      id,
      await acteurDepuis(retour),
      `« ${actuel.nom} » devient « ${nom} ».`,
    );
  }

  await tracerEquipe(estEquipe, id, retour, "Présentation de la fiche.");
  revalideTout();
  redirectWithFlash(retour, "Fiche mise à jour");
}

export async function repositionnerCouverture(demande: {
  memberId: string;
  x: number;
  y: number;
  retour: string;
}): Promise<{ ok: true } | { erreur: string }> {
  const r = String(demande?.retour ?? "");
  const retour =
    r.startsWith("/") && !r.startsWith("//") ? r : "/membre/profil";
  const { memberId: id, estEquipe } = await exigerFiche(
    String(demande?.memberId ?? ""),
    retour,
  );

  if (
    demande == null ||
    typeof demande !== "object" ||
    !Number.isFinite(Number(demande.x)) ||
    !Number.isFinite(Number(demande.y))
  ) {
    return { erreur: "Cadrage illisible." };
  }

  const actuel = await prisma.member.findUnique({
    where: { id },
    select: { cover: true, coverX: true, coverY: true },
  });
  if (!actuel) return { erreur: "Fiche introuvable." };
  if (!actuel.cover) {
    return { erreur: "Cette fiche n’a pas de photo de couverture." };
  }

  const { x, y } = cadrageValide(demande.x, demande.y);
  if (x !== actuel.coverX || y !== actuel.coverY) {
    await prisma.member.update({
      where: { id },
      data: { coverX: x, coverY: y },
    });
    await tracerEquipe(estEquipe, id, retour, "Cadrage de la couverture.");
    revalideTout();
  }
  return { ok: true };
}

export async function retirerVideoPresentation(formData: FormData) {
  const retour = retourInterne(formData, "/membre/profil");
  const { memberId: id, estEquipe } = await exigerFiche(
    texte(formData, "memberId"),
    retour,
  );

  const actuel = await prisma.member.findUnique({
    where: { id },
    select: { video: true },
  });
  if (!actuel) redirectWithErreur(retour, "Fiche introuvable.");

  if (actuel.video) {
    await prisma.member.update({ where: { id }, data: { video: null } });
    await supprimerVideo(actuel.video);
    await tracerEquipe(estEquipe, id, retour, "Vidéo de présentation retirée.");
    revalideTout();
  }
  redirectWithFlash(retour, "Vidéo de présentation retirée");
}

export async function ajouterBesoin(formData: FormData) {
  const retour = retourInterne(formData, "/membre/profil");
  const { memberId, estEquipe } = await exigerFiche(
    texte(formData, "memberId"),
    retour,
  );
  const besoin = texte(formData, "besoin").replace(/\s+/g, " ").slice(0, 200);
  if (!besoin) redirectWithErreur(retour, "Décrivez ce que vous recherchez.");

  const m = await prisma.member.findUnique({
    where: { id: memberId },
    select: { besoins: true, interets: true },
  });
  const lignes = [m?.besoins, m?.interets]
    .flatMap((t) => (t ?? "").split("\n"))
    .map((l) => l.trim())
    .filter(Boolean);
  if (lignes.length >= BESOINS_PAR_FICHE) {
    redirectWithErreur(
      retour,
      `${BESOINS_PAR_FICHE} besoins au plus : retirez-en un en modifiant la fiche.`,
    );
  }

  await prisma.member.update({
    where: { id: memberId },
    data: { besoins: [...lignes, besoin].join("\n"), interets: null },
  });
  await tracerEquipe(
    estEquipe,
    memberId,
    retour,
    `Besoin ajouté : « ${besoin} ».`,
  );
  revalideTout();
  redirectWithFlash(retour, "Besoin ajouté à la fiche");
}

export async function ajouterService(formData: FormData) {
  const retour = retourInterne(formData, "/membre/profil");
  const { memberId, estEquipe } = await exigerFiche(
    texte(formData, "memberId"),
    retour,
  );
  if (!champsProduit(formData).label) {
    redirectWithErreur(retour, "Le titre est obligatoire.");
  }

  let label: string | null = null;
  try {
    label = await creerProduit(formData, memberId);
  } catch (e) {
    if (e instanceof ImageRefusee) redirectWithErreur(retour, e.message);
    throw e;
  }

  await tracerEquipe(
    estEquipe,
    memberId,
    retour,
    `Offre ajoutée : « ${label} ».`,
  );
  revalideTout();
  redirectWithFlash(retour, `« ${label} » ajouté au catalogue.`);
}

export async function modifierService(formData: FormData) {
  const id = texte(formData, "produitId");
  const retour = retourInterne(formData, "/membre/profil");
  const { estEquipe } = await exigerProduit(id, retour);
  const champs = champsProduit(formData);
  if (!champs.label) redirectWithErreur(retour, "Le titre est obligatoire.");

  const actuel = await prisma.produit.findUnique({ where: { id } });
  if (!actuel) redirectWithErreur(retour, "Offre introuvable.");

  const retirees = new Set(formData.getAll("retirer").map(String));
  const conservees = actuel.photos.filter((url) => !retirees.has(url));

  let ajoutees: string[] = [];
  try {
    ajoutees = await recevoirPhotosProduit(
      formData,
      actuel.memberId,
      PHOTOS_PAR_PRODUIT - conservees.length,
    );
  } catch (e) {
    if (e instanceof ImageRefusee) redirectWithErreur(retour, e.message);
    throw e;
  }

  await prisma.produit.update({
    where: { id },
    data: { ...champs, photos: [...conservees, ...ajoutees] },
  });

  await tracerEquipe(
    estEquipe,
    actuel.memberId,
    retour,
    `Offre modifiée : « ${champs.label} ».`,
  );
  revalideTout();
  redirectWithFlash(retour, `« ${champs.label} » mis à jour.`);
}

export async function supprimerService(formData: FormData) {
  const id = texte(formData, "produitId");
  const retour = retourInterne(formData, "/membre/profil");
  const { estEquipe } = await exigerProduit(id, retour);
  const actuel = await prisma.produit.findUnique({
    where: { id },
    select: { label: true, memberId: true },
  });
  if (!actuel) redirectWithErreur(retour, "Offre introuvable.");

  await prisma.produit.delete({ where: { id } });

  await tracerEquipe(
    estEquipe,
    actuel.memberId,
    retour,
    `Offre retirée : « ${actuel.label} ».`,
  );
  revalideTout();
  redirectWithFlash(retour, `« ${actuel.label} » retiré du catalogue.`);
}

export async function deleteMember(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "memberId");
  const m = await prisma.member.findUnique({
    where: { id },
    select: {
      ...SELECTION_DESTINATAIRE,
      video: true,
      _count: { select: { factures: true } },
    },
  });
  if (!m) redirectWithErreur("/admin/membres", "Membre introuvable.");

  const destinataire = destinataireDe(m);
  const n = m._count.factures;
  await prisma.$transaction([
    prisma.invoice.updateMany({
      where: { memberId: id },
      data: {
        destinataireNom: m.nom,
        destinataire: { ...destinataire },
      },
    }),
    prisma.user.updateMany({
      where: { memberId: id, role: "admin" },
      data: { memberId: null, contactPrincipal: false },
    }),
    prisma.member.delete({ where: { id } }),
  ]);
  await supprimerVideo(m.video);

  const factures = n
    ? ` · ${n} facture${n > 1 ? "s" : ""} conservée${n > 1 ? "s" : ""}`
    : "";
  await journal(
    "membre_supprime",
    "Member",
    id,
    await acteurEquipe(),
    `Suppression de ${m.nom} et de ses accès${factures}.`,
  );
  revalideTout();
  redirectWithFlash("/admin/membres", `${m.nom} a été supprimé${factures}`);
}

export async function addContact(formData: FormData) {
  const retour = retourInterne(formData, "/membre/profil");
  const { memberId } = await exigerFiche(texte(formData, "memberId"), retour);
  const nom = texte(formData, "nom");
  const email = texte(formData, "email").toLowerCase();

  if (!nom || !email) {
    redirectWithErreur(retour, "Nom et courriel sont obligatoires.");
  }

  // Une adresse = un seul espace : cherchée dans toutes les Chambres
  const occupe = await prismaSysteme.user.findUnique({ where: { email }, select: { id: true } });
  if (occupe) {
    redirectWithErreur(
      retour,
      `Le courriel ${email} est déjà rattaché à un contact.`,
    );
  }

  const principal = formData.get("principal") === "on";

  let photo: string | null = null;
  try {
    photo = await enregistrerImage(formData.get("photo"), {
      prefixe: `contact-${memberId}`,
      largeur: 400,
    });
  } catch (e) {
    if (e instanceof ImageRefusee) redirectWithErreur(retour, e.message);
    throw e;
  }

  const cree = await prisma.$transaction(async (tx) => {
    if (principal) {
      await tx.user.updateMany({
        where: { memberId },
        data: { contactPrincipal: false },
      });
    }
    return tx.user.create({
      data: {
        memberId,
        role: "membre",
        nom,
        fonction: texte(formData, "fonction") || "Contact",
        email,
        tel: texte(formData, "tel") || null,
        photo,
        contactPrincipal: principal,
      },
    });
  });

  const entreprise = await prisma.member.findUnique({
    where: { id: memberId },
    select: { nom: true, type: true },
  });
  const invite = await inviter(
    cree.id,
    email,
    nom,
    entreprise?.type === "morale" ? entreprise.nom : null,
  );

  await journal(
    "contact_ajoute",
    "Member",
    memberId,
    await acteurDepuis(retour),
    `Ajout du contact ${nom} (${email}), invité à choisir son mot de passe.`,
  );
  revalideTout();
  const message = `${nom} a été ajouté aux contacts · ${suiteInvitation(invite, email)}`;
  if (!invite && courrielsActifs()) redirectWithErreur(retour, message);
  redirectWithFlash(retour, message);
}

export async function renvoyerInvitation(formData: FormData) {
  const id = texte(formData, "contactId");
  const retour = retourInterne(formData, "/membre/profil");
  const { memberId } = await exigerContact(id, retour);

  const contact = await prisma.user.findUnique({
    where: { id },
    select: {
      nom: true,
      email: true,
      motDePasse: true,
      member: { select: { nom: true, type: true } },
    },
  });
  if (!contact) redirectWithErreur(retour, "Contact introuvable.");
  if (contact.motDePasse) {
    redirectWithErreur(
      retour,
      `${contact.nom} a déjà choisi son mot de passe : « Mot de passe oublié ? » sur la page de connexion, s’il l’a perdu.`,
    );
  }

  const envoyee = await inviter(
    id,
    contact.email,
    contact.nom,
    contact.member?.type === "morale" ? contact.member.nom : null,
  );
  await journal(
    "invitation_renvoyee",
    "Member",
    memberId,
    await acteurDepuis(retour),
    `Invitation renvoyée à ${contact.nom} (${contact.email})${envoyee ? "" : " · non partie"}.`,
  );
  const message = `${contact.nom} · ${suiteInvitation(envoyee, contact.email)}`;
  if (!envoyee && courrielsActifs()) redirectWithErreur(retour, message);
  redirectWithFlash(retour, message);
}

export async function removeContact(formData: FormData) {
  const id = texte(formData, "contactId");
  const retour = retourInterne(formData, "/membre/profil");
  await exigerContact(id, retour);

  const contact = await prisma.user.findUnique({ where: { id } });
  if (!contact?.memberId) redirectWithErreur(retour, "Contact introuvable.");

  const reste = await prisma.user.count({
    where: { memberId: contact.memberId, role: "membre" },
  });
  if (reste <= 1) {
    redirectWithErreur(
      retour,
      "Une entreprise doit garder au moins un contact.",
    );
  }

  await prisma.user.delete({ where: { id } });

  if (contact.contactPrincipal) {
    const suivant = await prisma.user.findFirst({
      where: { memberId: contact.memberId, role: "membre" },
      orderBy: { createdAt: "asc" },
    });
    if (suivant) {
      await prisma.user.update({
        where: { id: suivant.id },
        data: { contactPrincipal: true },
      });
    }
  }

  await journal(
    "contact_retire",
    "Member",
    contact.memberId,
    await acteurDepuis(retour),
    `Retrait du contact ${contact.nom} (${contact.email}).`,
  );
  revalideTout();
  redirectWithFlash(retour, `${contact.nom} a été retiré des contacts.`);
}

export async function updateContact(formData: FormData) {
  const id = texte(formData, "contactId");
  const retour = retourInterne(formData, "/membre/profil");
  await exigerContact(id, retour);
  const email = texte(formData, "email").toLowerCase();
  const nom = texte(formData, "nom");

  const actuel = await prisma.user.findUnique({ where: { id } });
  if (!actuel) redirectWithErreur(retour, "Contact introuvable.");
  if (!nom || !email) {
    redirectWithErreur(retour, "Nom et courriel sont obligatoires.");
  }

  // Une adresse = un seul espace : cherchée dans toutes les Chambres
  const occupe = await prismaSysteme.user.findFirst({
    where: { email, id: { not: id } },
    select: { id: true },
  });
  if (occupe) {
    redirectWithErreur(
      retour,
      `Le courriel ${email} est déjà rattaché à un contact.`,
    );
  }

  let photo: string | null = null;
  try {
    photo = await enregistrerImage(formData.get("photo"), {
      prefixe: `contact-${actuel.memberId ?? id}`,
      largeur: 400,
    });
  } catch (e) {
    if (e instanceof ImageRefusee) redirectWithErreur(retour, e.message);
    throw e;
  }

  const principal = formData.get("principal") === "on";

  await prisma.$transaction(async (tx) => {
    if (principal && actuel.memberId) {
      await tx.user.updateMany({
        where: { memberId: actuel.memberId, id: { not: id } },
        data: { contactPrincipal: false },
      });
    }
    await tx.user.update({
      where: { id },
      data: {
        nom,
        fonction: texte(formData, "fonction") || "Contact",
        email,
        tel: texte(formData, "tel") || null,
        photo: photo ?? actuel.photo,
        contactPrincipal: principal || actuel.contactPrincipal,
      },
    });
  });

  revalideTout();
  redirectWithFlash(retour, `${nom} a été mis à jour.`);
}
