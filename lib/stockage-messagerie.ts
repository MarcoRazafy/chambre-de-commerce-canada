import { randomUUID } from "node:crypto";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { dossierStockage } from "@/lib/stockage";
import { PLAFOND_FICHIER } from "@/lib/plafonds";

export const RACINE_MESSAGERIE = dossierStockage("messagerie");

export type TypePiece = "image" | "video" | "pdf";

export const PLAFONDS: Record<TypePiece, number> = {
  image: PLAFOND_FICHIER,
  video: PLAFOND_FICHIER,
  pdf: PLAFOND_FICHIER,
};

export const PIECES_PAR_MESSAGE = 5;

export class PieceRefusee extends Error {}

export interface PieceRecue {
  nom: string;
  type: TypePiece;
  fichier: string;
  taille: number;
}

function typeDeclare(mime: string): TypePiece | null {
  if (mime.startsWith("image/")) return "image";
  if (["video/mp4", "video/webm", "video/quicktime"].includes(mime))
    return "video";
  if (mime === "application/pdf") return "pdf";
  return null;
}

function signatureValide(type: TypePiece, octets: Buffer): boolean {
  if (type === "pdf")
    return octets.subarray(0, 5).toString("latin1") === "%PDF-";
  if (type === "video") {
    const ftyp = octets.subarray(4, 8).toString("latin1") === "ftyp";
    const webm = octets
      .subarray(0, 4)
      .equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    return ftyp || webm;
  }
  return true;
}

export async function recevoirPiece(
  entree: FormDataEntryValue,
): Promise<PieceRecue | null> {
  if (!(entree instanceof File) || entree.size === 0) return null;

  const type = typeDeclare(entree.type);
  if (!type) {
    throw new PieceRefusee(
      `« ${entree.name} » : seules les images, les vidéos (MP4, WebM, MOV) et les PDF sont acceptés.`,
    );
  }
  if (entree.size > PLAFONDS[type]) {
    const mo = Math.round(PLAFONDS[type] / 1024 / 1024);
    throw new PieceRefusee(`« ${entree.name} » dépasse ${mo} Mo.`);
  }

  const octets = Buffer.from(await entree.arrayBuffer());
  if (!signatureValide(type, octets)) {
    throw new PieceRefusee(
      `« ${entree.name} » n’est pas un fichier ${type === "pdf" ? "PDF" : "vidéo"} valide.`,
    );
  }

  await mkdir(RACINE_MESSAGERIE, { recursive: true });
  const id = randomUUID();

  if (type === "image") {
    let sortie: Buffer;
    try {
      sortie = await sharp(octets)
        .rotate()
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
    } catch {
      throw new PieceRefusee(`« ${entree.name} » n’est pas une image lisible.`);
    }
    const fichier = `${id}.jpg`;
    await writeFile(path.join(RACINE_MESSAGERIE, fichier), sortie);
    return { nom: entree.name, type, fichier, taille: sortie.length };
  }

  const extension =
    type === "pdf"
      ? "pdf"
      : entree.type === "video/webm"
        ? "webm"
        : entree.type === "video/quicktime"
          ? "mov"
          : "mp4";
  const fichier = `${id}.${extension}`;
  await writeFile(
    path.join(RACINE_MESSAGERIE, fichier),
    octets,
  );
  return { nom: entree.name, type, fichier, taille: octets.length };
}

export function cheminPiece(fichier: string): string {
  if (!/^[0-9a-f-]{36}\.(jpg|pdf|mp4|webm|mov)$/.test(fichier)) {
    throw new Error("Nom de pièce jointe invalide.");
  }
  return path.join(RACINE_MESSAGERIE, fichier);
}

export async function copierPiece(fichier: string): Promise<string> {
  const extension = fichier.split(".").pop();
  const copie = `${randomUUID()}.${extension}`;
  await copyFile(cheminPiece(fichier), cheminPiece(copie));
  return copie;
}

export async function effacerPiece(fichier: string): Promise<void> {
  await rm(cheminPiece(fichier), { force: true });
}

export function mimePiece(fichier: string): string {
  const ext = fichier.split(".").pop();
  return (
    {
      jpg: "image/jpeg",
      pdf: "application/pdf",
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
    }[ext ?? ""] ?? "application/octet-stream"
  );
}
