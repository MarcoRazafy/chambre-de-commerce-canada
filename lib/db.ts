import { PrismaPg } from "@prisma/adapter-pg";
import { brancherRechercheChambre, chambreCourante } from "@/lib/chambre-courante";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { restreindre } from "@/lib/portee-chambre";

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
  // Schéma dédié (?schema=) : les requêtes SQL brutes ($queryRaw) le cherchent aussi en premier
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

// Accès à toute la base, sans limite de Chambre : sessions, connexion, webhooks, tâches régulières, Admin GM.
// À n'utiliser que là où la Chambre ne peut pas venir de la requête.
export const prismaSysteme = enCache ?? createClient();

if (process.env.NODE_ENV !== "production") {
  const ancien = globalForPrisma.prisma;
  if (ancien && ancien !== prismaSysteme) void ancien.$disconnect().catch(() => {});
  globalForPrisma.prisma = prismaSysteme;
  globalForPrisma.prismaClasse = PrismaClient;
}

brancherRechercheChambre(async (r) => {
  const c = await prismaSysteme.chambre.findUnique({ where: r, select: { id: true, statut: true } });
  return c ? { id: c.id, suspendue: c.statut === "suspendue" } : null;
});

// L'accès habituel : chaque requête est limitée à la Chambre en cours (lib/chambre-courante.ts, lib/portee-chambre.ts)
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
