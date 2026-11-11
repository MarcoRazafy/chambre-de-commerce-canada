import { COORDONNEES } from "@/lib/coordonnees";
import type { EmplacementOffre } from "@/lib/offres";
import "server-only";

import {
  ADHESION_PENDING,
  DELAI_REGLEMENT_JOURS,
  fmtMontant,
  RETARD_BLOCAGE_JOURS,
  type FormuleId,
  HORS_ANNUAIRE,
} from "@/lib/membership";
import {
  ajouterJours,
  dateRestriction,
  renouvellementCotisation,
  echeanceFacture,
  trierElements,
  type ElementAgenda,
} from "@/lib/agenda";

import { PROVISOIRE } from "@/lib/accueil";
import { initialesDe, LOGO_EQUIPE } from "@/lib/avatars";
import {
  codeInscription,
  estCodeInscription,
  extraireCode,
} from "@/lib/codes-accueil";
import { visiteurDuFil } from "@/lib/support-visiteur";
import { blocsEnregistres, type Bloc } from "@/lib/blocs";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { utilisateurConnecte } from "@/lib/session";
import { nomFacture } from "@/lib/factures";
import { aujourdhuiISO, jourBase } from "@/lib/format";
import { critereJoignable } from "@/lib/messagerie";
import {
  EVENT_FORMAT_LABEL,
  heureRelative,
  NEWS_CAT_LABEL,
  RESOURCE_CAT_LABEL,
  RESOURCE_FMT_LABEL,
  toISODate,
} from "@/lib/enums";
import type {
  CanchamEvent,
  Contact,
  CanchamService,
  Comment,
  Invoice,
  Member,
  MessageThread,
  NewsCategory,
  NewsItem,
  Personne,
  Offer,
  Registration,
  DossierRessource,
  SectionDossier,
  MemberStatus,
  MaillonDossier,
  Resource,
  Space,
} from "@/lib/types";

const membreInclude = { produits: { orderBy: { ordre: "asc" } } } as const;

type MembreRow = {
  id: string;
  type: "morale" | "physique";
  nom: string;
  secteur: string;
  ville: string;
  statut: MemberStatus;
  formule: FormuleId | null;
  adhesion: Date;
  retardDepuis: Date | null;
  activite: string;
  desc: string;
  besoins: string | null;
  interets: string | null;
  statutJuridique: string | null;
  pays: string | null;
  siteweb: string | null;
  motivation: string | null;
  paiementNote: string | null;
  cover: string | null;
  coverX: number;
  coverY: number;
  photo: string | null;
  logo: string | null;
  video: string | null;
  accueilEnCours: boolean;
  produits: {
    id: string;
    label: string;
    type: "produit" | "service";
    description: string | null;
    prix: string | null;
    photos: string[];
  }[];
};

function versMembre(m: MembreRow): Member {
  return {
    id: m.id,
    type: m.type,
    nom: m.nom,
    secteur: m.secteur,
    ville: m.ville,
    statut: m.statut,
    formule: m.formule,
    adhesion: toISODate(m.adhesion),
    retardDepuis: m.retardDepuis ? toISODate(m.retardDepuis) : null,
    activite: m.activite,
    desc: m.desc,
    besoins: m.besoins ?? undefined,
    interets: m.interets ?? undefined,
    statutJuridique: m.statutJuridique ?? undefined,
    pays: m.pays ?? undefined,
    siteweb: m.siteweb ?? undefined,
    motivation: m.motivation ?? undefined,
    paiementNote: m.paiementNote ?? undefined,
    cover: m.cover,
    cadrage: { x: m.coverX, y: m.coverY },
    photo: m.photo,
    logo: m.logo,
    video: m.video,
    accueilEnCours: m.accueilEnCours,
    produits: m.produits.map((p) => ({
      id: p.id,
      label: p.label,
      type: p.type,
      description: p.description,
      prix: p.prix,
      photos: p.photos,
    })),
  };
}

export async function getMembers(): Promise<Member[]> {
  const rows = await prisma.member.findMany({
    include: membreInclude,
    orderBy: { nom: "asc" },
  });
  return rows.map(versMembre);
}

export async function getMembresAnnuaire(): Promise<Member[]> {
  const rows = await prisma.member.findMany({
    where: { statut: { notIn: HORS_ANNUAIRE } },
    include: membreInclude,
    orderBy: { nom: "asc" },
  });
  return rows.map(versMembre);
}

export async function getMember(id: string): Promise<Member | null> {
  const row = await prisma.member.findUnique({
    where: { id },
    include: membreInclude,
  });
  return row ? versMembre(row) : null;
}

export async function getEvents(): Promise<CanchamEvent[]> {
  const rows = await prisma.event.findMany({
    include: { _count: { select: { participants: true } } },
    orderBy: { date: "asc" },
  });
  return rows.map((e) => ({
    id: e.id,
    titre: e.titre,
    date: toISODate(e.date),
    lieu: e.lieu,
    format: EVENT_FORMAT_LABEL[e.format],
    cap: e.cap,
    inscrits: e._count.participants,
    payant: e.payant,
    prix: e.prix,
    public: e.public,
    prixPublic: e.prixPublic,
    desc: e.desc,
    photo: e.photo,
    debut: e.debut,
    fin: e.fin,
  }));
}

export async function getBilletsPublics(eventId: string, code: string) {
  const base = codeInscription(extraireCode(code));
  if (!estCodeInscription(base)) return [];
  const [membre, lignes] = await Promise.all([
    prisma.registration.findUnique({
      where: { code: base },
      select: { id: true },
    }),
    prisma.attendee.findMany({
      where: {
        eventId,
        OR: [{ code: base }, { code: { startsWith: `${base}-` } }],
      },
      orderBy: [{ createdAt: "asc" }, { code: "asc" }],
      select: {
        nom: true,
        entreprise: true,
        email: true,
        code: true,
        statut: true,
      },
    }),
  ]);
  if (membre) return [];
  return lignes.flatMap((l) => (l.code ? [{ ...l, code: l.code }] : []));
}

export async function getEvent(id: string): Promise<CanchamEvent | null> {
  const e = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: { select: { participants: true } },
      programme: { orderBy: { ordre: "asc" } },
      intervenants: { orderBy: { ordre: "asc" } },
    },
  });
  if (!e) return null;
  return {
    id: e.id,
    titre: e.titre,
    date: toISODate(e.date),
    lieu: e.lieu,
    format: EVENT_FORMAT_LABEL[e.format],
    cap: e.cap,
    inscrits: e._count.participants,
    payant: e.payant,
    prix: e.prix,
    public: e.public,
    prixPublic: e.prixPublic,
    desc: e.desc,
    photo: e.photo,
    debut: e.debut,
    fin: e.fin,
    pourQui: e.pourQui,
    programme: e.programme.map((etape) => ({
      heure: etape.heure,
      titre: etape.titre,
      detail: etape.detail,
    })),
    intervenants: e.intervenants.map((i) => ({
      nom: i.nom,
      fonction: i.fonction,
      entreprise: i.entreprise,
      bio: i.bio,
      photo: i.photo,
    })),
  };
}

export async function getRegistrations(
  memberId: string,
): Promise<Registration[]> {
  const rows = await prisma.registration.findMany({
    where: { memberId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    eventId: r.eventId,
    memberId: r.memberId,
    code: r.code,
    date: toISODate(r.createdAt),
  }));
}

export async function getRegistration(
  eventId: string,
  memberId: string | null,
): Promise<Registration | null> {
  if (!memberId) return null;
  const r = await prisma.registration.findUnique({
    where: { eventId_memberId: { eventId, memberId } },
  });
  if (!r) return null;
  const lignes = await prisma.attendee.findMany({
    where: {
      eventId,
      OR: [{ code: r.code }, { code: { startsWith: `${r.code}-` } }],
    },
    select: { nom: true, code: true, statut: true },
  });
  const rang = (c: string | null) =>
    c === r.code ? 1 : Number(c?.slice(r.code.length + 1)) || 0;
  lignes.sort((a, b) => rang(a.code) - rang(b.code));
  return {
    eventId: r.eventId,
    memberId: r.memberId,
    code: r.code,
    date: toISODate(r.createdAt),
    representants: lignes.length
      ? lignes.map((l) => ({ nom: l.nom, code: l.code ?? r.code }))
      : [{ nom: "", code: r.code }],
    aValider: lignes.some((l) => l.statut === "a_valider"),
  };
}

function commentairesInclude(userId?: string) {
  return {
    orderBy: { createdAt: "asc" as const },
    include: {
      _count: { select: { jaimes: true } },
      jaimes: { where: { userId: userId ?? "" }, select: { id: true } },
    },
  };
}

type CommentRow = {
  id: string;
  auteur: string;
  entreprise: string;
  texte: string;
  date: Date;
  userId: string | null;
  modifieLe: Date | null;
  _count: { jaimes: number };
  jaimes: { id: string }[];
};

const versCommentaires = (cs: CommentRow[], userId?: string): Comment[] =>
  cs.map((c) => ({
    id: c.id,
    auteur: c.auteur,
    entreprise: c.entreprise,
    texte: c.texte,
    date: toISODate(c.date),
    moi: Boolean(userId) && c.userId === userId,
    modifie: Boolean(c.modifieLe),
    jaimes: c._count.jaimes,
    jaimeParMoi: c.jaimes.length > 0,
  }));

function newsInclude(userId?: string) {
  return {
    commentaires: commentairesInclude(userId),
    _count: { select: { jaimes: true } },
    jaimes: { where: { userId: userId ?? "" }, select: { id: true } },
    member: { select: { id: true, nom: true, logo: true } },
  };
}

type NewsRow = Awaited<
  ReturnType<
    typeof prisma.news.findMany<{ include: ReturnType<typeof newsInclude> }>
  >
>[number];

function versNews(n: NewsRow, userId?: string): NewsItem {
  return {
    id: n.id,
    titre: n.titre,
    date: toISODate(n.date),
    cat: NEWS_CAT_LABEL[n.cat],
    media: {
      type: n.mediaType,
      theme: n.mediaTheme,
      duration: n.mediaDuration ?? undefined,
    },
    extrait: n.extrait,
    corps: n.corps,
    public: n.public,
    images: n.images,
    auteur: n.member
      ? {
          membreId: n.member.id,
          membre: n.member.nom,
          logo: n.member.logo,
          personne: n.auteurNom,
        }
      : null,
    libre: n.libre,
    commentaires: versCommentaires(n.commentaires, userId),
    jaimes: n._count.jaimes,
    jaimeParMoi: n.jaimes.length > 0,
  };
}

export async function getNews(userId?: string): Promise<NewsItem[]> {
  const rows = await prisma.news.findMany({
    include: newsInclude(userId),
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((n) => versNews(n, userId));
}

export async function getNewsItem(
  id: string,
  userId?: string,
): Promise<NewsItem | null> {
  const n = await prisma.news.findUnique({
    where: { id },
    include: newsInclude(userId),
  });
  return n ? versNews(n, userId) : null;
}

export interface ActualitePublique {
  id: string;
  titre: string;
  date: string;
  cat: NewsCategory;
  extrait: string;
  corps: string;
  images: string[];
  auteur: string | null;
  libre: boolean;
}

function versActualitePublique(n: {
  id: string;
  titre: string;
  date: Date;
  cat: keyof typeof NEWS_CAT_LABEL;
  extrait: string;
  corps: string;
  images: string[];
  libre: boolean;
  member: { nom: string } | null;
}): ActualitePublique {
  return {
    id: n.id,
    titre: n.titre,
    date: toISODate(n.date),
    cat: NEWS_CAT_LABEL[n.cat],
    extrait: n.extrait,
    corps: n.corps,
    images: n.images,
    auteur: n.member?.nom ?? null,
    libre: n.libre,
  };
}

const CHAMPS_ACTUALITE_PUBLIQUE = {
  id: true,
  titre: true,
  date: true,
  cat: true,
  extrait: true,
  corps: true,
  images: true,
  libre: true,
  member: { select: { nom: true } },
} as const;

export async function getActualitesPubliques(
  n = 3,
): Promise<ActualitePublique[]> {
  const rows = await prisma.news.findMany({
    where: { public: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: n,
    select: CHAMPS_ACTUALITE_PUBLIQUE,
  });
  return rows.map(versActualitePublique);
}

export async function getActualitePublique(
  id: string,
): Promise<ActualitePublique | null> {
  const n = await prisma.news.findFirst({
    where: { id, public: true },
    select: CHAMPS_ACTUALITE_PUBLIQUE,
  });
  return n ? versActualitePublique(n) : null;
}

export async function aDesActualitesPubliques(): Promise<boolean> {
  return (await prisma.news.count({ where: { public: true } })) > 0;
}

export async function dossiersInterdits(
  user: { role: string; memberId: string | null } | null,
): Promise<string[]> {
  if (user?.role === "admin") return [];
  const dossiers = await prisma.dossierRessource.findMany({
    select: { id: true, parentId: true, restreint: true },
  });
  if (!dossiers.some((d) => d.restreint)) return [];

  const ouverts = new Set(
    user?.memberId
      ? (
          await prisma.accesDossier.findMany({
            where: { memberId: user.memberId },
            select: { dossierId: true },
          })
        ).map((a) => a.dossierId)
      : [],
  );
  const enfantsDe = new Map<string, string[]>();
  for (const d of dossiers) {
    if (d.parentId) {
      enfantsDe.set(d.parentId, [...(enfantsDe.get(d.parentId) ?? []), d.id]);
    }
  }
  const interdits = new Set<string>();
  const fermer = (id: string) => {
    if (interdits.has(id)) return;
    interdits.add(id);
    for (const enfant of enfantsDe.get(id) ?? []) fermer(enfant);
  };
  for (const d of dossiers) {
    if (d.restreint && !ouverts.has(d.id)) fermer(d.id);
  }
  return [...interdits];
}

async function visibiliteRessources(
  user: { role: string; memberId: string | null } | null,
): Promise<Prisma.ResourceWhereInput> {
  const interdits = await dossiersInterdits(user);
  if (!interdits.length) return {};
  return {
    AND: [{ OR: [{ dossierId: null }, { dossierId: { notIn: interdits } }] }],
  };
}

export const ORDRE_RESSOURCES = [
  { ordre: "asc" },
  { date: "desc" },
  { id: "asc" },
] satisfies Prisma.ResourceOrderByWithRelationInput[];

export type TriBibliotheque = "date" | "nom";

export async function getResources(
  type?: "gratuit" | "payant",
  dossierId?: string | null | string[],
  recherche?: string,
  tri?: TriBibliotheque,
): Promise<Resource[]> {
  const q = recherche?.trim();
  const user = await utilisateurConnecte();
  const rows = await prisma.resource.findMany({
    where: {
      ...(await visibiliteRessources(user)),
      ...(type ? { type } : {}),
      ...(dossierId !== undefined && !q
        ? {
            dossierId: Array.isArray(dossierId) ? { in: dossierId } : dossierId,
          }
        : {}),
      ...(q ? { titre: { contains: q, mode: "insensitive" as const } } : {}),
    },
    include: { commentaires: commentairesInclude() },
    orderBy:
      tri === "nom"
        ? [{ titre: "asc" }, { id: "asc" }]
        : tri === "date" || q
          ? [{ date: "desc" }, { id: "asc" }]
          : ORDRE_RESSOURCES,
  });

  const payantes = rows.filter((r) => r.type === "payant").map((r) => r.id);
  const ouverts =
    user && user.role !== "admin" && user.memberId && payantes.length
      ? new Set(
          (
            await prisma.accesRessource.findMany({
              where: { memberId: user.memberId, resourceId: { in: payantes } },
              select: { resourceId: true },
            })
          ).map((a) => a.resourceId),
        )
      : new Set<string>();
  const terminees =
    user && user.role !== "admin" && rows.length
      ? new Set(
          (
            await prisma.lectureRessource.findMany({
              where: {
                userId: user.id,
                resourceId: { in: rows.map((r) => r.id) },
              },
              select: { resourceId: true },
            })
          ).map((l) => l.resourceId),
        )
      : new Set<string>();
  return rows.map((r) => ({
    id: r.id,
    titre: r.titre,
    cat: RESOURCE_CAT_LABEL[r.cat],
    fmt: RESOURCE_FMT_LABEL[r.fmt],
    taille: r.taille,
    date: toISODate(r.date),
    type: r.type,
    prix: r.prix,
    terminee: terminees.has(r.id),
    description: r.description,
    commentaires: versCommentaires(r.commentaires),
    cover: r.cover,
    dossierId: r.dossierId,
    pret:
      r.fmt === "page" ||
      (Boolean(r.fichier) && (r.fmt === "video" || Boolean(r.pages))),
    accessible:
      r.type === "gratuit" || user?.role === "admin" || ouverts.has(r.id),
  }));
}

export async function getRessourceLisible(id: string): Promise<{
  titre: string;
  fmt: "pdf" | "docx" | "video" | "image" | "page";
  taille: string;
  description: string | null;
  blocs: Bloc[];
  dossierId: string | null;
  type: "gratuit" | "payant";
  prix: number;
  terminee: boolean;
} | null> {
  const user = await utilisateurConnecte();
  const r = await prisma.resource.findFirst({
    where: { id, ...(await visibiliteRessources(user)) },
    select: {
      titre: true,
      fmt: true,
      taille: true,
      description: true,
      contenu: true,
      dossierId: true,
      type: true,
      prix: true,
      lectures: user
        ? { where: { userId: user.id }, select: { id: true } }
        : false,
    },
  });
  if (!r) return null;
  const { lectures, contenu, ...reste } = r;
  return {
    ...reste,
    blocs: r.fmt === "page" ? blocsEnregistres(contenu) : [],
    terminee: Boolean(lectures?.length),
  };
}

const CHAMPS_DOSSIER = {
  id: true,
  nom: true,
  parentId: true,
  restreint: true,
  cover: true,
  auteurNom: true,
  auteurRole: true,
  auteurBio: true,
  auteurPhoto: true,
  acces: { select: { memberId: true } },
} as const;

function versDossier(
  d: {
    id: string;
    nom: string;
    parentId: string | null;
    restreint: boolean;
    cover: string | null;
    auteurNom: string | null;
    auteurRole: string | null;
    auteurBio: string | null;
    auteurPhoto: string | null;
    acces: { memberId: string }[];
  },
  compte: { dossiers: number; ressources: number },
  equipe: boolean,
): DossierRessource {
  return {
    id: d.id,
    nom: d.nom,
    parentId: d.parentId,
    dossiers: compte.dossiers,
    ressources: compte.ressources,
    cover: d.cover,
    auteur: d.auteurNom
      ? {
          nom: d.auteurNom,
          role: d.auteurRole,
          bio: d.auteurBio,
          photo: d.auteurPhoto,
        }
      : null,
    restreint: d.restreint,
    acces: equipe ? d.acces.map((a) => a.memberId) : [],
  };
}

export async function getSousDossiers(
  parentId: string | null,
  tri: TriBibliotheque = "nom",
): Promise<DossierRessource[]> {
  return listerDossiers({ parentId }, tri);
}

export async function rechercherDossiers(
  recherche: string,
  tri: TriBibliotheque = "nom",
): Promise<DossierRessource[]> {
  const q = recherche.trim();
  if (!q) return [];
  return listerDossiers({ nom: { contains: q, mode: "insensitive" } }, tri);
}

async function listerDossiers(
  ou: Prisma.DossierRessourceWhereInput,
  tri: TriBibliotheque,
): Promise<DossierRessource[]> {
  const user = await utilisateurConnecte();
  const equipe = user?.role === "admin";
  const interdits = await dossiersInterdits(user);
  const visibles = interdits.length ? { id: { notIn: interdits } } : {};
  const rows = await prisma.dossierRessource.findMany({
    where: { AND: [ou, visibles] },
    orderBy:
      tri === "date"
        ? [{ updatedAt: "desc" }, { nom: "asc" }]
        : [{ nom: "asc" }],
    select: {
      ...CHAMPS_DOSSIER,
      _count: {
        select: { enfants: { where: visibles }, ressources: true },
      },
    },
  });
  return rows.map((d) =>
    versDossier(
      d,
      { dossiers: d._count.enfants, ressources: d._count.ressources },
      equipe,
    ),
  );
}

export async function getSectionsDossier(
  parentId: string,
): Promise<SectionDossier[]> {
  const user = await utilisateurConnecte();
  const equipe = user?.role === "admin";
  const interdits = new Set(await dossiersInterdits(user));
  const tous = (
    await prisma.dossierRessource.findMany({
      orderBy: { nom: "asc" },
      select: CHAMPS_DOSSIER,
    })
  ).filter((d) => !interdits.has(d.id));

  const enfantsDe = new Map<string, typeof tous>();
  for (const d of tous) {
    if (d.parentId) {
      enfantsDe.set(d.parentId, [...(enfantsDe.get(d.parentId) ?? []), d]);
    }
  }
  const ids: string[] = [];
  const collecter = (id: string) => {
    for (const d of enfantsDe.get(id) ?? []) {
      ids.push(d.id);
      collecter(d.id);
    }
  };
  collecter(parentId);
  if (!ids.length) return [];

  const parDossier = new Map<string, Resource[]>();
  for (const r of await getResources(undefined, ids)) {
    if (!r.dossierId) continue;
    parDossier.set(r.dossierId, [...(parDossier.get(r.dossierId) ?? []), r]);
  }

  const construire = (id: string): SectionDossier[] =>
    (enfantsDe.get(id) ?? []).map((d) => {
      const sections = construire(d.id);
      const ressources = parDossier.get(d.id) ?? [];
      return {
        dossier: versDossier(
          d,
          { dossiers: sections.length, ressources: ressources.length },
          equipe,
        ),
        ressources,
        sections,
      };
    });
  return construire(parentId);
}

export async function getDossierOuvert(
  id: string,
): Promise<DossierRessource | null> {
  const user = await utilisateurConnecte();
  const d = await prisma.dossierRessource.findUnique({
    where: { id },
    select: {
      ...CHAMPS_DOSSIER,
      _count: { select: { enfants: true, ressources: true } },
    },
  });
  if (!d) return null;
  return versDossier(
    d,
    { dossiers: d._count.enfants, ressources: d._count.ressources },
    user?.role === "admin",
  );
}

export async function getFilDossier(
  id: string,
): Promise<MaillonDossier[] | null> {
  const fil: MaillonDossier[] = [];
  let courant: string | null = id;

  for (let i = 0; courant && i < 20; i++) {
    const d: { id: string; nom: string; parentId: string | null } | null =
      await prisma.dossierRessource.findUnique({
        where: { id: courant },
        select: { id: true, nom: true, parentId: true },
      });
    if (!d) return fil.length ? fil.reverse() : null;
    fil.push({ id: d.id, nom: d.nom });
    courant = d.parentId;
  }
  const interdits = new Set(
    await dossiersInterdits(await utilisateurConnecte()),
  );
  if (fil.some((m) => interdits.has(m.id))) return null;
  return fil.reverse();
}

export async function getArborescenceDossiers(): Promise<
  { id: string; nom: string; profondeur: number; restreint: boolean }[]
> {
  const tous = await prisma.dossierRessource.findMany({
    orderBy: { nom: "asc" },
    select: { id: true, nom: true, parentId: true, restreint: true },
  });

  const enfantsDe = new Map<string | null, typeof tous>();
  for (const d of tous) {
    const cle = d.parentId;
    enfantsDe.set(cle, [...(enfantsDe.get(cle) ?? []), d]);
  }

  const sortie: {
    id: string;
    nom: string;
    profondeur: number;
    restreint: boolean;
  }[] = [];
  const descendre = (parent: string | null, profondeur: number) => {
    for (const d of enfantsDe.get(parent) ?? []) {
      sortie.push({ id: d.id, nom: d.nom, profondeur, restreint: d.restreint });
      descendre(d.id, profondeur + 1);
    }
  };
  descendre(null, 0);
  return sortie;
}

const CHAMPS_MEMBRE_OFFRE = {
  nom: true,
  cover: true,
  coverX: true,
  coverY: true,
  secteur: true,
  ville: true,
  logo: true,
  siteweb: true,
  users: {
    where: { contactPrincipal: true },
    take: 1,
    select: { nom: true, fonction: true, email: true, tel: true },
  },
} as const;

export async function getOffers(): Promise<Offer[]> {
  const rows = await prisma.offer.findMany({
    include: { member: { select: CHAMPS_MEMBRE_OFFRE } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(versOffre);
}

export async function getDernieresOffres(
  n = 3,
  lieu: Exclude<EmplacementOffre, "partout"> = "tableau_de_bord",
): Promise<Offer[]> {
  const rows = await prisma.offer.findMany({
    where: { emplacement: { in: [lieu, "partout"] } },
    include: { member: { select: CHAMPS_MEMBRE_OFFRE } },
    orderBy: { createdAt: "desc" },
    take: n,
  });
  return rows.map(versOffre);
}

function versOffre(o: {
  id: string;
  memberId: string | null;
  titre: string;
  desc: string;
  image: string | null;
  lien: string | null;
  prix: string | null;
  emplacement: EmplacementOffre;
  member: {
    nom: string;
    cover: string | null;
    coverX: number;
    coverY: number;
    secteur: string;
    ville: string;
    logo: string | null;
    siteweb: string | null;
    users: {
      nom: string;
      fonction: string;
      email: string;
      tel: string | null;
    }[];
  } | null;
}): Offer {
  if (!o.member) {
    return {
      id: o.id,
      membreId: null,
      membre: "CanCham Madagascar",
      titre: o.titre,
      desc: o.desc,
      image: o.image,
      cover: o.image,
      lien: o.lien,
      prix: o.prix,
      emplacement: o.emplacement,
      membreSecteur: "Chambre de commerce et de coopération",
      membreVille: "Antananarivo",
      membreLogo: "/marque/sigle.png",
      membreSite: COORDONNEES.site,
      contact: {
        nom: "Équipe CanCham",
        fonction: "Chambre de Commerce et de Coopération Canada–Madagascar",
        email: COORDONNEES.email,
        tel: COORDONNEES.telephone,
      },
    };
  }
  return {
    id: o.id,
    membreId: o.memberId,
    membre: o.member.nom,
    titre: o.titre,
    desc: o.desc,
    image: o.image,
    cover: o.image ?? o.member.cover,
    cadrage:
      !o.image && o.member.cover
        ? { x: o.member.coverX, y: o.member.coverY }
        : undefined,
    lien: o.lien,
    prix: o.prix,
    emplacement: o.emplacement,
    membreSecteur: o.member.secteur,
    membreVille: o.member.ville,
    membreLogo: o.member.logo,
    membreSite: o.member.siteweb,
    contact: o.member.users[0] ?? null,
  };
}

export async function getServices(): Promise<CanchamService[]> {
  const rows = await prisma.canchamService.findMany({
    orderBy: { ordre: "asc" },
  });
  return rows.map((s) => ({
    id: s.id,
    titre: s.titre,
    desc: s.desc,
    type: s.type,
    prix: s.prix,
    icon: s.icon,
    image: s.image,
    lien: s.lien,
  }));
}

export async function getInvoices(memberId?: string): Promise<Invoice[]> {
  const rows = await prisma.invoice.findMany({
    where: memberId ? { memberId } : undefined,
    include: { member: { select: { nom: true } } },
    orderBy: { date: "desc" },
  });
  return rows.map((f) => ({
    id: f.id,
    numero: f.numero,
    date: toISODate(f.date),
    objet: f.objet,
    montant: f.montant,
    devise: f.devise,
    statut: f.statut,
    membreId: f.memberId,
    membre: nomFacture(f),
  }));
}

export async function getEncaisse(): Promise<Record<"MGA" | "CAD", number>> {
  const rows = await prisma.invoice.groupBy({
    by: ["devise"],
    where: { statut: "payee" },
    _sum: { montant: true },
  });
  const total = (d: "MGA" | "CAD") =>
    rows.find((r) => r.devise === d)?._sum.montant ?? 0;
  return { MGA: total("MGA"), CAD: total("CAD") };
}

const OBJET_COTISATION = {
  startsWith: "Cotisation",
  mode: "insensitive",
} as const;

export async function getDernierReglementCotisation(
  memberId: string,
): Promise<string | null> {
  const derniere = await prisma.invoice.findFirst({
    where: { memberId, statut: "payee", objet: OBJET_COTISATION },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  return derniere ? toISODate(derniere.date) : null;
}

export async function getAgenda(
  { userId, memberId }: { userId: string; memberId: string | null },
  du: string,
  au: string,
): Promise<ElementAgenda[]> {
  const aujourdhui = aujourdhuiISO();
  const periode = { gte: jourBase(du), lte: jourBase(au) };

  const [evenements, factures, membre, dernierReglement, rappels, rendezvous] =
    await Promise.all([
      prisma.event.findMany({
        where: { date: periode },
        select: {
          id: true,
          titre: true,
          date: true,
          debut: true,
          fin: true,
          lieu: true,
          format: true,
          inscriptions: memberId
            ? { where: { memberId }, select: { id: true } }
            : false,
        },
      }),
      memberId
        ? prisma.invoice.findMany({
            where: {
              memberId,
              statut: "envoyee",
              date: {
                gte: jourBase(ajouterJours(du, -DELAI_REGLEMENT_JOURS)),
                lte: jourBase(ajouterJours(au, -DELAI_REGLEMENT_JOURS)),
              },
            },
            select: {
              id: true,
              numero: true,
              date: true,
              objet: true,
              montant: true,
              devise: true,
            },
          })
        : [],
      memberId
        ? prisma.member.findUnique({
            where: { id: memberId },
            select: { statut: true, adhesion: true, retardDepuis: true },
          })
        : null,
      memberId ? getDernierReglementCotisation(memberId) : null,
      rappelsAgenda(userId, du, au),
      prisma.rendezvous.findMany({
        where: { userId, annuleLe: null, jour: periode },
        select: {
          id: true,
          jour: true,
          debut: true,
          fin: true,
          motif: true,
          type: { select: { titre: true } },
        },
      }),
    ]);

  const elements: ElementAgenda[] = [];

  for (const e of evenements) {
    const inscrit = Array.isArray(e.inscriptions) && e.inscriptions.length > 0;
    elements.push({
      id: `evenement-${e.id}`,
      type: inscrit ? "inscription" : "evenement",
      titre: e.titre,
      jour: toISODate(e.date),
      debut: e.debut,
      fin: e.fin,
      lieu: e.lieu,
      detail: EVENT_FORMAT_LABEL[e.format],
      href: `/membre/evenements/${e.id}`,
    });
  }

  for (const r of rendezvous) {
    elements.push({
      id: `rendezvous-${r.id}`,
      type: "rendezvous",
      titre: r.type.titre,
      jour: toISODate(r.jour),
      debut: r.debut,
      fin: r.fin,
      detail: r.motif ?? "Avec l’équipe CanCham",
      href: "/membre/rendez-vous",
    });
  }

  for (const f of factures) {
    const jour = echeanceFacture(toISODate(f.date));
    elements.push({
      id: `facture-${f.id}`,
      type: "echeance",
      titre: `Facture ${f.numero} à régler`,
      jour,
      debut: null,
      fin: null,
      detail: `${f.objet} · ${fmtMontant(f.montant, f.devise)}`,
      href: `/membre/cotisations/${f.id}`,
      urgent: jour < aujourdhui,
    });
  }

  if (membre && !ADHESION_PENDING.includes(membre.statut)) {
    const jour = renouvellementCotisation({
      factures: [],
      adhesion: dernierReglement ?? toISODate(membre.adhesion),
      aJour: true,
    });
    const reglee =
      jour !== null && jour < aujourdhui && membre.statut === "a_jour";
    if (jour && jour >= du && jour <= au) {
      elements.push({
        id: "cotisation",
        type: "echeance",
        titre: "Renouvellement de la cotisation",
        jour,
        debut: null,
        fin: null,
        detail: reglee ? "Réglée" : "Cotisation annuelle",
        href: "/membre/cotisations",
        fait: reglee,
        urgent: !reglee && jour < aujourdhui,
      });
    }
  }

  if (membre?.statut === "en_retard" && membre.retardDepuis) {
    const jour = dateRestriction(toISODate(membre.retardDepuis));
    if (jour >= du && jour <= au) {
      elements.push({
        id: "restriction",
        type: "echeance",
        titre: "Accès restreint si la cotisation n’est pas réglée",
        jour,
        debut: null,
        fin: null,
        detail: `Au-delà de ${RETARD_BLOCAGE_JOURS} jours de retard`,
        href: "/membre/cotisations",
        urgent: true,
      });
    }
  }

  return trierElements([...elements, ...rappels]);
}

async function rappelsAgenda(
  userId: string,
  du: string,
  au: string,
): Promise<ElementAgenda[]> {
  const rows = await prisma.rappel.findMany({
    where: { userId, jour: { gte: jourBase(du), lte: jourBase(au) } },
    select: {
      id: true,
      titre: true,
      note: true,
      jour: true,
      heure: true,
      fait: true,
    },
  });
  return rows.map((r) => ({
    id: `rappel-${r.id}`,
    type: "rappel",
    titre: r.titre,
    jour: toISODate(r.jour),
    debut: r.heure,
    fin: null,
    detail: r.note,
    href: null,
    fait: r.fait,
    rappel: { id: r.id, note: r.note },
  }));
}

export async function getAgendaEquipe(
  userId: string,
  du: string,
  au: string,
): Promise<ElementAgenda[]> {
  const aujourdhui = aujourdhuiISO();
  const periode = { gte: jourBase(du), lte: jourBase(au) };
  const avant = (jours: number) => ({
    gte: jourBase(ajouterJours(du, -jours)),
    lte: jourBase(ajouterJours(au, -jours)),
  });

  const [evenements, factures, retards, rappels, rendezvous] =
    await Promise.all([
      prisma.event.findMany({
        where: { date: periode },
        select: {
          id: true,
          titre: true,
          date: true,
          debut: true,
          fin: true,
          lieu: true,
          format: true,
          cap: true,
          _count: { select: { participants: true } },
        },
      }),
      prisma.invoice.findMany({
        where: { statut: "envoyee", date: avant(DELAI_REGLEMENT_JOURS) },
        select: {
          id: true,
          numero: true,
          date: true,
          objet: true,
          montant: true,
          devise: true,
          destinataireNom: true,
          member: { select: { nom: true } },
        },
      }),
      prisma.member.findMany({
        where: {
          statut: "en_retard",
          retardDepuis: avant(RETARD_BLOCAGE_JOURS + 1),
        },
        select: { id: true, nom: true, retardDepuis: true },
      }),
      rappelsAgenda(userId, du, au),
      prisma.rendezvous.findMany({
        where: { annuleLe: null, jour: periode },
        select: {
          id: true,
          jour: true,
          debut: true,
          fin: true,
          motif: true,
          type: { select: { titre: true } },
          user: { select: { nom: true } },
          member: { select: { nom: true } },
        },
      }),
    ]);

  const elements: ElementAgenda[] = [];

  for (const e of evenements) {
    elements.push({
      id: `evenement-${e.id}`,
      type: "evenement",
      titre: e.titre,
      jour: toISODate(e.date),
      debut: e.debut,
      fin: e.fin,
      lieu: e.lieu,
      detail: `${EVENT_FORMAT_LABEL[e.format]} · ${e._count.participants}/${e.cap} inscrits`,
      href: `/admin/evenements/${e.id}`,
    });
  }

  for (const f of factures) {
    const jour = echeanceFacture(toISODate(f.date));
    elements.push({
      id: `facture-${f.id}`,
      type: "echeance",
      titre: `Facture ${f.numero} · ${nomFacture(f)}`,
      jour,
      debut: null,
      fin: null,
      detail: `${f.objet} · ${fmtMontant(f.montant, f.devise)}`,
      href: `/admin/paiements/${f.id}`,
      urgent: jour < aujourdhui,
    });
  }

  for (const r of rendezvous) {
    elements.push({
      id: `rendezvous-${r.id}`,
      type: "rendezvous",
      titre: `${r.type.titre} · ${r.user.nom}`,
      jour: toISODate(r.jour),
      debut: r.debut,
      fin: r.fin,
      detail: [r.member?.nom, r.motif].filter(Boolean).join(" · ") || null,
      href: "/admin/rendez-vous",
    });
  }

  for (const m of retards) {
    elements.push({
      id: `restriction-${m.id}`,
      type: "echeance",
      titre: `Accès restreint : ${m.nom}`,
      jour: dateRestriction(toISODate(m.retardDepuis!)),
      debut: null,
      fin: null,
      detail: `Cotisation non réglée après ${RETARD_BLOCAGE_JOURS} jours de retard`,
      href: `/admin/membres/${m.id}`,
      urgent: true,
    });
  }

  return trierElements([...elements, ...rappels]);
}

const PERSONNE_FIL = {
  id: true,
  nom: true,
  fonction: true,
  email: true,
  tel: true,
  photo: true,
  role: true,
  member: { select: { id: true, nom: true, siteweb: true } },
} as const;

const EQUIPE = "Équipe CanCham";

export async function getThreads(user: {
  id: string;
  role: string;
}): Promise<MessageThread[]> {
  const rows = await prisma.messageThread.findMany({
    where: { participants: { some: { userId: user.id } } },
    include: {
      participants: {
        orderBy: { ajouteLe: "asc" },
        include: { user: { select: PERSONNE_FIL } },
      },
      messages: {
        orderBy: { sentAt: "asc" },
        include: { piecesJointes: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  const cote = user.role === "admin" ? "equipe" : "membre";

  const fils = rows.map((t): MessageThread => {
    const moi = t.participants.find((p) => p.userId === user.id);
    const autres = t.participants
      .filter((p) => p.userId !== user.id)
      .map((p) => p.user);

    const entrepriseDe = (u: (typeof autres)[number]) =>
      u.member?.nom ?? (u.role === "admin" ? EQUIPE : "");

    let entete: Pick<
      MessageThread,
      "nom" | "sousTitre" | "avatar" | "membre" | "contact"
    >;
    if (t.type === "groupe") {
      entete = {
        nom: t.nom ?? "Groupe",
        sousTitre: `${t.participants.length} participant${t.participants.length > 1 ? "s" : ""}`,
        avatar: t.avatar,
        membre: null,
        contact: null,
      };
    } else if (t.equipe && cote === "membre") {
      entete = {
        nom: t.nom ?? EQUIPE,
        sousTitre: "Support membres",
        avatar: LOGO_EQUIPE,
        membre: null,
        contact: null,
      };
    } else if (visiteurDuFil(t.visiteur)) {
      const v = visiteurDuFil(t.visiteur)!;
      entete = {
        nom: v.nom,
        sousTitre: ["Visiteur du site", v.email, v.telephone]
          .filter(Boolean)
          .join(" · "),
        avatar: null,
        membre: null,
        contact: null,
      };
    } else {
      const enFace = t.equipe
        ? (autres.find((u) => u.role !== "admin") ?? autres[0])
        : autres[0];
      entete = enFace
        ? {
            nom: enFace.nom,
            sousTitre: [
              t.equipe ? "Assistance" : null,
              entrepriseDe(enFace),
              t.equipe ? null : enFace.fonction,
            ]
              .filter(Boolean)
              .join(" · "),
            avatar: enFace.photo,
            membre: enFace.member,
            contact: {
              id: enFace.id,
              nom: enFace.nom,
              fonction: enFace.fonction,
              email: enFace.email,
              tel: enFace.tel,
              photo: enFace.photo,
            },
          }
        : {
            nom: "Conversation",
            sousTitre: "",
            avatar: null,
            membre: null,
            contact: null,
          };
    }

    return {
      id: t.id,
      type: t.type,
      equipe: t.equipe,
      ...entete,
      init: initialesDe(entete.nom),
      participants: t.participants.map(({ user: u }) => ({
        id: u.id,
        nom: u.nom,
        fonction: u.fonction,
        entreprise: entrepriseDe(u),
        photo: u.photo,
      })),
      unread: t.messages.filter(
        (m) =>
          !m.supprimeLe &&
          m.userId !== user.id &&
          (!moi?.luLe || m.sentAt > moi.luLe),
      ).length,
      messages: t.messages.map((m) => ({
        id: m.id,
        de: m.auteur,
        moi: m.userId === user.id,
        equipe:
          t.participants.find((p) => p.userId === m.userId)?.user.role ===
          "admin",
        texte: m.supprimeLe ? "" : m.texte,
        heure: heureRelative(m.sentAt),
        envoyeLe: m.sentAt.toISOString(),
        modifie: Boolean(m.modifieLe),
        supprime: Boolean(m.supprimeLe),
        transfere: m.transfere,
        pieces: m.piecesJointes.map((p) => ({
          id: p.id,
          nom: p.nom,
          type: p.type,
          taille: p.taille,
        })),
      })),
    };
  });

  const activite = (t: MessageThread) =>
    t.messages.at(-1)?.envoyeLe ??
    rows.find((r) => r.id === t.id)!.createdAt.toISOString();
  return fils.sort((a, b) => activite(b).localeCompare(activite(a)));
}

export async function getUnreadTotal(userId: string): Promise<number> {
  const [{ n }] = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n
    FROM messages m
    JOIN participants_fils p
      ON p."threadId" = m."threadId" AND p."userId" = ${userId}
    WHERE m."supprimeLe" IS NULL
      AND m."userId" IS DISTINCT FROM ${userId}
      AND (p."luLe" IS NULL OR m."sentAt" > p."luLe")`;
  return n;
}

export async function getMemberStats() {
  const rows = await prisma.member.groupBy({
    by: ["statut"],
    _count: { _all: true },
  });
  const par = (s: string) => rows.find((r) => r.statut === s)?._count._all ?? 0;
  return {
    total: rows.reduce((sum, r) => sum + r._count._all, 0),
    aJour: par("a_jour"),
    enAttente: par("en_attente"),
    enRetard: par("en_retard"),
    candidatures: par("candidature"),
  };
}

export interface ResultatRecherche {
  type:
    "membre" | "contact" | "evenement" | "actualite" | "ressource" | "facture";
  id: string;
  titre: string;
  detail: string;
  href: string;
}

export async function rechercher(
  q: string,
  space: Space,
): Promise<ResultatRecherche[]> {
  const terme = q.trim();
  if (terme.length < 2) return [];

  const like = { contains: terme, mode: "insensitive" } as const;
  const base = space === "admin" ? "/admin" : "/membre";

  const admin = space === "admin";
  const visibles = await visibiliteRessources(await utilisateurConnecte());
  // Actualités retirées pour l'instant : remettre « actualites » ici, la requête et le bloc plus bas
  const [membres, evenements, ressources, contacts, factures] =
    await Promise.all([
      prisma.member.findMany({
        where: {
          ...(space === "admin" ? {} : { statut: { notIn: HORS_ANNUAIRE } }),
          OR: [
            { nom: like },
            { secteur: like },
            { ville: like },
            { activite: like },
            { desc: like },
          ],
        },
        select: { id: true, nom: true, secteur: true, ville: true },
        take: 8,
        orderBy: { nom: "asc" },
      }),
      prisma.event.findMany({
        where: { OR: [{ titre: like }, { lieu: like }, { desc: like }] },
        select: { id: true, titre: true, lieu: true, date: true },
        take: 8,
        orderBy: { date: "desc" },
      }),
      // prisma.news.findMany({
      //   where: { OR: [{ titre: like }, { extrait: like }, { corps: like }] },
      //   select: { id: true, titre: true, date: true },
      //   take: 8,
      //   orderBy: { date: "desc" },
      // }),
      prisma.resource.findMany({
        where: { ...visibles, titre: like },
        select: { id: true, titre: true, taille: true, type: true },
        take: 8,
        orderBy: { date: "desc" },
      }),
      admin
        ? prisma.user.findMany({
            where: {
              role: "membre",
              memberId: { not: null },
              OR: [{ nom: like }, { email: like }, { tel: like }],
            },
            select: {
              id: true,
              nom: true,
              fonction: true,
              email: true,
              memberId: true,
              member: { select: { nom: true } },
            },
            take: 8,
            orderBy: { nom: "asc" },
          })
        : Promise.resolve([]),
      admin
        ? prisma.invoice.findMany({
            where: {
              OR: [
                { numero: like },
                { objet: like },
                { member: { nom: like } },
                { destinataireNom: like },
              ],
            },
            select: {
              id: true,
              numero: true,
              objet: true,
              statut: true,
              destinataireNom: true,
              member: { select: { nom: true } },
            },
            take: 8,
            orderBy: { date: "desc" },
          })
        : Promise.resolve([]),
    ]);

  return [
    ...membres.map((m) => ({
      type: "membre" as const,
      id: m.id,
      titre: m.nom,
      detail: `${m.secteur} · ${m.ville}`,
      href:
        space === "admin"
          ? `/admin/membres/${m.id}`
          : `/membre/annuaire/${m.id}`,
    })),
    ...evenements.map((e) => ({
      type: "evenement" as const,
      id: e.id,
      titre: e.titre,
      detail: `${e.lieu} · ${toISODate(e.date)}`,
      href: `${base}/evenements/${e.id}`,
    })),
    // ...actualites.map((n) => ({
    //   type: "actualite" as const,
    //   id: n.id,
    //   titre: n.titre,
    //   detail: toISODate(n.date),
    //   href: `${base}/actualites/${n.id}`,
    // })),
    ...ressources.map((r) => ({
      type: "ressource" as const,
      id: r.id,
      titre: r.titre,
      detail: `${r.taille} · ${r.type === "payant" ? "payante" : "incluse"}`,
      href: admin ? `/admin/ressources/${r.id}/modifier` : `${base}/ressources`,
    })),
    ...contacts.map((c) => ({
      type: "contact" as const,
      id: c.id,
      titre: c.nom,
      detail: `${c.fonction} · ${c.member?.nom ?? "—"} · ${c.email}`,
      href: `/admin/membres/${c.memberId}`,
    })),
    ...factures.map((f) => ({
      type: "facture" as const,
      id: f.id,
      titre: `${f.numero} · ${nomFacture(f)}`,
      detail: `${f.objet} · ${f.statut === "payee" ? "payée" : "à régler"}`,
      href: `/admin/paiements/${f.id}`,
    })),
  ];
}

export interface StatsPubliques {
  membres: number;
  secteurs: number;
  villes: number;
  evenementsAVenir: number;
}

export async function getStatsPubliques(): Promise<StatsPubliques> {
  const [membres, groupes, evenements] = await Promise.all([
    prisma.member.count({ where: { statut: { notIn: HORS_ANNUAIRE } } }),
    prisma.member.findMany({
      where: { statut: { notIn: HORS_ANNUAIRE } },
      select: { secteur: true, ville: true },
    }),
    prisma.event.count({ where: { date: { gte: jourBase() }, public: true } }),
  ]);

  return {
    membres,
    secteurs: new Set(
      groupes.map((g) => g.secteur).filter((s) => s !== PROVISOIRE.secteur),
    ).size,
    villes: new Set(groupes.map((g) => g.ville)).size,
    evenementsAVenir: evenements,
  };
}

export async function getProchainsEvenements(n = 3): Promise<CanchamEvent[]> {
  const rows = await prisma.event.findMany({
    where: { date: { gte: jourBase() }, public: true },
    include: { _count: { select: { participants: true } } },
    orderBy: { date: "asc" },
    take: n,
  });
  return rows.map((e) => ({
    id: e.id,
    titre: e.titre,
    date: toISODate(e.date),
    lieu: e.lieu,
    format: EVENT_FORMAT_LABEL[e.format],
    cap: e.cap,
    inscrits: e._count.participants,
    payant: e.payant,
    prix: e.prix,
    public: e.public,
    prixPublic: e.prixPublic,
    desc: e.desc,
    photo: e.photo,
    debut: e.debut,
    fin: e.fin,
  }));
}

export async function getProchainEvenementIntitule(
  nom: string,
): Promise<CanchamEvent | null> {
  const e = await prisma.event.findFirst({
    where: {
      public: true,
      date: { gte: jourBase() },
      titre: { contains: nom, mode: "insensitive" },
    },
    include: { _count: { select: { participants: true } } },
    orderBy: { date: "asc" },
  });
  if (!e) return null;
  return {
    id: e.id,
    titre: e.titre,
    date: toISODate(e.date),
    lieu: e.lieu,
    format: EVENT_FORMAT_LABEL[e.format],
    cap: e.cap,
    inscrits: e._count.participants,
    payant: e.payant,
    prix: e.prix,
    public: e.public,
    prixPublic: e.prixPublic,
    desc: e.desc,
    photo: e.photo,
    debut: e.debut,
    fin: e.fin,
  };
}

export async function getEntreprisesInscrites(
  eventId: string,
  n = 12,
): Promise<{ noms: string[]; total: number }> {
  const rows = await prisma.attendee.findMany({
    where: { eventId },
    select: { entreprise: true },
    distinct: ["entreprise"],
    orderBy: { entreprise: "asc" },
  });
  const noms = rows.map((r) => r.entreprise);
  return { noms: noms.slice(0, n), total: noms.length };
}

export async function getContacts(memberId: string): Promise<Contact[]> {
  const rows = await prisma.user.findMany({
    where: { memberId, role: "membre" },
    orderBy: [{ contactPrincipal: "desc" }, { createdAt: "asc" }],
  });
  return rows.map((u) => ({
    id: u.id,
    nom: u.nom,
    fonction: u.fonction,
    email: u.email,
    tel: u.tel,
    photo: u.photo,
    principal: u.contactPrincipal,
    invitationEnAttente: !u.motDePasse,
  }));
}

export async function getMembresJoignables(
  user: { id: string; memberId: string | null },
  tous = false,
) {
  const [membres, fils] = await Promise.all([
    prisma.member.findMany({
      where: {
        ...(tous ? {} : { statut: { in: ["a_jour", "en_retard"] as const } }),
        ...(user.memberId ? { id: { not: user.memberId } } : {}),
      },
      select: { id: true, nom: true, secteur: true, logo: true, photo: true },
      orderBy: { nom: "asc" },
    }),
    prisma.messageThread.findMany({
      where: {
        type: "individuel",
        equipe: false,
        participants: { some: { userId: user.id } },
      },
      select: {
        participants: {
          where: { userId: { not: user.id } },
          select: { user: { select: { memberId: true } } },
        },
      },
    }),
  ]);

  const dejaEnContact = new Set(
    fils.flatMap((f) => f.participants.map((p) => p.user.memberId)),
  );
  const disponibles = membres.filter((m) => !dejaEnContact.has(m.id));

  const referents = new Map(
    (
      await prisma.user.findMany({
        where: {
          memberId: { in: disponibles.map((m) => m.id) },
          contactPrincipal: true,
        },
        select: { memberId: true, nom: true },
      })
    ).map((u) => [u.memberId, u.nom]),
  );

  return disponibles.map((m) => ({
    id: m.id,
    nom: m.nom,
    secteur: m.secteur,
    vignette: m.photo ?? m.logo,
    referent: referents.get(m.id) ?? null,
  }));
}

export async function getPersonnesJoignables(
  userId: string,
): Promise<Personne[]> {
  const rows = await prisma.user.findMany({
    where: critereJoignable(userId),
    select: {
      id: true,
      nom: true,
      fonction: true,
      photo: true,
      role: true,
      member: { select: { nom: true } },
    },
    orderBy: { nom: "asc" },
  });
  return rows.map((u) => ({
    id: u.id,
    nom: u.nom,
    fonction: u.fonction,
    entreprise: u.member?.nom ?? (u.role === "admin" ? EQUIPE : ""),
    photo: u.photo,
  }));
}
