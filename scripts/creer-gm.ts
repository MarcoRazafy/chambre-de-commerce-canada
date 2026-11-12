// Crée (ou remet le mot de passe d') un compte Admin GM : npm run gm:creer -- --email … --nom …
// Le mot de passe est demandé sans s'afficher (ou lu dans GM_MOT_DE_PASSE, sans terminal).
import "dotenv/config";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { prismaSysteme } from "../lib/db";
import { hacher, MOT_DE_PASSE_MIN } from "../lib/mots-de-passe";

const { values } = parseArgs({ options: { email: { type: "string" }, nom: { type: "string" } } });

function arreter(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

function demanderCache(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let masque = false;
    const sortie = rl as unknown as { _writeToOutput: (s: string) => void };
    sortie._writeToOutput = (s) => {
      if (!masque) process.stdout.write(s);
    };
    rl.question(question, (reponse) => {
      rl.close();
      process.stdout.write("\n");
      resolve(reponse);
    });
    masque = true;
  });
}

async function motDePasse(): Promise<string> {
  const fourni = process.env.GM_MOT_DE_PASSE;
  if (fourni !== undefined) return fourni;
  if (!process.stdin.isTTY) arreter("Pas de terminal pour saisir le mot de passe : définissez GM_MOT_DE_PASSE.");
  const premier = await demanderCache("  Mot de passe : ");
  const second = await demanderCache("  Confirmation : ");
  if (premier !== second) arreter("Les deux mots de passe ne correspondent pas.");
  return premier;
}

async function main() {
  const email = values.email?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) arreter("Indiquez l'adresse : --email vous@exemple.com");
  const existant = await prismaSysteme.compteGM.findUnique({ where: { email }, select: { nom: true } });
  const nom = values.nom?.trim() || existant?.nom || "";
  if (!nom) arreter("Indiquez le nom : --nom \"Prénom Nom\"");
  const mdp = await motDePasse();
  if (mdp.length < MOT_DE_PASSE_MIN) arreter(`Le mot de passe fait au moins ${MOT_DE_PASSE_MIN} caractères.`);
  await prismaSysteme.compteGM.upsert({
    where: { email },
    create: { email, nom, motDePasse: hacher(mdp) },
    update: { nom, motDePasse: hacher(mdp), motDePasseModifieLe: new Date() },
  });
  console.log(`\n  Compte Admin GM ${existant ? "mis à jour" : "créé"} : ${nom} <${email}>\n`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
