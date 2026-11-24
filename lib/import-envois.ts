import "server-only";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, rm, stat, truncate, writeFile } from "node:fs/promises";
import path from "node:path";
import { dossierStockage } from "@/lib/stockage";

const DOSSIER = dossierStockage("imports-en-cours");
const DUREE_DE_VIE = 24 * 60 * 60 * 1000;
const IDENTIFIANT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const PLAFOND_IMPORT_MO = 2048;
export const MORCEAU_MAX = 16 * 1024 * 1024;
const PLAFOND_IMPORT = PLAFOND_IMPORT_MO * 1024 * 1024;

export class EnvoiImportRefuse extends Error {}
export class DecalageImport extends Error {
  constructor(readonly recu: number) {
    super("Envoi désordonné.");
  }
}

interface Fiche {
  gmId: string;
  creeLe: number;
}

const chemins = (jeton: string) => {
  const base = path.join(DOSSIER, jeton);
  return { archive: `${base}.zip`, fiche: `${base}.json` };
};

async function ficheValide(gmId: string, jeton: string): Promise<boolean> {
  if (!IDENTIFIANT.test(jeton)) return false;
  try {
    const f = JSON.parse(await readFile(chemins(jeton).fiche, "utf8")) as Fiche;
    if (f.gmId !== gmId) return false;
    if (Date.now() - f.creeLe > DUREE_DE_VIE) {
      await oublierImport(jeton);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function recevoirMorceau(
  gmId: string,
  jetonRecu: string | null,
  decalage: number,
  corps: ReadableStream<Uint8Array>,
): Promise<{ jeton: string; recu: number }> {
  let jeton = jetonRecu;
  if (!jeton) {
    if (decalage !== 0) throw new EnvoiImportRefuse("Envoi inconnu : recommencez.");
    await mkdir(DOSSIER, { recursive: true });
    void menage();
    jeton = randomUUID();
    await writeFile(chemins(jeton).archive, "");
    await writeFile(chemins(jeton).fiche, JSON.stringify({ gmId, creeLe: Date.now() } satisfies Fiche));
  } else if (!(await ficheValide(gmId, jeton))) {
    throw new EnvoiImportRefuse("Envoi expiré : recommencez.");
  }

  const { archive } = chemins(jeton);
  const deja = (await stat(archive)).size;
  if (deja !== decalage) throw new DecalageImport(deja);

  const sortie = createWriteStream(archive, { flags: "r+", start: decalage });
  let ecrits = 0;
  try {
    const lecteur = corps.getReader();
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      ecrits += value.byteLength;
      if (ecrits > MORCEAU_MAX || decalage + ecrits > PLAFOND_IMPORT) {
        await lecteur.cancel();
        throw new EnvoiImportRefuse(`L’archive dépasse ${PLAFOND_IMPORT_MO / 1024} Go.`);
      }
      if (!sortie.write(value)) await new Promise<void>((ok) => sortie.once("drain", () => ok()));
    }
    await new Promise<void>((ok, ko) => sortie.end((e?: Error | null) => (e ? ko(e) : ok())));
  } catch (e) {
    sortie.destroy();
    await truncate(archive, decalage).catch(() => {});
    throw e;
  }
  return { jeton, recu: decalage + ecrits };
}

export async function archiveRecue(gmId: string, jeton: string): Promise<string | null> {
  if (!(await ficheValide(gmId, jeton))) return null;
  return chemins(jeton).archive;
}

export async function oublierImport(jeton: string): Promise<void> {
  if (!IDENTIFIANT.test(jeton)) return;
  const { archive, fiche } = chemins(jeton);
  await rm(archive, { force: true });
  await rm(fiche, { force: true });
}

async function menage() {
  try {
    for (const nom of await readdir(DOSSIER)) {
      const chemin = path.join(DOSSIER, nom);
      if (Date.now() - (await stat(chemin)).mtimeMs > DUREE_DE_VIE) await rm(chemin, { force: true });
    }
  } catch {}
}
