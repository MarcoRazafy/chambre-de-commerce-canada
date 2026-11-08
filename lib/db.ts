import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

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

export const prisma = enCache ?? createClient();

if (process.env.NODE_ENV !== "production") {
  const ancien = globalForPrisma.prisma;
  if (ancien && ancien !== prisma) void ancien.$disconnect().catch(() => {});
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClasse = PrismaClient;
}
