import { beforeEach, describe, expect, it, vi } from "vitest";

const appels: { where?: unknown; data?: unknown }[] = [];
const journal: { detail: string }[] = [];
let trouves: { id: string; factures: { numero: string }[] }[] = [];

vi.mock("@/lib/db", () => ({
  prisma: {
    member: {
      findMany: async (q: { where: unknown }) => { appels.push({ where: q.where }); return trouves; },
      update: (q: { where: unknown; data: unknown }) => { appels.push(q); return q; },
    },
    auditLog: { create: (q: { data: { detail: string } }) => { journal.push(q.data); return q; } },
    $transaction: async (l: unknown[]) => l,
  },
}));

vi.mock("@/lib/fuseau-chambre", () => ({ getFuseau: async () => "America/Toronto" }));
vi.mock("@/lib/delais-chambre", () => ({ getDelais: async () => ({ reglement: 30, blocage: 30 }) }));

const { constaterRetardsCotisation } = await import("@/lib/retards-cotisation");

beforeEach(() => { appels.length = 0; journal.length = 0; trouves = []; });

describe("cotisation impayée après l’échéance", () => {
  it("cherche les membres à jour dont une facture de cotisation a plus de 30 jours", async () => {
    await constaterRetardsCotisation(new Date("2026-11-27T10:00:00Z"));
    expect(appels[0].where).toEqual({
      statut: "a_jour",
      factures: { some: { statut: "envoyee", objet: { startsWith: "Cotisation", mode: "insensitive" }, date: { lt: new Date("2026-10-28T00:00:00Z") } } },
    });
  });

  it("passe le membre en retard à partir d’aujourd’hui et le note au journal", async () => {
    trouves = [{ id: "m1", factures: [{ numero: "CC-2026-0415" }] }];
    expect(await constaterRetardsCotisation(new Date("2026-11-27T10:00:00Z"))).toBe(1);
    expect(appels[1]).toEqual({ where: { id: "m1" }, data: { statut: "en_retard", retardDepuis: new Date("2026-11-27T00:00:00Z") } });
    expect(journal[0].detail).toContain("CC-2026-0415");
  });
});
