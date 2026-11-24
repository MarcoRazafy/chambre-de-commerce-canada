import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { deflateRawSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ArchiveIllisible, ouvrirZip } from "@/lib/zip";

type Fichier = { nom: string; contenu: Buffer; compresser?: boolean; drapeaux?: number; tailleAnnoncee?: number };

function zipDe(fichiers: Fichier[]): Buffer {
  const locaux: Buffer[] = [];
  const centraux: Buffer[] = [];
  let decalage = 0;
  for (const f of fichiers) {
    const donnees = f.compresser ? deflateRawSync(f.contenu) : f.contenu;
    const nom = Buffer.from(f.nom);
    const taille = f.tailleAnnoncee ?? f.contenu.length;
    const l = Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50, 0);
    l.writeUInt16LE(f.drapeaux ?? 0, 6);
    l.writeUInt16LE(f.compresser ? 8 : 0, 8);
    l.writeUInt32LE(donnees.length, 18);
    l.writeUInt32LE(taille, 22);
    l.writeUInt16LE(nom.length, 26);
    locaux.push(l, nom, donnees);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(f.drapeaux ?? 0, 8);
    c.writeUInt16LE(f.compresser ? 8 : 0, 10);
    c.writeUInt32LE(donnees.length, 20);
    c.writeUInt32LE(taille, 24);
    c.writeUInt16LE(nom.length, 28);
    c.writeUInt32LE(decalage, 42);
    centraux.push(c, nom);
    decalage += 30 + nom.length + donnees.length;
  }
  const repertoire = Buffer.concat(centraux);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(fichiers.length, 8);
  fin.writeUInt16LE(fichiers.length, 10);
  fin.writeUInt32LE(repertoire.length, 12);
  fin.writeUInt32LE(decalage, 16);
  return Buffer.concat([...locaux, repertoire, fin]);
}

let dossier: string;
beforeAll(async () => {
  dossier = await mkdtemp(path.join(tmpdir(), "zip-test-"));
});
afterAll(async () => {
  await rm(dossier, { recursive: true, force: true });
});

async function archive(nom: string, octets: Buffer) {
  const chemin = path.join(dossier, nom);
  await writeFile(chemin, octets);
  return chemin;
}

describe("ouvrirZip", () => {
  it("lit et extrait les fichiers stockés et compressés, sans les dossiers", async () => {
    const texte = Buffer.from("bonjour ".repeat(500));
    const image = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
    const zip = await ouvrirZip(
      await archive("ok.zip", zipDe([
        { nom: "export/", contenu: Buffer.alloc(0) },
        { nom: "export/structure.json", contenu: texte, compresser: true },
        { nom: "export/fichiers/page.png", contenu: image },
        { nom: "vide.txt", contenu: Buffer.alloc(0) },
      ])),
    );
    try {
      expect([...zip.entrees.keys()]).toEqual(["export/structure.json", "export/fichiers/page.png", "vide.txt"]);
      expect(await zip.lire(zip.entrees.get("export/structure.json")!, 1e6)).toEqual(texte);
      expect(await zip.lire(zip.entrees.get("vide.txt")!, 1e6)).toEqual(Buffer.alloc(0));

      const sortie = path.join(dossier, "page.png");
      await zip.extraire(zip.entrees.get("export/fichiers/page.png")!, sortie);
      expect(await readFile(sortie)).toEqual(image);
      const sortie2 = path.join(dossier, "structure.json");
      await zip.extraire(zip.entrees.get("export/structure.json")!, sortie2);
      expect(await readFile(sortie2)).toEqual(texte);
      await expect(zip.lire(zip.entrees.get("export/structure.json")!, 10)).rejects.toThrow(ArchiveIllisible);
    } finally {
      await zip.fermer();
    }
  });

  it("refuse un fichier qui n’est pas un zip, ou protégé par un mot de passe", async () => {
    await expect(ouvrirZip(await archive("faux.zip", Buffer.from("pas un zip du tout, vraiment")))).rejects.toThrow(ArchiveIllisible);
    await expect(
      ouvrirZip(await archive("secret.zip", zipDe([{ nom: "a.txt", contenu: Buffer.from("x"), drapeaux: 1 }]))),
    ).rejects.toThrow("mot de passe");
  });

  it("refuse une archive tronquée", async () => {
    const complet = zipDe([{ nom: "a.png", contenu: Buffer.alloc(5000, 7) }]);
    const tronque = Buffer.concat([complet.subarray(0, 2000), complet.subarray(complet.length - 68)]);
    await expect(ouvrirZip(await archive("tronque.zip", tronque))).rejects.toThrow(ArchiveIllisible);
  });

  it("n’écrit rien quand la taille annoncée ne correspond pas", async () => {
    const zip = await ouvrirZip(
      await archive("menteur.zip", zipDe([{ nom: "a.bin", contenu: Buffer.alloc(100, 1), tailleAnnoncee: 40 }])),
    );
    try {
      const sortie = path.join(dossier, "a.bin");
      await expect(zip.extraire(zip.entrees.get("a.bin")!, sortie)).rejects.toThrow(ArchiveIllisible);
      await expect(stat(sortie)).rejects.toThrow();
      await expect(zip.lire(zip.entrees.get("a.bin")!, 1e6)).rejects.toThrow(ArchiveIllisible);
    } finally {
      await zip.fermer();
    }
  });
});
