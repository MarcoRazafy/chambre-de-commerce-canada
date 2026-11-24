import "server-only";

import path from "node:path";
import sharp from "sharp";
import { DOSSIER_TELEVERSEMENTS } from "@/lib/uploads";

export type CadreLogo = { x: number; y: number; l: number; h: number; ratio: number };

const memoire = new Map<string, CadreLogo | null>();

function fichierLocal(src: string): string | null {
  const nom = path.basename(src.split("?")[0]);
  if (!/^[\w.-]+$/.test(nom)) return null;
  if (src.startsWith("/televersements/")) return path.join(DOSSIER_TELEVERSEMENTS, nom);
  if (src.startsWith("/marque/")) return path.join(process.cwd(), "public", "marque", nom);
  return null;
}

export async function cadreVisible(src: string | null | undefined): Promise<CadreLogo | null> {
  if (!src) return null;
  if (memoire.has(src)) return memoire.get(src) ?? null;
  const fichier = fichierLocal(src);
  let cadre: CadreLogo | null = null;
  if (fichier) {
    try {
      const { width, height } = await sharp(fichier).metadata();
      const { info } = await sharp(fichier).trim({ threshold: 12 }).toBuffer({ resolveWithObject: true });
      if (width && height && info.width && info.height) {
        cadre = {
          x: -(info.trimOffsetLeft ?? 0) / width,
          y: -(info.trimOffsetTop ?? 0) / height,
          l: info.width / width,
          h: info.height / height,
          ratio: width / height,
        };
      }
    } catch {
      cadre = null;
    }
  }
  if (memoire.size > 200) memoire.clear();
  memoire.set(src, cadre);
  return cadre;
}
