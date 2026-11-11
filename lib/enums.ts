import type {
  EventFormat as DbEventFormat,
  NewsCategory as DbNewsCategory,
  ResourceCategory as DbResourceCategory,
  ResourceFormat as DbResourceFormat,
} from "@/lib/generated/prisma/enums";
import type {
  EventFormat,
  NewsCategory,
  NiveauEquipe,
  Resource,
  ResourceCategory,
} from "@/lib/types";

export const NIVEAU_EQUIPE_LABEL: Record<NiveauEquipe, string> = {
  administrateur: "Super admin",
  manager: "Admin",
};

export const EVENT_FORMAT_LABEL: Record<DbEventFormat, EventFormat> = {
  presentiel: "Présentiel",
  webinaire: "Webinaire",
  hybride: "Hybride",
};

export const EVENT_FORMAT_DB: Record<EventFormat, DbEventFormat> = {
  Présentiel: "presentiel",
  Webinaire: "webinaire",
  Hybride: "hybride",
};

export const NEWS_CAT_LABEL: Record<DbNewsCategory, NewsCategory> = {
  programmation: "Programmation",
  evenement_passe: "Événement passé",
  vie_de_la_chambre: "Vie de la chambre",
  formation: "Formation",
};

export const RESOURCE_CAT_LABEL: Record<DbResourceCategory, ResourceCategory> =
  {
    guide: "Guide",
    modele: "Modèle",
    formation: "Formation",
    rapport: "Rapport",
  };

export const RESOURCE_CAT_DB: Record<ResourceCategory, DbResourceCategory> = {
  Guide: "guide",
  Modèle: "modele",
  Formation: "formation",
  Rapport: "rapport",
};

export const RESOURCE_FMT_LABEL: Record<DbResourceFormat, Resource["fmt"]> = {
  pdf: "PDF",
  docx: "DOCX",
  video: "Vidéo",
  image: "Photo",
  page: "Page",
};

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function heureRelative(d: Date, maintenant = new Date()): string {
  const jour = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ecart = Math.round((jour(maintenant) - jour(d)) / 86_400_000);

  if (ecart <= 0)
    return d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  if (ecart === 1) return "Hier";
  if (ecart < 7)
    return d
      .toLocaleDateString("fr-FR", { weekday: "long" })
      .replace(/^./, (c) => c.toUpperCase());
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function heureExacte(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function jourLisible(iso: string, maintenant = new Date()): string {
  const d = new Date(iso);
  const jour = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ecart = Math.round((jour(maintenant) - jour(d)) / 86_400_000);

  if (ecart === 0) return "Aujourd’hui";
  if (ecart === 1) return "Hier";
  return d
    .toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      ...(d.getFullYear() === maintenant.getFullYear()
        ? {}
        : { year: "numeric" }),
    })
    .replace(/^./, (c) => c.toUpperCase());
}
