import { prisma } from "../lib/db";

// Données de démonstration des tags : des repères posés sur les contacts des entreprises membres,
// selon leur fonction, leur secteur ou leur rôle de contact principal.
// Ajoute seulement : les tags déjà posés restent en place.

type Contact = { fonction: string; principal: boolean; secteur: string; entreprise: string; rang: number };

const REGLES: [string, (c: Contact) => boolean][] = [
  ["Décideurs", (c) => /direct|gérant|fondat|président|pdg|ceo/i.test(c.fonction)],
  ["Contacts export", (c) => /export|commercial|vente/i.test(c.fonction) || /export/i.test(c.secteur)],
  ["VIP gala 2026", (c) => c.principal && c.rang % 2 === 0],
  ["Mission Canada 2027", (c) => /agri|artisan|tourism|voyage/i.test(c.secteur) && c.principal],
  ["Comité agribusiness", (c) => /agri|agro/i.test(c.secteur)],
  ["Prospects sponsoring", (c) => /financ|digital|mines/i.test(c.secteur) && c.principal],
  ["Formation continue", (c) => /qualit|pédagog|formation|ressources humaines|rh/i.test(`${c.fonction} ${c.secteur}`)],
  ["Ambassadeurs", (c) => c.rang % 5 === 1],
];

async function main() {
  const contacts = await prisma.user.findMany({
    where: { role: "membre", memberId: { not: null }, member: { statut: { notIn: ["refusee", "candidature"] } } },
    select: { id: true, nom: true, fonction: true, contactPrincipal: true, etiquettes: true, member: { select: { nom: true, secteur: true } } },
    orderBy: [{ member: { nom: "asc" } }, { nom: "asc" }],
  });

  let poses = 0;
  for (const [rang, u] of contacts.entries()) {
    const c: Contact = { fonction: u.fonction, principal: u.contactPrincipal, secteur: u.member?.secteur ?? "", entreprise: u.member?.nom ?? "", rang };
    const nouveaux = REGLES.filter(([, ok]) => ok(c)).map(([nom]) => nom).filter((nom) => !u.etiquettes.includes(nom));
    if (!nouveaux.length) continue;
    await prisma.user.update({ where: { id: u.id }, data: { etiquettes: [...u.etiquettes, ...nouveaux] } });
    poses += nouveaux.length;
  }

  const tous = await prisma.user.findMany({ where: { role: "membre", etiquettes: { isEmpty: false } }, select: { etiquettes: true } });
  const compte = new Map<string, number>();
  for (const u of tous) for (const e of u.etiquettes) compte.set(e, (compte.get(e) ?? 0) + 1);
  console.log(`Tags de démo : ${poses} tag(s) posé(s) sur ${contacts.length} contact(s).`);
  for (const [nom, n] of [...compte].sort((a, b) => b[1] - a[1])) console.log(`  ${nom} : ${n}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
