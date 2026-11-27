import { beforeEach, describe, expect, it, vi } from "vitest";

type F = { numero: string; objet: string; montant: number; devise: "CAD"; date: Date; statut: string; relances: number[]; relanceeLe: Date | null; memberId: string; member: { nom: string } };
let facture: F;
const majs: { relanceeLe: Date; relances: number[] }[] = [];
const envois: string[] = [];

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("@/lib/push", () => ({ notifierMembre: async () => {} }));
vi.mock("@/lib/courriel", () => ({ courrielsActifs: () => true }));
vi.mock("@/lib/rappels-membres", () => ({ courrielRelanceFacture: async (id: string) => { envois.push(id); return { email: "tojo@x.mg", envoye: true }; } }));
vi.mock("@/lib/db", () => ({
  prisma: {
    invoice: {
      findUnique: async () => facture,
      update: async ({ data }: { data: { relanceeLe: Date; relances: number[] } }) => { majs.push(data); },
    },
    rappelMembre: { findMany: async () => [{ jours: 7 }, { jours: 30 }, { jours: 60 }] },
    auditLog: { create: async () => ({}) },
  },
}));

vi.mock("@/lib/fuseau-chambre", () => ({ getFuseau: async () => "America/Toronto" }));
const { relancerFactureMembre } = await import("@/lib/relance-facture");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-27T10:00:00Z"));
  majs.length = 0; envois.length = 0;
  facture = { numero: "CC-1", objet: "Cotisation", montant: 150, devise: "CAD", date: new Date("2026-10-20T00:00:00Z"), statut: "envoyee", relances: [7], relanceeLe: null, memberId: "m1", member: { nom: "Bio Sud" } };
});

describe("relance manuelle d’une facture", () => {
  it("envoie, et compte comme faits les rappels automatiques déjà échus", async () => {
    const r = await relancerFactureMembre("f1", "Ando");
    expect(r).toMatchObject({ ok: true });
    expect(envois).toEqual(["f1"]);
    expect(majs[0].relances).toEqual([7, 30]);
  });

  it("refuse une deuxième relance le même jour", async () => {
    facture.relanceeLe = new Date("2026-11-27T07:00:00Z");
    const r = await relancerFactureMembre("f1", "Ando");
    expect(r).toEqual({ ok: false, erreur: expect.stringContaining("déjà été relancée aujourd’hui") });
    expect(envois).toEqual([]);
  });

  it("accepte une nouvelle relance un autre jour", async () => {
    facture.relanceeLe = new Date("2026-11-20T07:00:00Z");
    expect(await relancerFactureMembre("f1", "Ando")).toMatchObject({ ok: true });
  });
});
