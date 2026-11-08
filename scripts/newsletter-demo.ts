import { prisma } from "../lib/db";
// Même audience que celle proposée par défaut dans l’éditeur (lib/newsletter, réservé au serveur)
const AUDIENCE_DEFAUT = { statuts: ["a_jour", "en_attente", "en_retard"] as ("a_jour" | "en_attente" | "en_retard")[], etiquettes: [] as string[], contacts: "tous", abonnes: true };

// Données de démonstration de la newsletter : des abonnés à la lettre (dont un désabonné, une adresse
// en erreur, un invité à adhérer), deux lettres envoyées avec leur suivi, un brouillon et une lettre programmée.
// Rien n'est envoyé : les courriels « suivis » sont fictifs. Les lettres de démo ne sont créées qu'une fois.

const ABONNES: [string, string, string, number, ("desabonne" | "erreur" | "invite")?][] = [
  ["Andry R.", "andry.r@exemple.mg", "vitrine", 1],
  ["Louis Bergeron", "louis@bergeron-import.ca", "vitrine", 5],
  ["Mamy Rajaona", "mamy.raj@exemple.mg", "equipe", 20, "invite"],
  ["Chantal Dubé", "cdube@exemple.ca", "import", 39],
  ["Toky A.", "toky@startup-exemple.mg", "vitrine", 51],
  ["Geneviève Lapointe", "glapointe@exemple.ca", "vitrine", 67, "desabonne"],
  ["Haja R.", "haja.r@exemple.mg", "import", 79],
  ["Nathalie Girard", "n.girard@exemple.ca", "vitrine", 95],
  ["Rina R.", "rina.r@exemple.mg", "import", 131, "erreur"],
  ["Fetra R.", "fetra@ecoagri-exemple.mg", "vitrine", 102],
];

const LETTRES = {
  septembre: "La lettre CanCham — Septembre 2026",
  octobre: "La lettre CanCham — Octobre 2026",
  speciale: "Édition spéciale — Restitution MECC 9",
  novembre: "La lettre CanCham — Novembre 2026",
};

const CONTENU = (mois: string) =>
  `Bonjour,\n\nVoici les nouvelles de la Chambre pour ${mois}.\n\n1. Les prochains rendez-vous du réseau\n2. Bienvenue aux nouveaux membres\n3. Une formation pour exporter vers le Québec\n\nBonne lecture,\nL’équipe CanCham`;

async function main() {
  const maintenant = new Date();
  const il = (jours: number, heure = 8) => {
    const d = new Date(maintenant.getTime() - jours * 86_400_000);
    d.setUTCHours(heure - 3, 0, 0, 0); // heure de Madagascar
    return d;
  };

  const { count } = await prisma.abonne.createMany({
    data: ABONNES.map(([prenom, email, source, jours, etat]) => ({
      prenom,
      email,
      source,
      createdAt: il(jours, 10),
      desabonneLe: etat === "desabonne" ? il(Math.max(1, jours - 30)) : null,
      erreurLe: etat === "erreur" ? il(Math.max(1, jours - 40)) : null,
      inviteLe: etat === "invite" ? il(3, 9) : null,
    })),
    skipDuplicates: true,
  });
  console.log(`  Abonnés à la lettre ajoutés : ${count}.`);

  if (await prisma.lettre.count({ where: { sujet: { in: Object.values(LETTRES) } } })) {
    console.log("  Lettres de démonstration déjà présentes : rien à faire.");
    return prisma.$disconnect();
  }

  const contacts = await prisma.user.findMany({
    where: { role: "membre", member: { statut: { in: AUDIENCE_DEFAUT.statuts } } },
    select: { email: true },
  });
  const abonnes = (await prisma.abonne.findMany({ select: { email: true } })).map((a) => a.email);
  const audience = [...new Set([...contacts.map((c) => c.email.toLowerCase()), ...abonnes])];

  // Une lettre envoyée et son suivi : une part de remises, d'ouvertures et de clics, une adresse en erreur
  async function envoyee(sujet: string, jours: number, ouverture: number, clics: number) {
    const quand = il(jours);
    const l = await prisma.lettre.create({
      data: {
        sujet,
        contenu: CONTENU(sujet.split("— ")[1] ?? "ce mois-ci"),
        audience: AUDIENCE_DEFAUT,
        statut: "envoyee",
        envoyeeLe: quand,
        destinataires: audience.length,
        envoyes: audience.length,
        auteur: "Communication",
        createdAt: il(jours + 3),
      },
    });
    await prisma.envoiLettre.createMany({
      data: audience.map((email, i) => {
        const part = (i + 0.5) / audience.length;
        const erreur = email === "rina.r@exemple.mg";
        const minutes = (n: number) => new Date(quand.getTime() + n * 60_000);
        return {
          lettreId: l.id,
          email,
          livreLe: erreur ? null : minutes(1),
          ouvertLe: !erreur && part < ouverture ? minutes(30 + i * 7) : null,
          clicLe: !erreur && part < clics ? minutes(40 + i * 7) : null,
          erreurLe: erreur ? minutes(1) : null,
          createdAt: quand,
        };
      }),
    });
  }

  await envoyee(LETTRES.septembre, 66, 0.47, 0.12);
  await envoyee(LETTRES.octobre, 36, 0.52, 0.15);
  await prisma.lettre.create({
    data: {
      sujet: LETTRES.speciale,
      contenu: "Bonjour,\n\nRetour en images sur la mission économique et commerciale au Canada, et ce qu’elle ouvre pour les membres.\n\nL’équipe CanCham",
      audience: AUDIENCE_DEFAUT,
      auteur: "Communication",
    },
  });
  // Programmée dans quatre jours : courriels fictifs, sans identifiant Resend (« Annuler » la remet en brouillon)
  const programmee = new Date(maintenant.getTime() + 4 * 86_400_000);
  programmee.setUTCHours(5, 0, 0, 0);
  const n = await prisma.lettre.create({
    data: {
      sujet: LETTRES.novembre,
      contenu: CONTENU("novembre"),
      audience: AUDIENCE_DEFAUT,
      statut: "programmee",
      programmeeLe: programmee,
      destinataires: audience.length,
      envoyes: audience.length,
      auteur: "Communication",
    },
  });
  await prisma.envoiLettre.createMany({ data: audience.map((email) => ({ lettreId: n.id, email })) });
  console.log(`  4 lettres ajoutées (2 envoyées à ${audience.length} adresses, 1 brouillon, 1 programmée).`);
  await prisma.$disconnect();
}

main();
