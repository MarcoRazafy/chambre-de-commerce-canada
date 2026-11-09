import { prisma } from "../lib/db";

// Données de démonstration des tags : des repères posés sur les entreprises membres,
// selon leur secteur, leur situation et la fonction de leur contact principal.
// Ajoute seulement : les tags déjà posés restent en place.

type Entreprise = { secteur: string; statut: string; fonction: string; rang: number };

const REGLES: [string, (e: Entreprise) => boolean][] = [
  ["Décideurs", (e) => /direct|gérant|fondat|président|pdg|ceo/i.test(e.fonction)],
  ["Contacts export", (e) => /export|commercial|vente/i.test(`${e.fonction} ${e.secteur}`)],
  ["VIP gala 2026", (e) => e.rang % 2 === 0 && e.statut === "a_jour"],
  ["Mission Canada 2027", (e) => /agri|artisan|tourism|voyage/i.test(e.secteur)],
  ["Comité agribusiness", (e) => /agri|agro/i.test(e.secteur)],
  ["Prospects sponsoring", (e) => /financ|digital|mines/i.test(e.secteur)],
  ["Formation continue", (e) => /qualit|pédagog|formation/i.test(`${e.fonction} ${e.secteur}`)],
  ["Relance cotisation", (e) => e.statut === "en_retard" || e.statut === "en_attente"],
  ["Ambassadeurs", (e) => e.rang % 4 === 1],
];

async function main() {
  const membres = await prisma.member.findMany({
    where: { statut: { notIn: ["refusee", "candidature"] } },
    select: {
      id: true,
      secteur: true,
      statut: true,
      etiquettes: true,
      users: { where: { role: "membre" }, orderBy: [{ contactPrincipal: "desc" }, { createdAt: "asc" }], take: 1, select: { fonction: true } },
    },
    orderBy: { nom: "asc" },
  });

  let poses = 0;
  for (const [rang, m] of membres.entries()) {
    const e: Entreprise = { secteur: m.secteur, statut: m.statut, fonction: m.users[0]?.fonction ?? "", rang };
    const nouveaux = REGLES.filter(([, ok]) => ok(e)).map(([nom]) => nom).filter((nom) => !m.etiquettes.includes(nom));
    if (!nouveaux.length) continue;
    await prisma.member.update({ where: { id: m.id }, data: { etiquettes: [...m.etiquettes, ...nouveaux] } });
    for (const nom of nouveaux) await prisma.tag.upsert({ where: { nom }, create: { nom }, update: {} });
    poses += nouveaux.length;
  }

  const tous = await prisma.member.findMany({ where: { etiquettes: { isEmpty: false } }, select: { etiquettes: true } });
  const compte = new Map<string, number>();
  for (const m of tous) for (const t of m.etiquettes) compte.set(t, (compte.get(t) ?? 0) + 1);
  console.log(`Tags de démo : ${poses} tag(s) posé(s) sur ${membres.length} entreprise(s).`);
  for (const [nom, n] of [...compte].sort((a, b) => b[1] - a[1])) console.log(`  ${nom} : ${n}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
