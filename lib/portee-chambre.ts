// Séparation des Chambres : chaque requête à la base est limitée à la Chambre en cours (voir lib/db.ts).
// Fonction pure : elle reçoit la requête Prisma (modèle, opération, arguments) et renvoie les arguments limités.
//
// - Tables principales (champ chambreId) : filtre « chambreId = la Chambre » ; à la création, chambreId est posé,
//   y compris dans les créations imbriquées (une entreprise créée avec ses comptes, par exemple).
// - Tables enfants (sans chambreId) : filtre par leur parent (une inscription → son événement → sa Chambre).
// - Chambre : seulement la Chambre en cours ; on n'en crée pas ici (Admin GM : prismaSysteme).
// - Tables communes (offres de la plateforme) : lues telles quelles, modifiées seulement par l'Admin GM.
// - Comptes de l'Admin GM : jamais par ici (prismaSysteme).

// Tables qui portent chambreId
export const DIRECTES = new Set([
  "Member", "User", "Event", "News", "Resource", "DossierRessource", "Offer", "CanchamService", "Invoice",
  "Paiement", "CoordonneesPaiement", "MessageThread", "AuditLog", "Abonne", "TypeRendezvous", "Rendezvous",
  "MiseEnRelation", "Lettre", "Tag", "FacturePlateforme", "RegleTag", "ProfilChambre",
]);

// Tables communes à toute la plateforme : lecture sans filtre, écriture refusée (Admin GM : prismaSysteme)
export const COMMUNES = new Set(["Offre"]);
// Tables de l'Admin GM : refusées ici
export const SYSTEME_SEULEMENT = new Set(["CompteGM"]);

const dans = (c: string) => ({ is: { chambreId: c } });
const commentaire = (c: string) => ({ OR: [{ news: dans(c) }, { resource: dans(c) }] });

// Tables enfants : le chemin jusqu'à une table principale
export const PAR_PARENT: Record<string, (c: string) => object> = {
  Registration: (c) => ({ event: dans(c) }),
  EventAgenda: (c) => ({ event: dans(c) }),
  RappelEnvoye: (c) => ({ event: dans(c) }),
  EventIntervenant: (c) => ({ event: dans(c) }),
  Attendee: (c) => ({ event: dans(c) }),
  RappelEvenement: (c) => ({ event: dans(c) }),
  Produit: (c) => ({ member: dans(c) }),
  Maillage: (c) => ({ member: dans(c) }),
  NoteMembre: (c) => ({ member: dans(c) }),
  Rappel: (c) => ({ user: dans(c) }),
  AbonnementPush: (c) => ({ user: dans(c) }),
  JetonCompte: (c) => ({ user: dans(c) }),
  NewsLike: (c) => ({ news: dans(c) }),
  AccesRessource: (c) => ({ resource: dans(c) }),
  LectureRessource: (c) => ({ resource: dans(c) }),
  AccesDossier: (c) => ({ dossier: dans(c) }),
  Comment: (c) => commentaire(c),
  CommentLike: (c) => ({ comment: { is: commentaire(c) } }),
  ParticipantFil: (c) => ({ thread: dans(c) }),
  Message: (c) => ({ thread: dans(c) }),
  PieceJointe: (c) => ({ message: { is: { thread: dans(c) } } }),
  Disponibilite: (c) => ({ type: dans(c) }),
  EnvoiLettre: (c) => ({ lettre: dans(c) }),
};

// Relations entre tables (sauf « chambre »), pour suivre les créations imbriquées.
// Tenu à jour avec prisma/schema.prisma : un test compare les deux.
export const RELATIONS: Record<string, Record<string, string>> = {
  AbonnementPush: { user: "User" },
  AccesDossier: { dossier: "DossierRessource", member: "Member" },
  AccesRessource: { resource: "Resource", member: "Member" },
  Attendee: { event: "Event" },
  Comment: { news: "News", resource: "Resource", user: "User", jaimes: "CommentLike" },
  CommentLike: { comment: "Comment", user: "User" },
  Disponibilite: { type: "TypeRendezvous" },
  DossierRessource: { parent: "DossierRessource", enfants: "DossierRessource", ressources: "Resource", acces: "AccesDossier" },
  EnvoiLettre: { lettre: "Lettre" },
  Event: { inscriptions: "Registration", rappels: "RappelEnvoye", rappelsProgrammes: "RappelEvenement", participants: "Attendee", programme: "EventAgenda", intervenants: "EventIntervenant", factures: "Invoice" },
  EventAgenda: { event: "Event" },
  EventIntervenant: { event: "Event" },
  Invoice: { member: "Member", event: "Event", paiements: "Paiement" },
  JetonCompte: { user: "User" },
  LectureRessource: { user: "User", resource: "Resource" },
  Lettre: { envois: "EnvoiLettre" },
  Maillage: { member: "Member" },
  Member: { maillage: "Maillage", relationsA: "MiseEnRelation", relationsB: "MiseEnRelation", users: "User", produits: "Produit", offres: "Offer", actualites: "News", factures: "Invoice", inscriptions: "Registration", rendezvous: "Rendezvous", notes: "NoteMembre", acces: "AccesRessource", accesDossiers: "AccesDossier", reglements: "Paiement" },
  Message: { thread: "MessageThread", piecesJointes: "PieceJointe" },
  MessageThread: { messages: "Message", participants: "ParticipantFil" },
  MiseEnRelation: { memberA: "Member", memberB: "Member" },
  News: { member: "Member", commentaires: "Comment", jaimes: "NewsLike" },
  NewsLike: { news: "News", user: "User" },
  NoteMembre: { member: "Member", user: "User" },
  Offer: { member: "Member" },
  Paiement: { invoice: "Invoice", member: "Member" },
  ParticipantFil: { thread: "MessageThread", user: "User" },
  PieceJointe: { message: "Message" },
  Produit: { member: "Member" },
  Rappel: { user: "User" },
  RappelEnvoye: { event: "Event" },
  RappelEvenement: { event: "Event" },
  Registration: { event: "Event", member: "Member" },
  Rendezvous: { type: "TypeRendezvous", user: "User", member: "Member", hote: "User" },
  Resource: { dossier: "DossierRessource", commentaires: "Comment", lectures: "LectureRessource", acces: "AccesRessource" },
  TypeRendezvous: { hote: "User", rendezvous: "Rendezvous", plages: "Disponibilite" },
  User: { member: "Member", jaimes: "NewsLike", participations: "ParticipantFil", commentaires: "Comment", jaimesCommentaires: "CommentLike", rappels: "Rappel", jetons: "JetonCompte", notesMembres: "NoteMembre", abonnementsPush: "AbonnementPush", rendezvous: "Rendezvous", rdvRecus: "Rendezvous", typesRdv: "TypeRendezvous", lectures: "LectureRessource" },
};

// Relations « possédées » par une table principale (elle porte la clé, ex. memberId) : si la création les donne
// sous forme reliée (member: { connect }), la Chambre doit l'être aussi (Prisma refuse le mélange).
// Tenu à jour avec prisma/schema.prisma : un test compare les deux.
export const POSSEDEES: Record<string, string[]> = {
  User: ["member"],
  News: ["member"],
  Resource: ["dossier"],
  DossierRessource: ["parent"],
  Offer: ["member"],
  Invoice: ["member", "event"],
  Paiement: ["invoice", "member"],
  TypeRendezvous: ["hote"],
  Rendezvous: ["type", "user", "member", "hote"],
  MiseEnRelation: ["memberA", "memberB"],
};

// Opérations qui portent un « where » à limiter
const FILTREES = new Set([
  "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy",
  "update", "updateMany", "updateManyAndReturn", "delete", "deleteMany", "upsert",
]);
const CREATIONS = new Set(["create", "createMany", "createManyAndReturn", "upsert"]);
const LECTURES = new Set(["findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy"]);

type Objet = Record<string, unknown>;
const estObjet = (v: unknown): v is Objet => typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date);
const liste = <T>(v: T | T[]): T[] => (Array.isArray(v) ? v : [v]);
const surChaque = (v: unknown, f: (o: Objet) => Objet): unknown => (Array.isArray(v) ? v.map((x) => (estObjet(x) ? f(x) : x)) : estObjet(v) ? f(v) : v);

export class ChambreHorsPortee extends Error {}

// Le filtre de la Chambre pour un modèle (null : table commune, sans filtre)
export function filtreChambre(modele: string, chambreId: string): object | null {
  if (COMMUNES.has(modele)) return null;
  if (modele === "Chambre") return { id: chambreId };
  if (DIRECTES.has(modele)) return { chambreId };
  const parent = PAR_PARENT[modele];
  if (!parent) throw new ChambreHorsPortee(`Table « ${modele} » sans règle de Chambre (lib/portee-chambre.ts)`);
  return parent(chambreId);
}

// « where » + filtre, sans toucher aux champs uniques (findUnique, update, delete restent valides)
function limiter(where: unknown, filtre: object): Objet {
  const w = estObjet(where) ? where : {};
  return { ...w, AND: [...(w.AND === undefined ? [] : liste(w.AND as object | object[])), filtre] };
}

// Données d'une création : la Chambre posée sur la table principale, puis dans les créations imbriquées
function poser(modele: string, data: Objet, chambreId: string, seulementScalaires = false): Objet {
  const sortie: Objet = DIRECTES.has(modele) ? { ...data } : imbriquees(modele, data, chambreId);
  if (!DIRECTES.has(modele)) return sortie;
  // Données « reliées » (member: { connect }) : la Chambre aussi par relation ; sinon par son identifiant
  const reliees = !seulementScalaires && ((POSSEDEES[modele] ?? []).some((k) => estObjet(data[k])) || "chambre" in data);
  delete sortie.chambreId;
  delete sortie.chambre;
  if (reliees) sortie.chambre = { connect: { id: chambreId } };
  else sortie.chambreId = chambreId;
  return seulementScalaires ? sortie : imbriquees(modele, sortie, chambreId);
}

// Suit les relations d'un objet de données et pose la Chambre dans ce qui y est créé
function imbriquees(modele: string, data: Objet, chambreId: string): Objet {
  const relations = RELATIONS[modele];
  if (!relations) return data;
  const sortie: Objet = { ...data };
  for (const [champ, cible] of Object.entries(relations)) {
    const ops = data[champ];
    if (!estObjet(ops)) continue;
    const o: Objet = { ...ops };
    if (o.create !== undefined) o.create = surChaque(o.create, (x) => poser(cible, x, chambreId));
    if (estObjet(o.createMany) && o.createMany.data !== undefined) {
      o.createMany = { ...o.createMany, data: surChaque(o.createMany.data, (x) => poser(cible, x, chambreId, true)) };
    }
    if (o.connectOrCreate !== undefined) {
      o.connectOrCreate = surChaque(o.connectOrCreate, (x) => ({ ...x, ...(estObjet(x.create) ? { create: poser(cible, x.create, chambreId) } : {}) }));
    }
    if (o.upsert !== undefined) {
      o.upsert = surChaque(o.upsert, (x) => ({
        ...x,
        ...(estObjet(x.create) ? { create: poser(cible, x.create, chambreId) } : {}),
        ...(estObjet(x.update) ? { update: imbriquees(cible, x.update, chambreId) } : {}),
      }));
    }
    if (o.update !== undefined) {
      o.update = surChaque(o.update, (x) => (estObjet(x.data) ? { ...x, data: imbriquees(cible, x.data, chambreId) } : imbriquees(cible, x, chambreId)));
    }
    sortie[champ] = o;
  }
  return sortie;
}

// Les arguments d'une requête, limités à la Chambre
export function restreindre(modele: string, operation: string, args: unknown, chambreId: string): Objet {
  if (!chambreId) throw new ChambreHorsPortee("Chambre inconnue");
  const a: Objet = estObjet(args) ? { ...args } : {};
  if (modele === "Chambre" && CREATIONS.has(operation)) {
    throw new ChambreHorsPortee("Créer une Chambre se fait hors d'une Chambre (prismaSysteme)");
  }
  if (COMMUNES.has(modele)) {
    if (!LECTURES.has(operation)) throw new ChambreHorsPortee(`« ${modele} » ne se modifie que dans l'espace Admin GM`);
    return a;
  }
  const filtre = filtreChambre(modele, chambreId); // modèle inconnu : erreur
  if (FILTREES.has(operation) && filtre) a.where = limiter(a.where, filtre);

  switch (operation) {
    case "create":
      if (estObjet(a.data)) a.data = poser(modele, a.data, chambreId);
      break;
    case "createMany":
    case "createManyAndReturn":
      if (a.data !== undefined) a.data = surChaque(a.data, (x) => poser(modele, x, chambreId, true));
      break;
    case "upsert":
      if (estObjet(a.create)) a.create = poser(modele, a.create, chambreId);
      if (estObjet(a.update)) a.update = imbriquees(modele, a.update, chambreId);
      break;
    case "update":
      if (estObjet(a.data)) a.data = imbriquees(modele, a.data, chambreId);
      break;
  }
  return a;
}
