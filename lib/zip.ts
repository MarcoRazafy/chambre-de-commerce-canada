import "server-only";
import { createReadStream, createWriteStream } from "node:fs";
import { open, rm, type FileHandle } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createInflateRaw, inflateRawSync } from "node:zlib";

export class ArchiveIllisible extends Error {}

export interface EntreeZip {
  nom: string;
  methode: number;
  compressee: number;
  taille: number;
  entete: number;
}

const FIN = 0x06054b50;
const CENTRALE = 0x02014b50;
const LOCALE = 0x04034b50;

async function lireA(f: FileHandle, position: number, longueur: number): Promise<Buffer> {
  const tampon = Buffer.alloc(longueur);
  const { bytesRead } = await f.read(tampon, 0, longueur, position);
  if (bytesRead !== longueur) throw new ArchiveIllisible("L’archive est incomplète.");
  return tampon;
}

export async function ouvrirZip(chemin: string) {
  const f = await open(chemin, "r");
  try {
    const poids = (await f.stat()).size;
    const queue = Math.min(poids, 22 + 0xffff);
    if (queue < 22) throw new ArchiveIllisible("Ce fichier n’est pas une archive zip.");
    const fin = await lireA(f, poids - queue, queue);
    let i = fin.length - 22;
    while (i >= 0 && fin.readUInt32LE(i) !== FIN) i--;
    if (i < 0) throw new ArchiveIllisible("Ce fichier n’est pas une archive zip.");

    const nombre = fin.readUInt16LE(i + 10);
    const tailleRepertoire = fin.readUInt32LE(i + 12);
    const debutRepertoire = fin.readUInt32LE(i + 16);
    if (nombre === 0xffff || debutRepertoire === 0xffffffff) {
      throw new ArchiveIllisible("L’archive est trop grande.");
    }
    if (debutRepertoire + tailleRepertoire > poids) {
      throw new ArchiveIllisible("L’archive est incomplète.");
    }

    const rep = await lireA(f, debutRepertoire, tailleRepertoire);
    const entrees = new Map<string, EntreeZip>();
    let p = 0;
    for (let n = 0; n < nombre; n++) {
      if (p + 46 > rep.length || rep.readUInt32LE(p) !== CENTRALE) {
        throw new ArchiveIllisible("L’archive est abîmée.");
      }
      const drapeaux = rep.readUInt16LE(p + 8);
      const methode = rep.readUInt16LE(p + 10);
      const compressee = rep.readUInt32LE(p + 20);
      const taille = rep.readUInt32LE(p + 24);
      const lNom = rep.readUInt16LE(p + 28);
      const lExtra = rep.readUInt16LE(p + 30);
      const lNote = rep.readUInt16LE(p + 32);
      const entete = rep.readUInt32LE(p + 42);
      const nom = rep.subarray(p + 46, p + 46 + lNom).toString("utf8").replace(/\\/g, "/");
      p += 46 + lNom + lExtra + lNote;

      if (nom.endsWith("/")) continue;
      if (drapeaux & 1) throw new ArchiveIllisible("L’archive est protégée par un mot de passe.");
      if (compressee === 0xffffffff || taille === 0xffffffff || entete === 0xffffffff) {
        throw new ArchiveIllisible("L’archive contient un fichier trop grand.");
      }
      entrees.set(nom, { nom, methode, compressee, taille, entete });
    }

    async function debutDonnees(e: EntreeZip): Promise<number> {
      const locale = await lireA(f, e.entete, 30);
      if (locale.readUInt32LE(0) !== LOCALE) throw new ArchiveIllisible("L’archive est abîmée.");
      const debut = e.entete + 30 + locale.readUInt16LE(26) + locale.readUInt16LE(28);
      if (debut + e.compressee > poids) throw new ArchiveIllisible("L’archive est incomplète.");
      if (e.methode !== 0 && e.methode !== 8) {
        throw new ArchiveIllisible(`« ${e.nom} » est compressé d’une façon non prise en charge.`);
      }
      return debut;
    }

    return {
      entrees,

      async lire(e: EntreeZip, plafond: number): Promise<Buffer> {
        if (e.taille > plafond) throw new ArchiveIllisible(`« ${e.nom} » est trop gros.`);
        const brut = e.compressee ? await lireA(f, await debutDonnees(e), e.compressee) : Buffer.alloc(0);
        let octets: Buffer;
        try {
          octets = e.methode === 8 ? inflateRawSync(brut, { maxOutputLength: Math.max(1, e.taille) }) : brut;
        } catch {
          throw new ArchiveIllisible(`« ${e.nom} » est abîmé dans l’archive.`);
        }
        if (octets.length !== e.taille) throw new ArchiveIllisible(`« ${e.nom} » est abîmé dans l’archive.`);
        return octets;
      },

      async extraire(e: EntreeZip, destination: string): Promise<void> {
        const debut = await debutDonnees(e);
        const source: Readable = e.compressee
          ? createReadStream(chemin, { start: debut, end: debut + e.compressee - 1 })
          : Readable.from([]);
        let ecrits = 0;
        const compteur = async function* (flux: AsyncIterable<Buffer>) {
          for await (const morceau of flux) {
            ecrits += morceau.length;
            if (ecrits > e.taille) throw new ArchiveIllisible(`« ${e.nom} » est abîmé dans l’archive.`);
            yield morceau;
          }
        };
        try {
          if (e.methode === 8) await pipeline(source, createInflateRaw(), compteur, createWriteStream(destination));
          else await pipeline(source, compteur, createWriteStream(destination));
        } catch (erreur) {
          await rm(destination, { force: true });
          if (erreur instanceof ArchiveIllisible) throw erreur;
          throw new ArchiveIllisible(`« ${e.nom} » est abîmé dans l’archive.`);
        }
        if (ecrits !== e.taille) {
          await rm(destination, { force: true });
          throw new ArchiveIllisible(`« ${e.nom} » est abîmé dans l’archive.`);
        }
      },

      fermer: () => f.close(),
    };
  } catch (e) {
    await f.close();
    throw e;
  }
}

export type Zip = Awaited<ReturnType<typeof ouvrirZip>>;
