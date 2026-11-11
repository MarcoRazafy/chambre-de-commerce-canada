"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { OFFRE_CANCHAM, estEmplacementOffre } from "@/lib/offres";
import { RESOURCE_CAT_DB } from "@/lib/enums";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { jourBase, jourSaisi } from "@/lib/format";
import { estCheminFerme, normaliserLien, normaliserSite } from "@/lib/liens";
import { ADRESSE_PLATEFORME, urlPublique } from "@/lib/courriel";
import { headers } from "next/headers";
import { exigerEquipe } from "@/lib/autorisations";
import { getCurrentUser } from "@/lib/session";
import { verifierAcces } from "@/lib/acces-ressources";
import {
  FichierRefuse,
  couvertureDepuisBloc,
  couvertureDepuisPage,
  dupliquerRessource,
  effacerRessource,
  menageBlocs,
  recevoirFichierBloc,
  recevoirRessource,
  type FichierRecu,
} from "@/lib/stockage-ressources";
import { ImageRefusee, enregistrerImage } from "@/lib/uploads";
import {
  envoiEnAttente,
  fichierRecu,
  fichiersRecus,
} from "@/lib/televersements";
import {
  blocsEnregistres,
  estJeton,
  etiquettePage,
  fichiersDesBlocs,
  lireBlocs,
  type Bloc,
} from "@/lib/blocs";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  lirePressePapier,
  poserPressePapier,
  viderPressePapier,
  type ModePressePapier,
} from "@/lib/presse-papier";
import type { NewsCategory, ResourceCategory, Space } from "@/lib/types";
import { after } from "next/server";
import { minutes, tentative } from "@/lib/limite";
import { notifierEquipe, notifierTousLesMembres } from "@/lib/push";
import { isAccessLocked } from "@/lib/membership";
import {
  extraitDePublication,
  LONGUEUR_PUBLICATION,
  PHOTOS_PAR_PUBLICATION,
  textePublication,
  titreDePublication,
  type EtatPublication,
} from "@/lib/publications";
import { getMember, ORDRE_RESSOURCES } from "@/lib/queries";

const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const revalideTout = () => revalidatePath("/", "layout");

function cheminRetour(fd: FormData, defaut: string): string {
  const r = texte(fd, "retour");
  return r.startsWith("/") && !r.startsWith("//") ? r : defaut;
}

const NEWS_CAT_DB: Record<
  NewsCategory,
  "programmation" | "evenement_passe" | "vie_de_la_chambre" | "formation"
> = {
  Programmation: "programmation",
  "Événement passé": "evenement_passe",
  "Vie de la chambre": "vie_de_la_chambre",
  Formation: "formation",
};

async function acteurEquipe(): Promise<string> {
  return (await getCurrentUser("admin")).nom;
}

async function journal(
  action: string,
  entite: string,
  entiteId: string,
  detail: string,
) {
  await prisma.auditLog.create({
    data: { action, entite, entiteId, acteur: await acteurEquipe(), detail },
  });
}

class PhotosRefusees extends Error {}

async function lirePhotos(
  formData: FormData,
  actuelles: string[],
): Promise<string[]> {
  const fichiers = await fichiersRecus(formData.getAll("images"));
  let ordre: unknown;
  try {
    ordre = JSON.parse(texte(formData, "ordre") || "null") ?? [
      ...actuelles.map((u) => `e:${u}`),
      ...fichiers.map((_, i) => `n:${i}`),
    ];
  } catch {
    throw new PhotosRefusees("L’ordre des photos est illisible.");
  }
  if (!Array.isArray(ordre) || ordre.some((j) => typeof j !== "string")) {
    throw new PhotosRefusees("L’ordre des photos est illisible.");
  }
  if (ordre.length > PHOTOS_PAR_PUBLICATION) {
    throw new PhotosRefusees(
      `${PHOTOS_PAR_PUBLICATION} photos au plus par publication.`,
    );
  }

  const envoyees: (string | null)[] = [];
  try {
    for (const f of fichiers) {
      envoyees.push(
        await enregistrerImage(f, { prefixe: "actualite", largeur: 1600 }),
      );
    }
  } catch (e) {
    if (e instanceof ImageRefusee) throw new PhotosRefusees(e.message);
    throw e;
  }

  const annoncees = (ordre as string[]).filter((j) => j.startsWith("n:"));
  if (annoncees.length > fichiers.length) {
    throw new PhotosRefusees("Vos photos ne sont plus disponibles.");
  }

  return (ordre as string[])
    .map((jeton) =>
      jeton.startsWith("e:")
        ? actuelles.includes(jeton.slice(2))
          ? jeton.slice(2)
          : null
        : jeton.startsWith("n:")
          ? (envoyees[Number(jeton.slice(2))] ?? null)
          : null,
    )
    .filter((u): u is string => Boolean(u));
}

async function photosDeLActualite(
  formData: FormData,
  actuelles: string[],
  retour: string,
): Promise<string[]> {
  try {
    return await lirePhotos(formData, actuelles);
  } catch (e) {
    if (e instanceof PhotosRefusees) redirectWithErreur(retour, e.message);
    throw e;
  }
}

export async function enregistrerActualite(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "newsId");
  const retour = id
    ? `/admin/actualites/${id}/modifier`
    : "/admin/actualites/nouvelle";

  const titre = texte(formData, "titre");
  const extrait = texte(formData, "extrait");
  const corps = texte(formData, "corps");
  const avant = id
    ? await prisma.news.findUnique({
        where: { id },
        select: {
          images: true,
          libre: true,
          titre: true,
          extrait: true,
          member: { select: { nom: true } },
        },
      })
    : null;
  if (!titre || (!avant?.libre && (!extrait || !corps))) {
    redirectWithErreur(retour, "Titre, résumé et texte sont obligatoires.");
  }

  const cat = NEWS_CAT_DB[texte(formData, "cat") as NewsCategory];
  if (!cat) redirectWithErreur(retour, "Catégorie inconnue.");

  const jour = texte(formData, "date");
  const date = jourBase(jourSaisi(jour) ?? undefined);

  const images = await photosDeLActualite(
    formData,
    avant?.images ?? [],
    retour,
  );
  if (!corps && !images.length) {
    redirectWithErreur(retour, "Il faut un texte, ou au moins une photo.");
  }

  const resteLibre =
    Boolean(avant?.libre) &&
    titre === avant?.titre &&
    extrait === avant?.extrait;

  const estPublique = texte(formData, "diffusion") === "public";
  const data = {
    titre: resteLibre
      ? titreDePublication(corps, avant?.member?.nom ?? "un membre")
      : titre,
    extrait: resteLibre ? extraitDePublication(corps) : extrait,
    corps,
    cat,
    date,
    images,
    public: estPublique,
    libre: resteLibre,
  };
  const n = id
    ? await prisma.news.update({ where: { id }, data })
    : await prisma.news.create({
        data: {
          ...data,
          mediaType: "image",
          mediaTheme: Math.random() > 0.5 ? "navy" : "green",
        },
      });

  await journal(
    id ? "actualite_modifiee" : "actualite_publiee",
    "News",
    n.id,
    `« ${n.titre} » · ${n.public ? "plateforme et page publique" : "plateforme uniquement"}`,
  );
  if (!id) {
    after(() =>
      notifierTousLesMembres({
        titre: "Nouvelle actualité CanCham",
        corps: n.titre,
        url: `/membre/actualites/${n.id}`,
      }),
    );
  }
  revalideTout();
  redirectWithFlash(
    `/admin/actualites/${n.id}`,
    id
      ? "Actualité mise à jour"
      : n.public
        ? "Actualité publiée sur la plateforme et la page publique"
        : "Actualité publiée sur la plateforme",
  );
}

const PUBLICATIONS_PAR_HEURE = 5;

export async function publierPublication(
  _avant: EtatPublication,
  formData: FormData,
): Promise<EtatPublication> {
  const refus = (erreur: string, photosPerdues = false): EtatPublication => ({
    etape: "erreur",
    erreur,
    photosPerdues,
  });

  const user = await getCurrentUser("membre");
  if (!user.memberId) {
    return refus("Aucune entreprise n’est rattachée à ce compte.");
  }
  const memberId = user.memberId;
  const membre = await getMember(memberId);
  if (!membre) return refus("Entreprise introuvable.");
  if (isAccessLocked(membre)) {
    return refus("Publier est réservé aux membres à jour de cotisation.");
  }

  const corps = textePublication(formData.get("texte"));
  const avecPhotos = formData
    .getAll("images")
    .some((v) => (typeof v === "string" ? v.trim() !== "" : v.size > 0));
  if (!corps && !avecPhotos) {
    return refus("Écrivez quelques mots, ou ajoutez une photo.");
  }

  const attente = tentative(
    `actualite:${memberId}`,
    PUBLICATIONS_PAR_HEURE,
    60 * 60 * 1000,
  );
  if (attente) {
    return refus(
      `Trop de publications à la suite. Réessayez dans ${minutes(attente)} minute${minutes(attente) > 1 ? "s" : ""}.`,
    );
  }

  let images: string[];
  try {
    images = await lirePhotos(formData, []);
  } catch (e) {
    if (e instanceof PhotosRefusees) return refus(e.message, true);
    throw e;
  }
  if (!corps && !images.length) {
    return refus("Écrivez quelques mots, ou ajoutez une photo.", true);
  }

  const n = await prisma.news.create({
    data: {
      titre: titreDePublication(corps, membre.nom),
      extrait: extraitDePublication(corps),
      corps,
      cat: "vie_de_la_chambre",
      date: jourBase(),
      images,
      public: false,
      libre: true,
      mediaType: "image",
      mediaTheme: Math.random() > 0.5 ? "navy" : "green",
      memberId,
      auteurNom: user.nom,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "actualite_publiee",
      entite: "News",
      entiteId: n.id,
      acteur: user.nom,
      detail: `« ${n.titre} » · publiée par ${membre.nom} · ${n.public ? "plateforme et page publique" : "plateforme uniquement"}`,
    },
  });
  after(() =>
    notifierEquipe({
      titre: "Publication d’un membre",
      corps: `${membre.nom} · ${n.titre}`,
      url: `/admin/actualites/${n.id}`,
    }),
  );

  revalideTout();
  return { etape: "publiee", id: n.id };
}

async function maPublication(id: string) {
  const user = await getCurrentUser("membre");
  if (!user.memberId || !id) return null;
  const membre = await getMember(user.memberId);
  if (!membre || isAccessLocked(membre)) return null;
  const n = await prisma.news.findFirst({
    where: { id, memberId: user.memberId },
    select: {
      id: true,
      titre: true,
      corps: true,
      images: true,
      libre: true,
      public: true,
    },
  });
  return n ? { user, membre, n } : null;
}

export async function modifierPublication(
  _avant: EtatPublication,
  formData: FormData,
): Promise<EtatPublication> {
  const refus = (erreur: string, photosPerdues = false): EtatPublication => ({
    etape: "erreur",
    erreur,
    photosPerdues,
  });
  const acces = await maPublication(texte(formData, "newsId"));
  if (!acces) return refus("Cette publication n’est pas la vôtre.");
  const { user, membre, n } = acces;

  const corps = textePublication(
    formData.get("texte"),
    Math.max(LONGUEUR_PUBLICATION, Array.from(n.corps).length),
  );
  let images: string[];
  try {
    images = await lirePhotos(formData, n.images);
  } catch (e) {
    if (e instanceof PhotosRefusees) return refus(e.message, true);
    throw e;
  }
  if (!corps && !images.length) {
    return refus("Écrivez quelques mots, ou gardez une photo.", true);
  }

  const maj = await prisma.news.update({
    where: { id: n.id },
    data: {
      corps,
      images,
      public: false,
      ...(n.libre
        ? {
            titre: titreDePublication(corps, membre.nom),
            extrait: extraitDePublication(corps),
          }
        : {}),
    },
  });
  await prisma.auditLog.create({
    data: {
      action: "actualite_modifiee",
      entite: "News",
      entiteId: maj.id,
      acteur: user.nom,
      detail: `« ${maj.titre} » · modifiée par ${membre.nom} · ${n.public ? "retirée de la page publique" : "plateforme uniquement"}`,
    },
  });
  if (n.public) {
    after(() =>
      notifierEquipe({
        titre: "Publication modifiée par son auteur",
        corps: `${membre.nom} · ${maj.titre} — retirée de la page publique, à rediffuser après relecture.`,
        url: `/admin/actualites/${maj.id}`,
      }),
    );
  }
  revalideTout();
  return { etape: "publiee", id: maj.id };
}

export async function supprimerMaPublication(formData: FormData) {
  const acces = await maPublication(texte(formData, "newsId"));
  if (!acces) {
    redirectWithErreur(
      "/membre/actualites",
      "Cette publication n’est pas la vôtre.",
    );
  }
  const { user, membre, n } = acces;
  await prisma.auditLog.create({
    data: {
      action: "actualite_supprimee",
      entite: "News",
      entiteId: n.id,
      acteur: user.nom,
      detail: `« ${n.titre} » · retirée par ${membre.nom}.`,
    },
  });
  await prisma.news.delete({ where: { id: n.id } });
  revalideTout();
  redirectWithFlash("/membre/actualites", "Publication supprimée");
}

export async function deleteNews(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "newsId");
  const n = await prisma.news.findUnique({
    where: { id },
    select: { titre: true, _count: { select: { commentaires: true } } },
  });
  if (!n) redirectWithErreur("/admin/actualites", "Actualité introuvable.");

  await journal(
    "actualite_supprimee",
    "News",
    id,
    `« ${n.titre} » et ses ${n._count.commentaires} commentaire${n._count.commentaires > 1 ? "s" : ""}.`,
  );
  await prisma.news.delete({ where: { id } });
  revalideTout();
  redirectWithFlash("/admin/actualites", "Actualité supprimée");
}

export async function supprimerCommentaire(formData: FormData) {
  const id = texte(formData, "commentId");
  const space = (texte(formData, "space") || "admin") as Space;
  const retour = cheminRetour(formData, `/${space}/actualites`);

  const user = await getCurrentUser(space);
  const c = await prisma.comment.findUnique({ where: { id } });
  if (!c) redirectWithErreur(retour, "Commentaire introuvable.");

  const auteur = c.userId === user.id;
  if (!auteur && space !== "admin") {
    redirectWithErreur(
      retour,
      "Vous ne pouvez supprimer que vos commentaires.",
    );
  }

  if (!auteur) {
    const extrait =
      c.texte.length > 120 ? `${c.texte.slice(0, 117)}…` : c.texte;
    await journal(
      "commentaire_supprime",
      c.newsId ? "News" : "Resource",
      c.newsId ?? c.resourceId ?? id,
      `${c.auteur} (${c.entreprise}) : « ${extrait} »`,
    );
  }
  await prisma.comment.delete({ where: { id } });
  revalideTout();
}

export async function basculerJaime(formData: FormData) {
  const newsId = texte(formData, "newsId");
  const space = (texte(formData, "space") || "membre") as Space;
  const user = await getCurrentUser(space);

  const existant = await prisma.newsLike.findUnique({
    where: { newsId_userId: { newsId, userId: user.id } },
  });

  if (existant) {
    await prisma.newsLike.deleteMany({ where: { id: existant.id } });
  } else {
    try {
      await prisma.newsLike.create({ data: { newsId, userId: user.id } });
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }

  revalideTout();
}

export async function postComment(formData: FormData) {
  const texteCommentaire = texte(formData, "texte");
  const space = (texte(formData, "space") || "membre") as Space;
  const retour = cheminRetour(formData, `/${space}/actualites`);

  if (!texteCommentaire) {
    redirectWithErreur(retour, "Le commentaire est vide.");
  }

  const user = await getCurrentUser(space);
  const entreprise = user.memberId
    ? ((
        await prisma.member.findUnique({
          where: { id: user.memberId },
          select: { nom: true },
        })
      )?.nom ?? "—")
    : "Équipe CanCham";

  await prisma.comment.create({
    data: {
      auteur: user.nom,
      entreprise,
      texte: texteCommentaire,
      date: jourBase(),
      newsId: texte(formData, "newsId") || null,
      resourceId: texte(formData, "resourceId") || null,
      userId: user.id,
    },
  });

  revalideTout();
}

export async function modifierCommentaire(formData: FormData) {
  const id = texte(formData, "commentId");
  const space = (texte(formData, "space") || "membre") as Space;
  const retour = cheminRetour(formData, `/${space}/actualites`);
  const nouveau = texte(formData, "texte");

  const user = await getCurrentUser(space);
  const c = await prisma.comment.findUnique({
    where: { id },
    select: { userId: true, texte: true },
  });
  if (!c || c.userId !== user.id) {
    redirectWithErreur(retour, "Vous ne pouvez modifier que vos commentaires.");
  }
  if (!nouveau) redirectWithErreur(retour, "Le commentaire est vide.");
  if (nouveau === c.texte) return;

  await prisma.comment.update({
    where: { id },
    data: { texte: nouveau, modifieLe: new Date() },
  });
  revalideTout();
}

export async function basculerJaimeCommentaire(formData: FormData) {
  const commentId = texte(formData, "commentId");
  const space = (texte(formData, "space") || "membre") as Space;
  const user = await getCurrentUser(space);

  const existant = await prisma.commentLike.findUnique({
    where: { commentId_userId: { commentId, userId: user.id } },
  });
  if (existant) {
    await prisma.commentLike.deleteMany({ where: { id: existant.id } });
  } else {
    try {
      await prisma.commentLike.create({
        data: { commentId, userId: user.id },
      });
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  revalideTout();
}

export async function enregistrerRessource(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "resourceId");
  const retour = id
    ? `/admin/ressources/${id}/modifier`
    : "/admin/ressources/nouvelle";

  const titre = texte(formData, "titre");
  const description = texte(formData, "description").slice(0, 600) || null;
  const cat = RESOURCE_CAT_DB[texte(formData, "cat") as ResourceCategory];
  const type = texte(formData, "type") === "payant" ? "payant" : "gratuit";
  const prix = type === "payant" ? Math.round(Number(formData.get("prix"))) : 0;
  const fichier = await fichierRecu(formData.get("fichier"));
  const dossierId = texte(formData, "dossier") || null;

  if (!titre) redirectWithErreur(retour, "Le titre est obligatoire.");
  if (!cat) redirectWithErreur(retour, "Catégorie inconnue.");
  if (type === "payant" && (!Number.isFinite(prix) || prix <= 0)) {
    redirectWithErreur(retour, "Indiquez le prix d’une ressource payante.");
  }
  if (!id && !fichier) {
    redirectWithErreur(retour, "Joignez le fichier de la ressource.");
  }
  if (dossierId) {
    const existe = await prisma.dossierRessource.count({
      where: { id: dossierId },
    });
    if (!existe) redirectWithErreur(retour, "Ce dossier n’existe plus.");
  }

  const avant = id
    ? await prisma.resource.findUnique({
        where: { id },
        select: { dossierId: true },
      })
    : null;
  const arrive = !avant || avant.dossierId !== dossierId;
  const r = id
    ? await prisma.resource.update({
        where: { id },
        data: {
          titre,
          description,
          cat,
          type,
          prix,
          dossierId,
          ...(arrive ? { ordre: await prochainRang(dossierId) } : {}),
        },
      })
    : await prisma.resource.create({
        data: {
          titre,
          description,
          cat,
          type,
          prix,
          dossierId,
          ordre: await prochainRang(dossierId),
          fmt: "pdf",
          taille: "—",
          date: jourBase(),
        },
      });

  if (fichier) {
    try {
      const recu = await recevoirRessource(r.id, fichier);
      await prisma.resource.update({
        where: { id: r.id },
        data: {
          fmt: recu.fmt,
          fichier: recu.fichier,
          pages: recu.pages,
          taille: recu.taille,
          cover: await couvertureDuContenu(r.id, recu.fmt, formData),
        },
      });
    } catch (e) {
      if (!(e instanceof FichierRefuse)) throw e;
      if (!id) {
        await prisma.resource.delete({ where: { id: r.id } });
        redirectWithErreur("/admin/ressources/nouvelle", e.message);
      }
      await prisma.resource.update({
        where: { id: r.id },
        data: { fichier: null, pages: null },
      });
      redirectWithErreur(retour, e.message);
    }
  }

  await prisma.auditLog.create({
    data: {
      action: id ? "ressource_modifiee" : "ressource_ajoutee",
      entite: "Resource",
      entiteId: r.id,
      acteur: await acteurEquipe(),
      detail: `« ${titre} »${fichier ? ` · fichier ${fichier.name}` : ""}.`,
    },
  });

  revalideTout();
  redirectWithFlash(
    "/admin/ressources",
    id ? `« ${titre} » mise à jour` : `« ${titre} » ajoutée à la bibliothèque`,
  );
}

async function prochainRang(dossierId: string | null): Promise<number> {
  const { _max } = await prisma.resource.aggregate({
    where: { dossierId },
    _max: { ordre: true },
  });
  const dernier = _max.ordre ?? 0;
  return dernier > 0 ? dernier + 1 : 0;
}

async function numeroter(ids: string[]) {
  await prisma.$transaction(
    ids.map((id, rang) =>
      prisma.resource.update({ where: { id }, data: { ordre: rang + 1 } }),
    ),
  );
}

export async function deplacerRessource(
  id: string,
  vers: "premier" | "dernier",
) {
  await exigerEquipe();
  const r = await prisma.resource.findUnique({
    where: { id },
    select: { dossierId: true },
  });
  if (!r) return;

  const autres = (
    await prisma.resource.findMany({
      where: { dossierId: r.dossierId, NOT: { id } },
      orderBy: ORDRE_RESSOURCES,
      select: { id: true },
    })
  ).map((x) => x.id);
  await numeroter(vers === "premier" ? [id, ...autres] : [...autres, id]);
  revalideTout();
}

export async function ordonnerRessources(ids: string[]) {
  await exigerEquipe();
  if (!Array.isArray(ids) || !ids.length || ids.length > 500) return;

  const premiere = await prisma.resource.findUnique({
    where: { id: String(ids[0]) },
    select: { dossierId: true },
  });
  if (!premiere) return;

  const duDossier = (
    await prisma.resource.findMany({
      where: { dossierId: premiere.dossierId },
      orderBy: ORDRE_RESSOURCES,
      select: { id: true },
    })
  ).map((x) => x.id);
  const connues = new Set(duDossier);
  const voulues = [...new Set(ids.map(String))].filter((id) => connues.has(id));
  const placees = new Set(voulues);

  await numeroter([...voulues, ...duDossier.filter((id) => !placees.has(id))]);
  revalideTout();
}

export async function terminerRessource(formData: FormData) {
  const resourceId = texte(formData, "resourceId");
  const user = await getCurrentUser("membre");
  if (!(await verifierAcces(resourceId)).ok) {
    redirectWithErreur("/membre/ressources", "Ressource introuvable.");
  }

  try {
    await prisma.lectureRessource.create({
      data: { userId: user.id, resourceId },
    });
  } catch (e) {
    if ((e as { code?: string }).code !== "P2002") throw e;
  }

  const r = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { dossierId: true },
  });
  revalidatePath("/membre/ressources");
  redirectWithFlash(
    r?.dossierId
      ? `/membre/ressources?dossier=${r.dossierId}`
      : "/membre/ressources",
    "Étape terminée",
  );
}

async function couvertureDuContenu(
  id: string,
  fmt: FichierRecu["fmt"],
  formData: FormData,
): Promise<string | null> {
  try {
    const source =
      fmt === "video"
        ? formData.get("couvertureVideo")
        : new File(
            [new Uint8Array(await couvertureDepuisPage(id))],
            "couverture.jpg",
            {
              type: "image/jpeg",
            },
          );
    return await enregistrerImage(source, {
      prefixe: `ressource-${id}`,
      largeur: 800,
    });
  } catch (e) {
    if (e instanceof ImageRefusee) return null;
    throw e;
  }
}

export async function enregistrerPageRessource(formData: FormData): Promise<{
  erreur: string;
  renvoyer?: boolean;
}> {
  await exigerEquipe();
  const id = texte(formData, "resourceId");

  const titre = texte(formData, "titre").slice(0, 200);
  const description = texte(formData, "description").slice(0, 600) || null;
  const cat = RESOURCE_CAT_DB[texte(formData, "cat") as ResourceCategory];
  const type: "payant" | "gratuit" =
    texte(formData, "type") === "payant" ? "payant" : "gratuit";
  const prix = type === "payant" ? Math.round(Number(formData.get("prix"))) : 0;
  const dossierId = texte(formData, "dossier") || null;

  if (!titre) return { erreur: "Donnez un titre à la page." };
  if (!cat) return { erreur: "Catégorie inconnue." };
  if (type === "payant" && (!Number.isFinite(prix) || prix <= 0)) {
    return { erreur: "Indiquez le prix d’une ressource payante." };
  }

  let saisie: unknown;
  try {
    saisie = JSON.parse(String(formData.get("contenu") ?? ""));
  } catch {
    return { erreur: "Le contenu de la page est illisible." };
  }
  const lecture = lireBlocs(saisie);
  if (lecture.erreur !== undefined) return { erreur: lecture.erreur };
  if (!lecture.blocs.length) {
    return { erreur: "La page est vide : ajoutez-y au moins un bloc." };
  }

  if (dossierId) {
    const existe = await prisma.dossierRessource.count({
      where: { id: dossierId },
    });
    if (!existe) return { erreur: "Ce dossier n’existe plus." };
  }

  const avant = id
    ? await prisma.resource.findUnique({
        where: { id },
        select: { fmt: true, contenu: true, dossierId: true, cover: true },
      })
    : null;
  if (id && !avant) return { erreur: "Cette ressource n’existe plus." };
  if (avant && avant.fmt !== "page") {
    return {
      erreur:
        "Cette ressource est un fichier : elle ne se modifie pas dans l’éditeur de page.",
    };
  }

  const dejaLa = avant ? fichiersDesBlocs(blocsEnregistres(avant.contenu)) : [];
  for (const fichier of fichiersDesBlocs(lecture.blocs)) {
    const connu = estJeton(fichier)
      ? Boolean(await envoiEnAttente(fichier))
      : dejaLa.includes(fichier);
    if (!connu) {
      return {
        erreur:
          "Un fichier de la page n’est pas arrivé : choisissez-le de nouveau, puis enregistrez.",
      };
    }
  }

  const arrive = !avant || avant.dossierId !== dossierId;
  const champs = {
    titre,
    description,
    cat,
    type,
    prix,
    dossierId,
    ...(arrive ? { ordre: await prochainRang(dossierId) } : {}),
  };
  const rid = avant
    ? id
    : (
        await prisma.resource.create({
          data: {
            ...champs,
            fmt: "page",
            taille: "Page",
            date: jourBase(),
            contenu: [],
          },
          select: { id: true },
        })
      ).id;

  const blocs: Bloc[] = [];
  try {
    for (const b of lecture.blocs) {
      if (b.type === "photo" && estJeton(b.fichier)) {
        const fichier = await recevoirFichierBloc(rid, "photo", b.fichier);
        blocs.push({ ...b, fichier });
      } else if (
        b.type === "video" &&
        b.source === "fichier" &&
        estJeton(b.fichier)
      ) {
        const fichier = await recevoirFichierBloc(rid, "video", b.fichier);
        blocs.push({ ...b, fichier });
      } else {
        blocs.push(b);
      }
    }
  } catch (e) {
    if (!(e instanceof FichierRefuse)) throw e;
    if (avant) {
      await menageBlocs(rid, dejaLa);
    } else {
      await prisma.resource.delete({ where: { id: rid } });
      await effacerRessource(rid);
    }
    return { erreur: e.message, renvoyer: true };
  }

  let cover = avant?.cover ?? null;
  try {
    const envoyee = await enregistrerImage(formData.get("couverture"), {
      prefixe: `ressource-${rid}`,
      largeur: 800,
    });
    if (envoyee) cover = envoyee;
    else if (formData.get("retirerCouverture")) cover = null;
    else if (!cover) {
      const photo = blocs.find((b) => b.type === "photo");
      if (photo) {
        cover = await enregistrerImage(
          new File(
            [new Uint8Array(await couvertureDepuisBloc(rid, photo.fichier))],
            "couverture.jpg",
            { type: "image/jpeg" },
          ),
          { prefixe: `ressource-${rid}`, largeur: 800 },
        );
      }
    }
  } catch (e) {
    if (!(e instanceof ImageRefusee)) throw e;
  }

  await prisma.resource.update({
    where: { id: rid },
    data: {
      ...champs,
      contenu: blocs as unknown as Prisma.InputJsonValue,
      taille: etiquettePage(blocs),
      cover,
    },
  });
  await menageBlocs(rid, fichiersDesBlocs(blocs));

  await prisma.auditLog.create({
    data: {
      action: avant ? "ressource_modifiee" : "ressource_ajoutee",
      entite: "Resource",
      entiteId: rid,
      acteur: await acteurEquipe(),
      detail: `« ${titre} » · page de ${blocs.length} bloc${blocs.length > 1 ? "s" : ""}.`,
    },
  });

  revalideTout();
  redirectWithFlash(
    `/admin/ressources${dossierId ? `?dossier=${dossierId}` : ""}`,
    avant
      ? `« ${titre} » mise à jour`
      : `« ${titre} » ajoutée à la bibliothèque`,
  );
}

export async function deleteResource(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "resourceId");
  const r = await prisma.resource.findUnique({
    where: { id },
    select: { titre: true },
  });
  if (!r) redirectWithErreur("/admin/ressources", "Ressource introuvable.");

  await prisma.auditLog.create({
    data: {
      action: "ressource_supprimee",
      entite: "Resource",
      entiteId: id,
      acteur: await acteurEquipe(),
      detail: `« ${r.titre} » et ses fichiers.`,
    },
  });
  await prisma.resource.delete({ where: { id } });
  await effacerRessource(id);
  revalideTout();
  redirectWithFlash("/admin/ressources", `« ${r.titre} » retirée`);
}

export async function downloadResource(formData: FormData) {
  const id = texte(formData, "resourceId");
  const space = (texte(formData, "space") || "membre") as Space;
  const r = await prisma.resource.findUnique({ where: { id } });
  if (!r) redirectWithErreur(`/${space}/ressources`, "Ressource introuvable.");

  const user = await getCurrentUser(space);
  await prisma.auditLog.create({
    data: {
      action: "ressource_achetee",
      entite: "Resource",
      entiteId: id,
      acteur: user.nom,
      detail: r.titre,
    },
  });

  revalideTout();
  redirectWithFlash(
    `/${space}/ressources`,
    `Demande d’achat consignée pour « ${r.titre} » — le paiement en ligne n’est pas branché`,
  );
}

export async function enregistrerOffre(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "offerId");
  const titre = texte(formData, "titre");
  const desc = texte(formData, "desc");
  const memberId = texte(formData, "memberId");
  const retour = "/admin/offres";

  if (!titre || !desc) {
    redirectWithErreur(retour, "Le titre et la description sont requis.");
  }
  const saisieLien = texte(formData, "lien");
  const lien = saisieLien ? normaliserSite(saisieLien) : null;
  if (saisieLien && !lien) {
    redirectWithErreur(
      retour,
      "Le lien « En profiter » n’est pas une adresse web valide.",
    );
  }
  const prix = texte(formData, "prix").slice(0, 60) || null;
  const parCancham = memberId === OFFRE_CANCHAM;
  const membre = parCancham
    ? { nom: "CanCham" }
    : await prisma.member.findUnique({
        where: { id: memberId },
        select: { nom: true },
      });
  if (!membre) redirectWithErreur(retour, "Choisissez qui propose l’offre.");
  const proposePar = parCancham ? null : memberId;

  const saisieEmplacement = texte(formData, "emplacement");
  const emplacement = estEmplacementOffre(saisieEmplacement)
    ? saisieEmplacement
    : "partout";

  let image: string | null = null;
  try {
    image = await enregistrerImage(formData.get("image"), {
      prefixe: "offre",
      largeur: 1200,
    });
  } catch (e) {
    if (e instanceof ImageRefusee) redirectWithErreur(retour, e.message);
    throw e;
  }
  const retirerImage = texte(formData, "retirerImage") === "1";

  if (id) {
    await prisma.offer.update({
      where: { id },
      data: {
        titre,
        desc,
        memberId: proposePar,
        lien,
        prix,
        emplacement,
        ...(image ? { image } : retirerImage ? { image: null } : {}),
      },
    });
  } else {
    await prisma.offer.create({
      data: { titre, desc, memberId: proposePar, lien, prix, image, emplacement },
    });
  }
  revalideTout();
  redirectWithFlash(
    retour,
    id ? "Offre mise à jour" : `Offre de ${membre.nom} publiée`,
  );
}

export async function deleteOffer(formData: FormData) {
  await exigerEquipe();
  await prisma.offer.deleteMany({ where: { id: texte(formData, "offerId") } });
  revalideTout();
  redirectWithFlash("/admin/offres", "Offre retirée");
}

async function originesPlateforme(): Promise<string[]> {
  const hote = (await headers()).get("host");
  return [
    await urlPublique("/"),
    ADRESSE_PLATEFORME,
    ...(hote ? [`https://${hote}`] : []),
  ];
}

export async function saveService(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "serviceId");
  const type = texte(formData, "type") === "payant" ? "payant" : "gratuit";
  const titre = texte(formData, "titre");
  const desc = texte(formData, "desc");
  const prix = type === "payant" ? Math.round(Number(formData.get("prix"))) : 0;
  const retour = "/admin/offres-cancham";

  if (!titre || !desc) {
    redirectWithErreur(retour, "Le titre et la description sont requis.");
  }
  if (type === "payant" && (!Number.isFinite(prix) || prix <= 0)) {
    redirectWithErreur(retour, "Indiquez le tarif d’un service payant.");
  }

  const lienSaisi = texte(formData, "lien");
  const lien = lienSaisi
    ? normaliserLien(lienSaisi, await originesPlateforme())
    : null;
  if (lienSaisi && !lien) {
    redirectWithErreur(
      retour,
      `« ${lienSaisi.slice(0, 80)} » n’est pas un lien valide.`,
    );
  }
  if (lien && estCheminFerme(lien)) {
    redirectWithErreur(
      retour,
      "Ce lien mène à l’espace de l’équipe : les membres ne peuvent pas l’ouvrir. Copiez plutôt le lien du rendez-vous.",
    );
  }

  let image: string | null = null;
  try {
    image = await enregistrerImage(formData.get("image"), {
      prefixe: "service",
      largeur: 1200,
    });
  } catch (e) {
    if (e instanceof ImageRefusee) redirectWithErreur(retour, e.message);
    throw e;
  }
  const retirerImage = texte(formData, "retirerImage") === "1";

  const data = {
    titre,
    desc,
    type,
    prix,
    lien,
    ...(image ? { image } : retirerImage ? { image: null } : {}),
  } as const;
  const service = id
    ? await prisma.canchamService.update({ where: { id }, data })
    : await prisma.canchamService.create({
        data: {
          ...data,
          icon: "award",
          ordre:
            ((await prisma.canchamService.aggregate({ _max: { ordre: true } }))
              ._max.ordre ?? -1) + 1,
        },
      });

  await journal(
    id ? "service_modifie" : "service_ajoute",
    "CanchamService",
    service.id,
    `« ${titre} » · ${type === "payant" ? `${prix.toLocaleString("fr-FR")} $` : "inclus"}${lien ? ` · lien : ${lien}` : ""}.`,
  );
  revalideTout();
  redirectWithFlash(
    retour,
    id ? "Service mis à jour" : "Service publié auprès des membres",
  );
}

export async function deleteService(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "serviceId");
  const s = await prisma.canchamService.findUnique({
    where: { id },
    select: { titre: true },
  });
  if (!s) redirectWithErreur("/admin/offres-cancham", "Service introuvable.");

  await journal("service_supprime", "CanchamService", id, `« ${s.titre} ».`);
  await prisma.canchamService.delete({ where: { id } });
  revalideTout();
  redirectWithFlash("/admin/offres-cancham", `« ${s.titre} » retiré`);
}

export async function deplacerService(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "serviceId");
  const sens = texte(formData, "sens") === "haut" ? -1 : 1;
  const retour = "/admin/offres-cancham";

  const courant = await prisma.canchamService.findUnique({ where: { id } });
  if (!courant) redirectWithErreur(retour, "Service introuvable.");

  const liste = await prisma.canchamService.findMany({
    where: { type: courant.type },
    orderBy: [{ ordre: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const i = liste.findIndex((x) => x.id === id);
  const j = i + sens;
  if (j < 0 || j >= liste.length) redirect(retour);

  [liste[i], liste[j]] = [liste[j], liste[i]];
  await prisma.$transaction(
    liste.map((x, ordre) =>
      prisma.canchamService.update({ where: { id: x.id }, data: { ordre } }),
    ),
  );
  revalideTout();
  redirect(retour);
}

const NOM_DOSSIER_MAX = 80;

const PROFONDEUR_MAX = 5;

const retourDossier = (id: string | null) =>
  id ? `/admin/ressources?dossier=${id}` : "/admin/ressources";

async function profondeurDossier(id: string | null): Promise<number> {
  let n = 0;
  let courant = id;
  while (courant && n < 20) {
    const d = await prisma.dossierRessource.findUnique({
      where: { id: courant },
      select: { parentId: true },
    });
    if (!d) break;
    courant = d.parentId;
    n++;
  }
  return n;
}

async function estDansSaDescendance(
  dossier: string,
  candidat: string | null,
): Promise<boolean> {
  let courant = candidat;
  for (let i = 0; courant && i < 20; i++) {
    if (courant === dossier) return true;
    const d = await prisma.dossierRessource.findUnique({
      where: { id: courant },
      select: { parentId: true },
    });
    if (!d) return false;
    courant = d.parentId;
  }
  return false;
}

function accesSaisi(formData: FormData) {
  const restreint = texte(formData, "acces") === "personnalise";
  const membres = restreint
    ? [...new Set(formData.getAll("membre").map(String).filter(Boolean))]
    : [];
  return { restreint, membres };
}

async function synchroniserAccesDossier(
  dossierId: string,
  membreIds: string[],
  ouvertPar: string,
): Promise<number> {
  const valides = (
    await prisma.member.findMany({
      where: { id: { in: membreIds } },
      select: { id: true },
    })
  ).map((m) => m.id);
  await prisma.$transaction([
    prisma.accesDossier.deleteMany({
      where: { dossierId, memberId: { notIn: valides } },
    }),
    prisma.accesDossier.createMany({
      data: valides.map((memberId) => ({ dossierId, memberId, ouvertPar })),
      skipDuplicates: true,
    }),
  ]);
  return valides.length;
}

const ACCES_SANS_ENTREPRISE =
  "Choisissez au moins une entreprise pour un accès personnalisé.";

async function presentationSaisie(formData: FormData) {
  const cover = await enregistrerImage(formData.get("cover"), {
    prefixe: "dossier",
    largeur: 1280,
  });
  const photo = await enregistrerImage(formData.get("auteurPhoto"), {
    prefixe: "auteur",
    largeur: 400,
  });
  const auteurNom = texte(formData, "auteurNom").slice(0, 120) || null;
  return {
    cover,
    retirerCover: texte(formData, "retirerCover") === "1",
    photo,
    retirerPhoto: texte(formData, "retirerAuteurPhoto") === "1",
    auteurNom,
    auteurRole: auteurNom
      ? texte(formData, "auteurRole").slice(0, 160) || null
      : null,
    auteurBio: auteurNom
      ? texte(formData, "auteurBio").slice(0, 800) || null
      : null,
  };
}

export async function creerDossier(formData: FormData) {
  const equipe = await exigerEquipe();
  const parentId = texte(formData, "parent") || null;
  const retour = retourDossier(parentId);

  const nom = texte(formData, "nom");
  const { restreint, membres } = accesSaisi(formData);
  if (!nom) redirectWithErreur(retour, "Donnez un nom au dossier.");
  if (restreint && !membres.length) {
    redirectWithErreur(retour, ACCES_SANS_ENTREPRISE);
  }
  if (nom.length > NOM_DOSSIER_MAX) {
    redirectWithErreur(retour, `Le nom dépasse ${NOM_DOSSIER_MAX} caractères.`);
  }
  if (parentId) {
    const parent = await prisma.dossierRessource.count({
      where: { id: parentId },
    });
    if (!parent)
      redirectWithErreur("/admin/ressources", "Dossier introuvable.");
    if ((await profondeurDossier(parentId)) >= PROFONDEUR_MAX) {
      redirectWithErreur(
        retour,
        `On ne range pas plus loin que ${PROFONDEUR_MAX} niveaux.`,
      );
    }
  }

  let p: Awaited<ReturnType<typeof presentationSaisie>>;
  try {
    p = await presentationSaisie(formData);
  } catch (e) {
    if (e instanceof ImageRefusee) redirectWithErreur(retour, e.message);
    throw e;
  }

  const d = await prisma.dossierRessource.create({
    data: {
      nom,
      parentId,
      restreint,
      cover: p.cover,
      auteurNom: p.auteurNom,
      auteurRole: p.auteurRole,
      auteurBio: p.auteurBio,
      auteurPhoto: p.auteurNom ? p.photo : null,
    },
  });
  if (restreint) {
    const n = await synchroniserAccesDossier(d.id, membres, equipe.nom);
    await journal(
      "dossier_acces",
      "DossierRessource",
      d.id,
      `« ${nom} » · réservé à ${n} entreprise${n > 1 ? "s" : ""}`,
    );
  }
  revalideTout();
  redirectWithFlash(retour, `Dossier « ${nom} » créé`);
}

export async function reglerAccesDossier(formData: FormData) {
  const equipe = await exigerEquipe();
  const id = texte(formData, "dossierId");

  const d = await prisma.dossierRessource.findUnique({
    where: { id },
    select: { nom: true, parentId: true },
  });
  if (!d) redirectWithErreur("/admin/ressources", "Dossier introuvable.");
  const retour = retourDossier(d.parentId);

  const { restreint, membres } = accesSaisi(formData);
  if (restreint && !membres.length) {
    redirectWithErreur(retour, ACCES_SANS_ENTREPRISE);
  }

  await prisma.dossierRessource.update({ where: { id }, data: { restreint } });
  const n = await synchroniserAccesDossier(id, membres, equipe.nom);
  await journal(
    "dossier_acces",
    "DossierRessource",
    id,
    restreint
      ? `« ${d.nom} » · réservé à ${n} entreprise${n > 1 ? "s" : ""}`
      : `« ${d.nom} » · ouvert à tous les membres`,
  );
  revalideTout();
  redirectWithFlash(
    retour,
    restreint
      ? `« ${d.nom} » réservé à ${n} entreprise${n > 1 ? "s" : ""}`
      : `« ${d.nom} » ouvert à tous les membres`,
  );
}

export async function modifierDossier(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "dossierId");
  const nom = texte(formData, "nom");

  const d = await prisma.dossierRessource.findUnique({
    where: { id },
    select: { parentId: true },
  });
  if (!d) redirectWithErreur("/admin/ressources", "Dossier introuvable.");
  const retour = retourDossier(d.parentId);

  if (!nom) redirectWithErreur(retour, "Donnez un nom au dossier.");
  if (nom.length > NOM_DOSSIER_MAX) {
    redirectWithErreur(retour, `Le nom dépasse ${NOM_DOSSIER_MAX} caractères.`);
  }

  let p: Awaited<ReturnType<typeof presentationSaisie>>;
  try {
    p = await presentationSaisie(formData);
  } catch (e) {
    if (e instanceof ImageRefusee) redirectWithErreur(retour, e.message);
    throw e;
  }

  await prisma.dossierRessource.update({
    where: { id },
    data: {
      nom,
      ...(p.cover ? { cover: p.cover } : p.retirerCover ? { cover: null } : {}),
      auteurNom: p.auteurNom,
      auteurRole: p.auteurRole,
      auteurBio: p.auteurBio,
      ...(!p.auteurNom
        ? { auteurPhoto: null }
        : p.photo
          ? { auteurPhoto: p.photo }
          : p.retirerPhoto
            ? { auteurPhoto: null }
            : {}),
    },
  });
  revalideTout();
  redirectWithFlash(retour, `Dossier « ${nom} » mis à jour`);
}

export async function supprimerDossier(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "dossierId");

  const d = await prisma.dossierRessource.findUnique({
    where: { id },
    select: {
      nom: true,
      parentId: true,
      _count: { select: { enfants: true, ressources: true } },
    },
  });
  if (!d) redirectWithErreur("/admin/ressources", "Dossier introuvable.");
  const retour = retourDossier(d.parentId);

  await prisma.$transaction([
    prisma.dossierRessource.updateMany({
      where: { parentId: id },
      data: { parentId: d.parentId },
    }),
    prisma.resource.updateMany({
      where: { dossierId: id },
      data: { dossierId: d.parentId },
    }),
    prisma.dossierRessource.delete({ where: { id } }),
  ]);

  const deplaces = d._count.enfants + d._count.ressources;
  revalideTout();
  redirectWithFlash(
    retour,
    `Dossier « ${d.nom} » supprimé${deplaces ? ` · ${deplaces} élément${deplaces > 1 ? "s remontés" : " remonté"} d’un niveau` : ""}`,
  );
}

export async function deplacerDossier(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "dossierId");
  const vers = texte(formData, "parent") || null;

  const d = await prisma.dossierRessource.findUnique({
    where: { id },
    select: { nom: true, parentId: true },
  });
  if (!d) redirectWithErreur("/admin/ressources", "Dossier introuvable.");
  const retour = retourDossier(d.parentId);

  if (vers && (await estDansSaDescendance(id, vers))) {
    redirectWithErreur(
      retour,
      "Un dossier ne peut pas être rangé dans lui-même.",
    );
  }
  if (vers && (await profondeurDossier(vers)) >= PROFONDEUR_MAX) {
    redirectWithErreur(
      retour,
      `On ne range pas plus loin que ${PROFONDEUR_MAX} niveaux.`,
    );
  }

  await prisma.dossierRessource.update({
    where: { id },
    data: { parentId: vers },
  });
  revalideTout();
  redirectWithFlash(retourDossier(vers), `Dossier « ${d.nom} » déplacé`);
}

const coches = (fd: FormData) =>
  fd.getAll("ressource").map(String).filter(Boolean);

const retourBibliotheque = (fd: FormData) => {
  const r = texte(fd, "retour");
  if (r.startsWith("/admin/") && !r.startsWith("//")) return r;
  const d = texte(fd, "dossier");
  return d ? `/admin/ressources?dossier=${d}` : "/admin/ressources";
};

async function mettreAuPressePapier(
  formData: FormData,
  mode: ModePressePapier,
) {
  await exigerEquipe();
  const retour = retourBibliotheque(formData);
  const ids = coches(formData);
  if (!ids.length) {
    redirectWithErreur(retour, "Cochez au moins une ressource.");
  }

  await poserPressePapier({ mode, ids });
  redirectWithFlash(
    retour,
    `${ids.length} ressource${ids.length > 1 ? "s" : ""} ${mode === "couper" ? "à déplacer" : "à copier"} · ouvrez un dossier puis « Coller ici »`,
  );
}

export async function couperRessources(formData: FormData) {
  await mettreAuPressePapier(formData, "couper");
}

export async function copierRessources(formData: FormData) {
  await mettreAuPressePapier(formData, "copier");
}

export async function annulerPressePapier(formData: FormData) {
  await exigerEquipe();
  await viderPressePapier();
  redirectWithFlash(retourBibliotheque(formData), "Presse-papier vidé");
}

export async function collerRessources(formData: FormData) {
  await exigerEquipe();
  const retour = retourBibliotheque(formData);
  const presse = await lirePressePapier();
  if (!presse) redirectWithErreur(retour, "Le presse-papier est vide.");

  const dossierId = texte(formData, "dossier") || null;
  if (dossierId) {
    const existe = await prisma.dossierRessource.count({
      where: { id: dossierId },
    });
    if (!existe)
      redirectWithErreur("/admin/ressources", "Dossier introuvable.");
  }

  const sources = await prisma.resource.findMany({
    where: { id: { in: presse.ids } },
  });
  if (!sources.length) {
    await viderPressePapier();
    redirectWithErreur(retour, "Ces ressources n’existent plus.");
  }

  const ordre = await prochainRang(dossierId);
  if (presse.mode === "couper") {
    await prisma.resource.updateMany({
      where: {
        id: { in: sources.map((r) => r.id) },
        NOT: { dossierId },
      },
      data: { dossierId, ordre },
    });
  } else {
    for (const r of sources) {
      const copie = await prisma.resource.create({
        data: {
          titre: `${r.titre} (copie)`,
          description: r.description,
          cat: r.cat,
          fmt: r.fmt,
          taille: r.taille,
          date: r.date,
          fichier: r.fichier,
          pages: r.pages,
          cover: r.cover,
          ...(r.contenu === null
            ? {}
            : { contenu: r.contenu as Prisma.InputJsonValue }),
          type: r.type,
          prix: r.prix,
          dossierId,
          ordre,
        },
      });
      await dupliquerRessource(r.id, copie.id);
    }
  }

  await viderPressePapier();
  revalideTout();
  const n = sources.length;
  redirectWithFlash(
    retour,
    `${n} ressource${n > 1 ? "s" : ""} ${presse.mode === "couper" ? "déplacée" : "copiée"}${n > 1 ? "s" : ""} ici`,
  );
}

export async function ouvrirAccesRessources(formData: FormData) {
  const user = await exigerEquipe();
  const retour = retourBibliotheque(formData);

  const ressources = coches(formData);
  const membres = formData.getAll("membre").map(String).filter(Boolean);
  if (!ressources.length)
    redirectWithErreur(retour, "Aucune ressource choisie.");
  if (!membres.length)
    redirectWithErreur(retour, "Choisissez au moins une entreprise.");

  const payantes = await prisma.resource.findMany({
    where: { id: { in: ressources }, type: "payant" },
    select: { id: true, titre: true },
  });
  if (!payantes.length) {
    redirectWithErreur(
      retour,
      "Ces ressources sont incluses dans l’adhésion : tout membre à jour y accède déjà.",
    );
  }

  const { count } = await prisma.accesRessource.createMany({
    data: payantes.flatMap((r) =>
      membres.map((memberId) => ({
        resourceId: r.id,
        memberId,
        ouvertPar: user.nom,
      })),
    ),
    skipDuplicates: true,
  });

  for (const r of payantes) {
    await journal(
      "acces_ouvert",
      "Resource",
      r.id,
      `${membres.length} entreprise${membres.length > 1 ? "s" : ""} · ${r.titre}`,
    );
  }

  revalideTout();
  redirectWithFlash(
    retour,
    count
      ? `${count} accès ouvert${count > 1 ? "s" : ""}`
      : "Ces accès étaient déjà ouverts",
  );
}

export async function retirerAccesRessource(formData: FormData) {
  await exigerEquipe();
  const resourceId = texte(formData, "resourceId");
  const memberId = texte(formData, "membreId");
  const retour = retourBibliotheque(formData);

  const acces = await prisma.accesRessource.findUnique({
    where: { resourceId_memberId: { resourceId, memberId } },
    include: {
      member: { select: { nom: true } },
      resource: { select: { titre: true } },
    },
  });
  if (!acces) redirectWithErreur(retour, "Cet accès n’existe plus.");

  await prisma.accesRessource.delete({ where: { id: acces.id } });
  await journal(
    "acces_retire",
    "Resource",
    resourceId,
    `${acces.member.nom} · ${acces.resource.titre}`,
  );
  revalideTout();
  redirectWithFlash(retour, `Accès retiré à ${acces.member.nom}`);
}

export async function mettreUneAuPressePapier(
  id: string,
  mode: ModePressePapier,
  dossier: string | null,
) {
  await exigerEquipe();
  await poserPressePapier({ mode, ids: [id] });
  redirectWithFlash(
    dossier ? `/admin/ressources?dossier=${dossier}` : "/admin/ressources",
    `Ressource ${mode === "couper" ? "à déplacer" : "à copier"} · ouvrez un dossier puis « Coller ici »`,
  );
}

export async function ouvrirAccesPour(resourceId: string, membreIds: string[]) {
  const user = await exigerEquipe();
  if (!membreIds.length) return;

  const r = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { id: true, titre: true, type: true },
  });
  if (!r || r.type !== "payant") return;

  await prisma.accesRessource.createMany({
    data: membreIds.map((memberId) => ({
      resourceId: r.id,
      memberId,
      ouvertPar: user.nom,
    })),
    skipDuplicates: true,
  });
  await journal(
    "acces_ouvert",
    "Resource",
    r.id,
    `${membreIds.length} entreprise${membreIds.length > 1 ? "s" : ""} · ${r.titre}`,
  );
  revalideTout();
}

export async function retirerAccesPour(resourceId: string, memberId: string) {
  await exigerEquipe();
  const acces = await prisma.accesRessource.findUnique({
    where: { resourceId_memberId: { resourceId, memberId } },
    include: {
      member: { select: { nom: true } },
      resource: { select: { titre: true } },
    },
  });
  if (!acces) return;

  await prisma.accesRessource.delete({ where: { id: acces.id } });
  await journal(
    "acces_retire",
    "Resource",
    resourceId,
    `${acces.member.nom} · ${acces.resource.titre}`,
  );
  revalideTout();
}
