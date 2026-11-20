import { PrismaPg } from "@prisma/adapter-pg";
import { brancherRechercheChambre, brancherRechercheCompte, chambreCourante } from "@/lib/chambre-courante";
import { fonctionsOuvertes } from "@/lib/fonctions-plateforme";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { restreindre } from "@/lib/portee-chambre";
import { etatRetard, REGLAGES_PAR_DEFAUT, type ReglagesRetard } from "@/lib/retards";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaClasse?: typeof PrismaClient;
};

function schemaDe(adresse: string | undefined): string | undefined {
  try {
    return new URL(adresse ?? "").searchParams.get("schema") || undefined;
  } catch {
    return undefined;
  }
}

function createClient() {
  const schema = schemaDe(process.env.DATABASE_URL);
  const adapter = new PrismaPg(
    { connectionString: process.env.DATABASE_URL, options: schema ? `-c search_path="${schema}",public` : undefined },
    { schema },
  );
  return new PrismaClient({ adapter });
}

const enCache =
  globalForPrisma.prismaClasse === PrismaClient
    ? globalForPrisma.prisma
    : undefined;

export const prismaSysteme = enCache ?? createClient();

if (process.env.NODE_ENV !== "production") {
  const ancien = globalForPrisma.prisma;
  if (ancien && ancien !== prismaSysteme) void ancien.$disconnect().catch(() => {});
  globalForPrisma.prisma = prismaSysteme;
  globalForPrisma.prismaClasse = PrismaClient;
}

let reglages: { jusqua: number; valeur: ReglagesRetard } | null = null;
export function oublierReglages() {
  reglages = null;
}
export async function reglagesRetard(): Promise<ReglagesRetard> {
  if (reglages && reglages.jusqua > Date.now()) return reglages.valeur;
  const l = await prismaSysteme.reglagesPlateforme.findUnique({ where: { id: "plateforme" } });
  const valeur = l ? { delaiRetard: l.delaiRetard, relances: l.relances, actionRetard: l.actionRetard } : REGLAGES_PAR_DEFAUT;
  reglages = { jusqua: Date.now() + 10_000, valeur };
  return valeur;
}

brancherRechercheCompte(async (id) => (await prismaSysteme.user.findUnique({ where: { id }, select: { chambreId: true } }))?.chambreId ?? null);

brancherRechercheChambre(async (r) => {
  const c = await prismaSysteme.chambre.findUnique({
    where: r,
    select: {
      id: true,
      statut: true,
      accesDevJusqua: true,
      offre: { select: { fonctions: true, surMesure: true } },
      fonctionsChoisies: true,
      paiementDiffere: true,
      facturesPlateforme: { where: { payeeLe: null, suivie: true }, orderBy: { date: "asc" }, take: 1, select: { date: true, payeeLe: true, suivie: true } },
    },
  });
  if (!c) return null;
  return {
    id: c.id,
    suspendue: c.statut === "suspendue",
    restriction: etatRetard(c.facturesPlateforme, await reglagesRetard()).restriction,
    accesDev: !!c.accesDevJusqua && c.accesDevJusqua > new Date(),
    fonctions: fonctionsOuvertes(c.offre, c.fonctionsChoisies),
    paiementAttendu: c.paiementDiffere,
  };
});

export const prisma = prismaSysteme.$extends({
  name: "chambre",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        return query(restreindre(model, operation, args, await chambreCourante()) as typeof args);
      },
    },
  },
});
