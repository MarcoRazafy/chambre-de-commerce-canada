import { existsSync } from "node:fs";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { racine, crees, echec } = vi.hoisted(() => {
  const racine = `${process.env.TMPDIR ?? "/tmp"}/import-ressources-${process.pid}`;
  process.env.STOCKAGE_RACINE = racine;
  return { racine, crees: { dossiers: [] as Record<string, unknown>[], ressources: [] as Record<string, unknown>[] }, echec: { actif: false } };
});

vi.mock("@/lib/db", () => ({
  prismaSysteme: {
    $transaction: async (fn: (tx: unknown) => Promise<void>) => {
      const local = { dossiers: [] as Record<string, unknown>[], ressources: [] as Record<string, unknown>[] };
      await fn({
        dossierRessource: { create: async ({ data }: { data: Record<string, unknown> }) => local.dossiers.push(data) },
        resource: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            if (echec.actif) throw new Error("base indisponible");
            local.ressources.push(data);
          },
        },
      });
      crees.dossiers.push(...local.dossiers);
      crees.ressources.push(...local.ressources);
    },
  },
}));
vi.mock("@/lib/televersements", () => ({ fichierRecu: async () => null, envoiEnAttente: async () => null }));

import { importerArchive } from "@/lib/import-ressources";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]);

function zipDe(fichiers: Record<string, Buffer>): Buffer {
  const locaux: Buffer[] = [];
  const centraux: Buffer[] = [];
  let decalage = 0;
  for (const [n, contenu] of Object.entries(fichiers)) {
    const nom = Buffer.from(n);
    const l = Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50, 0);
    l.writeUInt32LE(contenu.length, 18);
    l.writeUInt32LE(contenu.length, 22);
    l.writeUInt16LE(nom.length, 26);
    locaux.push(l, nom, contenu);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt32LE(contenu.length, 20);
    c.writeUInt32LE(contenu.length, 24);
    c.writeUInt16LE(nom.length, 28);
    c.writeUInt32LE(decalage, 42);
    centraux.push(c, nom);
    decalage += 30 + nom.length + contenu.length;
  }
  const rep = Buffer.concat(centraux);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(centraux.length / 2, 8);
  fin.writeUInt16LE(centraux.length / 2, 10);
  fin.writeUInt32LE(rep.length, 12);
  fin.writeUInt32LE(decalage, 16);
  return Buffer.concat([...locaux, rep, fin]);
}

const structure = {
  dossiers: [
    { id: "d-enfant", nom: "Sous-dossier", parentId: "d-parent", restreint: false },
    { id: "d-parent", nom: "Dossier", parentId: null, restreint: true, cover: "/televersements/dossier-aaa.jpg", auteurPhoto: "/televersements/auteur-absent.jpg" },
  ],
  ressources: [
    { id: "r-pdf", titre: "Guide", cat: "Guide", fmt: "PDF", taille: "1 Mo", date: "2026-09-22", type: "gratuit", prix: 0, fichier: "document.pdf", pages: 2, cover: "/televersements/ressource-pdf.jpg", dossierId: "d-parent", ordre: 1, createdAt: "2026-09-22T12:37:33.929" },
    { id: "r-page", titre: "Article", cat: "Formation", fmt: "Page", taille: "?", date: "2026-10-21", type: "gratuit", prix: 0, dossierId: "d-enfant", contenu: [{ type: "photo", fichier: "photo-0123456789abcdef.webp" }, { type: "photo", fichier: "photo-fedcba9876543210.webp" }, { type: "texte", lignes: [{ genre: "p", passages: [{ t: "Bonjour à tous" }] }] }] },
    { id: "r-video", titre: "Vidéo", cat: "Guide", fmt: "Vidéo", taille: "160 Mo", date: "2026-10-28", type: "gratuit", prix: 0, fichier: "video.mp4", dossierId: "d-parent" },
    { id: "r-trou", titre: "Incomplet", cat: "Guide", fmt: "PDF", taille: "1 Mo", date: "2026-10-28", type: "gratuit", prix: 0, fichier: "document.pdf", pages: 3, dossierId: "inconnu" },
  ],
};

const fichiers = {
  "export/structure.json": Buffer.from(JSON.stringify(structure)),
  "export/fichiers/televersements/dossier-aaa.jpg": JPG,
  "export/fichiers/televersements/ressource-pdf.jpg": JPG,
  "export/fichiers/ressources/r-pdf/pages/page-001.png": PNG,
  "export/fichiers/ressources/r-pdf/pages/page-002.png": PNG,
  "export/fichiers/ressources/r-page/blocs/photo-0123456789abcdef.webp": WEBP,
  "export/fichiers/ressources/r-trou/pages/page-001.png": PNG,
};

let n = 0;
async function archive(contenu: Record<string, Buffer>) {
  const dossier = await mkdtemp(path.join(tmpdir(), "import-zip-"));
  const chemin = path.join(dossier, `a${n++}.zip`);
  await writeFile(chemin, zipDe(contenu));
  return chemin;
}

beforeEach(async () => {
  crees.dossiers.length = 0;
  crees.ressources.length = 0;
  echec.actif = false;
  await rm(racine, { recursive: true, force: true });
});
afterAll(async () => {
  await rm(racine, { recursive: true, force: true });
});

describe("importerArchive", () => {
  it("recrée dossiers et ressources avec leurs fichiers, et signale ce qui manque", async () => {
    const bilan = await importerArchive(await archive(fichiers), "chambre-1");

    expect(bilan.dossiers).toBe(2);
    expect(bilan.ressources).toBe(2);
    expect(bilan.ignorees).toEqual([
      { titre: "Vidéo", raison: "vidéo absente de l’archive" },
      { titre: "Incomplet", raison: "pages absentes de l’archive" },
    ]);

    const [parent, enfant] = crees.dossiers;
    expect(parent).toMatchObject({ chambreId: "chambre-1", nom: "Dossier", restreint: true, auteurPhoto: null, parentId: null });
    expect(enfant).toMatchObject({ nom: "Sous-dossier", parentId: parent.id });
    expect(String(parent.cover)).toMatch(/^\/televersements\/dossier-[0-9a-f]{12}\.jpg$/);

    const [pdf, page] = crees.ressources;
    expect(pdf).toMatchObject({ chambreId: "chambre-1", titre: "Guide", cat: "guide", fmt: "pdf", pages: 2, fichier: "document.pdf", dossierId: parent.id, ordre: 1 });
    expect(pdf.createdAt).toEqual(new Date("2026-09-22T12:37:33.929Z"));
    expect(String(pdf.cover)).toMatch(/^\/televersements\/ressource-[0-9a-f]{12}\.jpg$/);
    expect(await readdir(path.join(racine, "ressources", String(pdf.id), "pages"))).toEqual(["page-001.png", "page-002.png"]);

    expect(page).toMatchObject({ cat: "formation", fmt: "page", pages: null, fichier: null, dossierId: enfant.id, taille: "1 photo" });
    expect(page.contenu).toEqual([
      { type: "photo", fichier: "photo-0123456789abcdef.webp" },
      { type: "texte", lignes: [{ genre: "p", passages: [{ t: "Bonjour à tous" }] }] },
    ]);
    expect(existsSync(path.join(racine, "ressources", String(page.id), "blocs", "photo-0123456789abcdef.webp"))).toBe(true);

    expect((await readdir(path.join(racine, "ressources"))).sort()).toEqual([String(pdf.id), String(page.id)].sort());
  });

  it("n’ajoute rien et efface les fichiers copiés si la base refuse", async () => {
    echec.actif = true;
    await expect(importerArchive(await archive(fichiers), "chambre-1")).rejects.toThrow("base indisponible");
    expect(crees.ressources).toEqual([]);
    expect(await readdir(path.join(racine, "ressources"))).toEqual([]);
    expect(await readdir(path.join(racine, "televersements"))).toEqual([]);
  });

  it("refuse une archive sans structure.json", async () => {
    await expect(importerArchive(await archive({ "a.txt": Buffer.from("x") }), "chambre-1")).rejects.toThrow("structure.json");
  });
});
