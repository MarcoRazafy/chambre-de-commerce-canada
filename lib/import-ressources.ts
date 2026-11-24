import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, open, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { etiquettePage, fichiersDesBlocs, lireBlocs, type Bloc } from "@/lib/blocs";
import { prismaSysteme as db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { PricingType, ResourceCategory, ResourceFormat } from "@/lib/generated/prisma/enums";
import { cheminBloc, cheminFichier, cheminPage, dossierRessource } from "@/lib/stockage-ressources";
import { DOSSIER_TELEVERSEMENTS } from "@/lib/uploads";
import { ArchiveIllisible, ouvrirZip, type EntreeZip, type Zip } from "@/lib/zip";

export { ArchiveIllisible };

export interface BilanImport {
  dossiers: number;
  ressources: number;
  ignorees: { titre: string; raison: string }[];
}

const CATEGORIES: Record<string, ResourceCategory> = {
  Guide: "guide", guide: "guide",
  Modèle: "modele", modele: "modele",
  Formation: "formation", formation: "formation",
  Rapport: "rapport", rapport: "rapport",
};
const FORMATS: Record<string, ResourceFormat> = {
  PDF: "pdf", pdf: "pdf",
  DOCX: "docx", docx: "docx",
  Vidéo: "video", video: "video",
  Photo: "image", image: "image",
  Page: "page", page: "page",
};
const FICHIER_PRINCIPAL = /^(document\.(pdf|docx)|image\.(jpg|png|webp)|video\.(mp4|webm|mov))$/;
const PLAFOND_IMAGE = 30 * 1024 * 1024;

type Brut = Record<string, unknown>;
const objet = (v: unknown): Brut | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Brut) : null);
const texte = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const facultatif = (v: unknown, max: number) => texte(v, max) || null;
const entier = (v: unknown) => {
  const n = Number(v);
  return Number.isSafeInteger(n) ? n : null;
};
function date(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const iso = /^\d{4}-\d\d-\d\d$/.test(v) || /([zZ]|[+-]\d\d:?\d\d)$/.test(v) ? v : `${v}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
const nouvelId = () => `c${Date.now().toString(36)}${randomBytes(8).toString("hex")}`;

function estImage(debut: Buffer): boolean {
  return (
    (debut[0] === 0xff && debut[1] === 0xd8 && debut[2] === 0xff) ||
    debut.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) ||
    (debut.subarray(0, 4).toString("latin1") === "RIFF" && debut.subarray(8, 12).toString("latin1") === "WEBP")
  );
}
const estPng = (debut: Buffer) => debut.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));

async function debutDuFichier(chemin: string): Promise<Buffer> {
  const f = await open(chemin, "r");
  try {
    const tampon = Buffer.alloc(12);
    await f.read(tampon, 0, 12, 0);
    return tampon;
  } finally {
    await f.close();
  }
}

function trouverStructure(zip: Zip): string {
  const noms = [...zip.entrees.keys()]
    .filter((n) => n === "structure.json" || n.endsWith("/structure.json"))
    .sort((a, b) => a.length - b.length);
  if (!noms.length) throw new ArchiveIllisible("L’archive ne contient pas structure.json.");
  return noms[0];
}

export async function importerArchive(chemin: string, chambreId: string): Promise<BilanImport> {
  const zip = await ouvrirZip(chemin);
  const images: string[] = [];
  const dossiersRessources: string[] = [];
  try {
    const nomStructure = trouverStructure(zip);
    const prefixe = nomStructure.slice(0, -"structure.json".length);
    let structure: Brut | null;
    try {
      structure = objet(JSON.parse((await zip.lire(zip.entrees.get(nomStructure)!, 20 * 1024 * 1024)).toString("utf8")));
    } catch (e) {
      if (e instanceof ArchiveIllisible) throw e;
      throw new ArchiveIllisible("structure.json est illisible.");
    }
    const dossiersBruts = Array.isArray(structure?.dossiers) ? structure.dossiers : [];
    const ressourcesBrutes = Array.isArray(structure?.ressources) ? structure.ressources : null;
    if (!ressourcesBrutes) throw new ArchiveIllisible("structure.json ne contient aucune ressource.");

    const entree = (relatif: string): EntreeZip | undefined => zip.entrees.get(`${prefixe}fichiers/${relatif}`);

    const copiees = new Map<string, string | null>();
    async function image(url: unknown): Promise<string | null> {
      if (typeof url !== "string") return null;
      const m = /^\/televersements\/([\w-]+)\.(jpe?g|png|webp)$/i.exec(url);
      if (!m) return null;
      if (copiees.has(url)) return copiees.get(url)!;
      let publie: string | null = null;
      const e = entree(`televersements/${m[1]}.${m[2]}`);
      const octets = e ? await zip.lire(e, PLAFOND_IMAGE).catch((erreur) => {
        if (erreur instanceof ArchiveIllisible) return null;
        throw erreur;
      }) : null;
      if (octets) {
        if (estImage(octets.subarray(0, 12))) {
          const nom = `${m[1].split("-")[0].slice(0, 20) || "image"}-${randomBytes(6).toString("hex")}.${m[2].toLowerCase()}`;
          await mkdir(DOSSIER_TELEVERSEMENTS, { recursive: true });
          await writeFile(path.join(DOSSIER_TELEVERSEMENTS, nom), octets);
          images.push(path.join(DOSSIER_TELEVERSEMENTS, nom));
          publie = `/televersements/${nom}`;
        }
      }
      copiees.set(url, publie);
      return publie;
    }

    const dossiers: { ancien: string; parentAncien: string | null; data: Prisma.DossierRessourceUncheckedCreateInput & { id: string } }[] = [];
    for (const brut of dossiersBruts) {
      const d = objet(brut);
      const nom = texte(d?.nom, 200);
      if (!d || !nom || typeof d.id !== "string") continue;
      dossiers.push({
        ancien: d.id,
        parentAncien: typeof d.parentId === "string" ? d.parentId : null,
        data: {
          id: nouvelId(),
          chambreId,
          nom,
          cover: await image(d.cover),
          auteurNom: facultatif(d.auteurNom, 200),
          auteurRole: facultatif(d.auteurRole, 200),
          auteurBio: facultatif(d.auteurBio, 5000),
          auteurPhoto: await image(d.auteurPhoto),
          restreint: d.restreint === true,
          createdAt: date(d.createdAt) ?? undefined,
        },
      });
    }
    const nouveauDossier = new Map(dossiers.map((d) => [d.ancien, d.data.id]));
    const ordonnes: typeof dossiers = [];
    const places = new Set<string>();
    let reste = dossiers;
    while (reste.length) {
      const prets = reste.filter((d) => !d.parentAncien || !nouveauDossier.has(d.parentAncien) || places.has(d.parentAncien));
      const suivants = prets.length ? prets : reste;
      for (const d of suivants) {
        ordonnes.push(d);
        places.add(d.ancien);
      }
      reste = reste.filter((d) => !places.has(d.ancien));
    }

    const ignorees: BilanImport["ignorees"] = [];
    const ressources: Prisma.ResourceUncheckedCreateInput[] = [];
    for (const brut of ressourcesBrutes) {
      const r = objet(brut);
      const titre = texte(r?.titre, 300);
      if (!r || !titre || typeof r.id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(r.id)) continue;
      const fmt = FORMATS[String(r.fmt)];
      if (!fmt) {
        ignorees.push({ titre, raison: "format inconnu" });
        continue;
      }
      const ancien = r.id;
      const id = nouvelId();
      const fichierPrincipal = typeof r.fichier === "string" && FICHIER_PRINCIPAL.test(r.fichier) ? r.fichier : null;
      const pages = entier(r.pages);
      let contenu: Bloc[] | undefined;
      let taille = texte(r.taille, 100) || "—";

      try {
        await mkdir(dossierRessource(id), { recursive: true });
        dossiersRessources.push(dossierRessource(id));

        if (fmt === "page") {
          const lecture = lireBlocs(r.contenu);
          if (lecture.erreur !== undefined) {
            ignorees.push({ titre, raison: "contenu illisible" });
            await rm(dossierRessource(id), { recursive: true, force: true });
            continue;
          }
          const presents = new Set<string>();
          for (const f of fichiersDesBlocs(lecture.blocs)) {
            const e = entree(`ressources/${ancien}/blocs/${f}`);
            if (!e) continue;
            await mkdir(path.dirname(cheminBloc(id, f)), { recursive: true });
            await zip.extraire(e, cheminBloc(id, f));
            presents.add(f);
          }
          contenu = lecture.blocs.filter(
            (b) => !((b.type === "photo" || (b.type === "video" && b.source === "fichier")) && !presents.has(b.fichier)),
          );
          taille = etiquettePage(contenu);
        } else if (fmt === "video") {
          const e = fichierPrincipal ? entree(`ressources/${ancien}/${fichierPrincipal}`) : undefined;
          if (!e || !fichierPrincipal) {
            ignorees.push({ titre, raison: "vidéo absente de l’archive" });
            await rm(dossierRessource(id), { recursive: true, force: true });
            continue;
          }
          await zip.extraire(e, cheminFichier(id, fichierPrincipal));
        } else {
          const manquante = !pages || pages < 1 || Array.from({ length: pages }, (_, i) => i + 1).some(
            (n) => !entree(`ressources/${ancien}/pages/page-${String(n).padStart(3, "0")}.png`),
          );
          if (manquante) {
            ignorees.push({ titre, raison: "pages absentes de l’archive" });
            await rm(dossierRessource(id), { recursive: true, force: true });
            continue;
          }
          await mkdir(path.dirname(cheminPage(id, 1)), { recursive: true });
          for (let n = 1; n <= pages; n++) {
            const destination = cheminPage(id, n);
            await zip.extraire(entree(`ressources/${ancien}/pages/page-${String(n).padStart(3, "0")}.png`)!, destination);
            if (!estPng(await debutDuFichier(destination))) {
              throw new ArchiveIllisible(`Une page de « ${titre} » n’est pas une image PNG.`);
            }
          }
          const original = fichierPrincipal ? entree(`ressources/${ancien}/${fichierPrincipal}`) : undefined;
          if (original && fichierPrincipal) await zip.extraire(original, cheminFichier(id, fichierPrincipal));
        }
      } catch (e) {
        if (!(e instanceof ArchiveIllisible)) throw e;
        ignorees.push({ titre, raison: e.message });
        await rm(dossierRessource(id), { recursive: true, force: true });
        continue;
      }

      const type: PricingType = r.type === "payant" ? "payant" : "gratuit";
      ressources.push({
        id,
        chambreId,
        titre,
        cat: CATEGORIES[String(r.cat)] ?? "guide",
        fmt,
        taille,
        date: date(r.date) ?? new Date(),
        fichier: fmt === "page" ? null : fichierPrincipal,
        pages: fmt === "page" || fmt === "video" ? null : pages,
        cover: await image(r.cover),
        description: facultatif(r.description, 5000),
        contenu: contenu ? (contenu as unknown as Prisma.InputJsonValue) : undefined,
        type,
        prix: type === "payant" ? Math.max(0, entier(r.prix) ?? 0) : 0,
        ordre: entier(r.ordre) ?? 0,
        dossierId: typeof r.dossierId === "string" ? (nouveauDossier.get(r.dossierId) ?? null) : null,
        createdAt: date(r.createdAt) ?? undefined,
      });
    }

    await db.$transaction(
      async (tx) => {
        for (const d of ordonnes) {
          await tx.dossierRessource.create({
            data: { ...d.data, parentId: d.parentAncien ? (nouveauDossier.get(d.parentAncien) ?? null) : null },
          });
        }
        for (const r of ressources) {
          await tx.resource.create({ data: r });
        }
      },
      { timeout: 60_000 },
    );

    return { dossiers: ordonnes.length, ressources: ressources.length, ignorees };
  } catch (e) {
    await Promise.all([
      ...images.map((f) => rm(f, { force: true })),
      ...dossiersRessources.map((d) => rm(d, { recursive: true, force: true })),
    ]);
    throw e;
  } finally {
    await zip.fermer();
  }
}
