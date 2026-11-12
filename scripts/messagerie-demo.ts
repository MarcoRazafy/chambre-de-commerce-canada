import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { avecChambre, CHAMBRE_PRINCIPALE } from "../lib/chambre-courante";
import { prisma } from "../lib/db";
import { RACINE_MESSAGERIE, recevoirPiece } from "../lib/stockage-messagerie";

const executer = promisify(execFile);
const VIDEO =
  "https://videos.pexels.com/video-files/8716788/8716788-sd_640_360_25fps.mp4";

const catalogue = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
body{font-family:"Liberation Sans",Arial,sans-serif;font-size:11pt;color:#1b2733;line-height:1.5}
h1{color:#0f1d2c;font-size:22pt}h2{color:#ad0707;font-size:14pt;border-bottom:1pt solid #ad0707}
td,th{padding:5pt 7pt;border-bottom:.5pt solid #c9d1d9;text-align:left}th{background:#0f1d2c;color:#fff}
</style></head><body>
<p style="color:#007140;font-size:9pt;font-weight:bold">HIGHLANDS ARTISANAT — CATALOGUE EXPORT 2026</p>
<h1>Paniers, sculptures et textiles des Hautes Terres</h1>
<p>Sélection proposée aux distributeurs canadiens. Prix FOB Toamasina, par lot.</p>
<h2>Gamme</h2>
<table><tr><th>Référence</th><th>Produit</th><th>Lot minimum</th></tr>
<tr><td>HA-P01</td><td>Panier raphia XL, 50 cm</td><td>20 pièces</td></tr>
<tr><td>HA-S04</td><td>Sculpture palissandre, bois certifié</td><td>5 pièces</td></tr>
<tr><td>HA-T02</td><td>Lamba tissé, coton et soie sauvage</td><td>10 pièces</td></tr></table>
<p style="color:#6b7785;font-size:8.5pt;margin-top:24pt">Document de démonstration de la plateforme CanCham Connect.</p>
</body></html>`;

const fichier = (octets: Buffer, nom: string, type: string) =>
  new File([new Uint8Array(octets)], nom, { type });

async function main() {
  await rm(RACINE_MESSAGERIE, { recursive: true, force: true });
  await prisma.pieceJointe.deleteMany();

  const tmp = path.join(process.cwd(), "stockage", ".demo-messagerie");
  await mkdir(tmp, { recursive: true });

  await writeFile(path.join(tmp, "catalogue.html"), catalogue, "utf-8");
  await executer(
    "soffice",
    [
      "--headless",
      "--infilter=HTML (StarWriter)",
      "--convert-to",
      "pdf",
      "--outdir",
      tmp,
      path.join(tmp, "catalogue.html"),
    ],
    { timeout: 180_000 },
  );
  const pdf = await readFile(path.join(tmp, "catalogue.pdf"));

  await executer("curl", [
    "-sS",
    "-L",
    "--max-time",
    "120",
    "-o",
    path.join(tmp, "video.mp4"),
    VIDEO,
  ]);
  const video = await readFile(path.join(tmp, "video.mp4"));

  const photo = (n: string) =>
    readFile(path.join(process.cwd(), "public", "photos", n));

  const t1 = await prisma.messageThread.findUniqueOrThrow({
    where: { id: "t1" },
    include: { messages: { orderBy: { sentAt: "asc" } } },
  });
  const [premier, second] = t1.messages;
  const entre = new Date(
    (premier.sentAt.getTime() + second.sentAt.getTime()) / 2,
  );

  const piecesCatalogue = [
    await recevoirPiece(
      fichier(
        pdf,
        "Catalogue export 2026 — Highlands Artisanat.pdf",
        "application/pdf",
      ),
    ),
    await recevoirPiece(
      fichier(
        await photo("cancham-26.jpg"),
        "stand-canada-expo.jpg",
        "image/jpeg",
      ),
    ),
    await recevoirPiece(
      fichier(
        await photo("cancham-02.jpg"),
        "rencontre-acheteurs.jpg",
        "image/jpeg",
      ),
    ),
  ].filter((p) => p !== null);

  await prisma.message.create({
    data: {
      threadId: t1.id,
      auteur: premier.auteur,
      userId: premier.userId,
      sentAt: entre,
      texte:
        "Voici notre catalogue export, et deux photos de notre stand au dernier Canada Expo.",
      piecesJointes: { create: piecesCatalogue },
    },
  });

  const t2 = await prisma.messageThread.findUniqueOrThrow({
    where: { id: "t2" },
    include: { messages: { orderBy: { sentAt: "asc" } } },
  });
  const avantDernier = t2.messages.at(-1)!;
  const premierT2 = t2.messages[0];
  const replay = await recevoirPiece(
    fichier(video, "extrait-atelier-mobilite.mp4", "video/mp4"),
  );

  await prisma.message.create({
    data: {
      threadId: t2.id,
      auteur: premierT2.auteur,
      userId: premierT2.userId,
      sentAt: new Date(avantDernier.sentAt.getTime() - 60_000),
      texte: "Comme promis, un extrait de l’atelier mobilité francophone.",
      piecesJointes: { create: replay ? [replay] : [] },
    },
  });

  await rm(tmp, { recursive: true, force: true });
  const total = await prisma.pieceJointe.count();
  console.log(`  ${total} pièces jointes déposées (PDF, images, vidéo)`);
  await prisma.$disconnect();
}

avecChambre(process.env.CHAMBRE || CHAMBRE_PRINCIPALE, main);
