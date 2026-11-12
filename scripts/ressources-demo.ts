import { execFile } from "node:child_process";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { avecChambre, CHAMBRE_PRINCIPALE } from "../lib/chambre-courante";
import { prisma } from "../lib/db";
import { fmtCotisation, libelleFormule } from "../lib/membership";
import { dossierRessource, preparerDocument } from "../lib/stockage-ressources";

const executer = promisify(execFile);

const VIDEO =
  "https://videos.pexels.com/video-files/8716788/8716788-sd_640_360_25fps.mp4";

const saut = '<p style="page-break-before: always"></p>';

function gabarit(titre: string, surtitre: string, corps: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<style>
  body { font-family: "Liberation Sans", Arial, sans-serif; font-size: 11pt; color: #1b2733; line-height: 1.5; }
  .surtitre { color: #007140; font-size: 9pt; font-weight: bold; letter-spacing: 1pt; text-transform: uppercase; }
  h1 { color: #0f1d2c; font-size: 22pt; margin: 4pt 0 14pt; }
  h2 { color: #ad0707; font-size: 14pt; margin: 18pt 0 6pt; border-bottom: 1pt solid #ad0707; padding-bottom: 2pt; }
  h3 { color: #0f1d2c; font-size: 11.5pt; margin: 12pt 0 4pt; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  th { background: #0f1d2c; color: #fff; text-align: left; padding: 5pt 7pt; font-size: 10pt; }
  td { border-bottom: 0.5pt solid #c9d1d9; padding: 5pt 7pt; font-size: 10pt; vertical-align: top; }
  .note { background: #eef6f1; border-left: 3pt solid #007140; padding: 6pt 9pt; font-size: 9.5pt; }
  .pied { color: #6b7785; font-size: 8.5pt; margin-top: 24pt; }
  .case { font-family: "Liberation Mono", monospace; }
</style></head><body>
<p class="surtitre">CanCham — ${surtitre}</p>
<h1>${titre}</h1>
${corps}
<p class="pied">Chambre de Commerce et de Coopération Canada–Madagascar · Document de démonstration de la plateforme CanCham Connect — contenu indicatif, à faire valider avant tout usage.</p>
</body></html>`;
}

const liste = (items: string[]) =>
  `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const cases = (items: string[]) =>
  `<table>${items.map((i) => `<tr><td class="case" style="width:18pt">☐</td><td>${i}</td></tr>`).join("")}</table>`;

const CONTENUS: Record<string, { surtitre: string; corps: string }> = {
  r1: {
    surtitre: "Guide pratique",
    corps: `
<p>Ce guide accompagne les entreprises malgaches qui préparent une première approche du marché canadien. Il ne remplace pas un conseil juridique ou fiscal : il aide à poser les bonnes questions, dans le bon ordre.</p>
<h2>1. Comprendre le marché</h2>
<p>Le Canada est un marché fédéral : certaines règles relèvent d'Ottawa (douanes, normes nationales), d'autres des provinces (fiscalité provinciale, langue, distribution). Le Québec, francophone, est souvent la porte d'entrée naturelle des entreprises malgaches.</p>
${liste([
  "Identifier la province visée avant de chiffrer les coûts d'accès.",
  "Vérifier si le produit relève d'une réglementation particulière (alimentaire, cosmétique, bois).",
  "Étudier les canaux : importateur-distributeur, vente directe aux détaillants, commerce en ligne.",
])}
<h2>2. Préparer son offre</h2>
<p>Les acheteurs canadiens attendent une offre stable : volumes garantis, qualité constante, délais tenus. Un premier contrat se gagne souvent sur la fiabilité plus que sur le prix.</p>
${saut}
<h2>3. Étiquetage et normes</h2>
<p>L'étiquetage bilingue français–anglais est la règle pour la plupart des produits de consommation. Les produits alimentaires et cosmétiques obéissent à des exigences spécifiques de composition et de présentation.</p>
<div class="note">Conseil CanCham : faites relire votre étiquette par un distributeur canadien avant la première production en série. Une étiquette refusée coûte plus cher qu'une relecture.</div>
<h2>4. Logistique et paiement</h2>
<table><tr><th>Étape</th><th>Point d'attention</th></tr>
<tr><td>Incoterm</td><td>Préciser qui supporte le transport et l'assurance (FOB, CIF…).</td></tr>
<tr><td>Transport</td><td>Maritime depuis Toamasina, compter plusieurs semaines de transit.</td></tr>
<tr><td>Paiement</td><td>Privilégier le crédit documentaire pour une première opération.</td></tr>
</table>
<h2>5. Où trouver de l'aide</h2>
<p>L'équipe CanCham oriente vers les partenaires utiles au Canada et à Madagascar, et organise chaque année des missions économiques pour rencontrer des acheteurs sur place.</p>`,
  },
  r2: {
    surtitre: "Modèle",
    corps: `
<p>Modèle de facture commerciale à adapter pour une expédition vers le Canada. Remplacez les champs entre crochets.</p>
<h2>Exportateur</h2>
<table><tr><td style="width:40%">Raison sociale</td><td>[Nom de l'entreprise]</td></tr>
<tr><td>Adresse</td><td>[Adresse complète, Madagascar]</td></tr>
<tr><td>NIF / STAT</td><td>[Numéros d'identification]</td></tr></table>
<h2>Destinataire</h2>
<table><tr><td style="width:40%">Raison sociale</td><td>[Nom de l'importateur]</td></tr>
<tr><td>Adresse</td><td>[Adresse complète, Canada]</td></tr></table>
<h2>Détail de l'expédition</h2>
<table><tr><th>Désignation</th><th>Code SH</th><th>Quantité</th><th>Prix unitaire</th><th>Total</th></tr>
<tr><td>[Produit]</td><td>[0000.00]</td><td>[0]</td><td>[0,00]</td><td>[0,00]</td></tr>
<tr><td>[Produit]</td><td>[0000.00]</td><td>[0]</td><td>[0,00]</td><td>[0,00]</td></tr></table>
<table><tr><td style="width:60%">Incoterm</td><td>[FOB Toamasina]</td></tr>
<tr><td>Devise</td><td>[CAD / USD]</td></tr>
<tr><td>Pays d'origine</td><td>Madagascar</td></tr></table>
<p>Fait à [ville], le [date]. Signature et cachet de l'exportateur.</p>`,
  },
  r4: {
    surtitre: "Rapport technique",
    corps: `
<p>Restitution des résultats de la 8ᵉ Mission Économique et Commerciale au Canada.</p>
<h2>Synthèse</h2>
<p>La mission a réuni une délégation d'entreprises malgaches autour de rencontres d'affaires ciblées au Québec et en Ontario. Ce rapport présente les rendez-vous tenus, les suites engagées et les enseignements pour l'édition suivante.</p>
<h2>Déroulé</h2>
${liste(["Préparation des entreprises et des dossiers de présentation.", "Rencontres d'affaires individuelles avec des importateurs.", "Visites de salons professionnels.", "Suivi des contacts après le retour."])}
${saut}
<h2>Enseignements</h2>
<p>Les entreprises les mieux préparées — échantillons, fiches techniques bilingues, tarifs export établis — ont obtenu l'essentiel des suites. La préparation en amont reste le premier facteur de réussite.</p>
<div class="note">Recommandation : démarrer la préparation de la MECC suivante au moins six mois avant le départ.</div>`,
  },
  r5: {
    surtitre: "Kit d'adhésion",
    corps: `
<p>Tout ce qu'il faut savoir pour rejoindre la Chambre de Commerce et de Coopération Canada–Madagascar.</p>
<h2>Grille tarifaire ${new Date().getFullYear()}</h2>
<table><tr><th>Formule</th><th>Cotisation annuelle</th></tr>
{{grille}}
</table>
<p>Les formules en dollars canadiens concernent les adhérents établis au Canada, et les partenaires et commanditaires de la chambre.</p>
<h2>Ce que comprend l'adhésion</h2>
${liste(["Une fiche entreprise dans l'annuaire des membres.", "L'accès aux événements du réseau, dont les 5 à 7 réseautage.", "Les ressources incluses : guides, modèles, replays.", "La mise en relation avec des partenaires au Canada."])}
${saut}
<h2>Étapes d'adhésion</h2>
<table><tr><th>Étape</th><th>Ce qui se passe</th></tr>
<tr><td>1. Candidature</td><td>Formulaire en ligne : entreprise, contact, formule, motivations.</td></tr>
<tr><td>2. Validation</td><td>L'équipe examine la demande et revient vers vous.</td></tr>
<tr><td>3. Cotisation</td><td>Règlement selon la formule choisie.</td></tr>
<tr><td>4. Accès</td><td>L'espace membre est activé.</td></tr></table>
<p class="note">Nombre de formules : {{nombre}}. Les montants de ce document sont tirés de la grille de la plateforme.</p>`,
  },
  r7: {
    surtitre: "Check-list",
    corps: `
<p>Liste de contrôle à parcourir avant une expédition de Madagascar vers le Canada. À cocher au fur et à mesure.</p>
<h2>Documents commerciaux</h2>
${cases(["Facture commerciale complète et signée.", "Liste de colisage détaillée.", "Certificat d'origine.", "Contrat ou bon de commande de l'acheteur."])}
<h2>Transport</h2>
${cases(["Incoterm convenu par écrit.", "Connaissement maritime ou lettre de transport aérien.", "Assurance marchandises, selon l'incoterm."])}
${saut}
<h2>Conformité du produit</h2>
${cases(["Étiquetage bilingue français–anglais vérifié.", "Exigences sanitaires ou phytosanitaires identifiées pour le produit.", "Certificats spécifiques (biologique, bois, cosmétique) si applicables.", "Code du Système harmonisé confirmé avec le transitaire."])}
<h2>Paiement</h2>
${cases(["Mode de paiement confirmé.", "Coordonnées bancaires de l'acheteur vérifiées."])}`,
  },
  r8: {
    surtitre: "Modèle",
    corps: `
<p>Modèle pour préparer la présentation d'un produit ou d'un service dans l'annuaire des membres CanCham. Une fiche claire facilite la mise en relation.</p>
<h2>Titre de l'offre</h2>
<p>[Un titre court et précis — ex. « Huile essentielle de ravintsara, 10 ml »]</p>
<h2>Nature</h2>
<p>[Produit / Service]</p>
<h2>Description</h2>
<p>[Ce que l'offre comprend, pour qui, à quelles conditions. Deux ou trois phrases.]</p>
<h2>Prix indicatif</h2>
<p>[« 25 000 Ar le flacon », « À partir de 300 $ », « Sur devis »]</p>
<h2>Photos</h2>
<p>Jusqu'à cinq photos, la première servant de vignette. Préférez une lumière naturelle et un fond neutre.</p>
<div class="note">Astuce : dans l'espace membre, ouvrez « Mon entreprise » puis « Ajouter un service » pour publier directement votre fiche.</div>`,
  },
};

async function convertir(
  html: string,
  dossier: string,
  format: "pdf" | "docx",
  nom: string,
) {
  const source = path.join(dossier, `${nom}.html`);
  await writeFile(source, html, "utf-8");
  const cible = format === "pdf" ? "pdf" : "docx:MS Word 2007 XML";
  await executer(
    "soffice",
    [
      "--headless",
      "--infilter=HTML (StarWriter)",
      "--convert-to",
      cible,
      "--outdir",
      dossier,
      source,
    ],
    { timeout: 180_000 },
  );
  await rm(source);
  return `${nom}.${format}`;
}

async function main() {
  // La grille du kit d'adhésion : les formules de la Chambre
  const formules = await prisma.formuleAdhesion.findMany({ where: { active: true }, orderBy: { ordre: "asc" } });
  const grille = formules.map((f) => `<tr><td>${libelleFormule(f)}</td><td>${fmtCotisation(f)}</td></tr>`).join("");
  const ressources = await prisma.resource.findMany({ orderBy: { id: "asc" } });

  const tmp = path.join(process.cwd(), "stockage", ".video-demo.mp4");
  await mkdir(path.dirname(tmp), { recursive: true });
  await executer("curl", ["-sS", "-L", "--max-time", "120", "-o", tmp, VIDEO]);

  for (const r of ressources) {
    const dossier = dossierRessource(r.id);
    await rm(dossier, { recursive: true, force: true });
    await mkdir(dossier, { recursive: true });

    if (r.fmt === "video") {
      await copyFile(tmp, path.join(dossier, "video.mp4"));
      await prisma.resource.update({
        where: { id: r.id },
        data: { fichier: "video.mp4", pages: null },
      });
      console.log(`  ${r.id}  vidéo`);
      continue;
    }

    const contenu = CONTENUS[r.id];
    if (!contenu) {
      console.log(`  ${r.id}  aucun contenu rédigé, ignorée`);
      continue;
    }
    const format = r.fmt === "docx" ? "docx" : "pdf";
    const fichier = await convertir(
      gabarit(r.titre, contenu.surtitre, contenu.corps.replace("{{grille}}", grille).replace("{{nombre}}", String(formules.length))),
      dossier,
      format,
      "document",
    );
    const pages = await preparerDocument(r.id, fichier);
    await prisma.resource.update({
      where: { id: r.id },
      data: { fichier, pages },
    });
    console.log(`  ${r.id}  ${format.toUpperCase()} → ${pages} page(s)`);
  }

  await rm(tmp, { force: true });
  await prisma.$disconnect();
}

avecChambre(process.env.CHAMBRE || CHAMBRE_PRINCIPALE, main);
