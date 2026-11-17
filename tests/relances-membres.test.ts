import { beforeEach, describe, expect, it, vi } from "vitest";

// Relances automatiques des factures impayées des membres : base, envoi et profil simulés
type F = { id: string; numero: string; objet: string; montant: number; devise: "CAD"; date: Date; relances: number[]; memberId: string; member: { nom: string } };
let factures: F[] = [];
let contact: { nom: string; email: string } | null = null;
let relancesReglees: number[] = [];
let envoiOk = true;
const envoyes: { a: string; sujet: string; texte: string }[] = [];
const majs: { id: string; relances: number[] }[] = [];

vi.mock("@/lib/db", () => ({
  prisma: {
    invoice: {
      findMany: async () => factures,
      update: async ({ where, data }: { where: { id: string }; data: { relances: number[] } }) => { majs.push({ id: where.id, relances: data.relances }); },
    },
    user: { findFirst: async () => contact },
    auditLog: { create: async () => ({}) },
  },
}));
vi.mock("@/lib/courriel", async (orig) => ({
  ...(await orig<object>()),
  envoyerCourriel: async (c: { a: string; sujet: string; texte: string }) => { if (envoiOk) envoyes.push(c); return envoiOk; },
  urlPublique: async (chemin: string) => `https://client.x${chemin}`,
}));
vi.mock("@/lib/profil-chambre", () => ({ getProfilChambreBrut: async () => ({ chambreId: "c-a", nom: "Ucan", relancesMembres: relancesReglees }) }));
vi.mock("@/lib/reglements", () => ({ modesPublics: async () => ["carte"] }));
vi.mock("@/lib/modeles-courriels", async (orig) => orig());

const { relancesMembresDues } = await import("@/lib/relances-membres");

const AUJ = new Date("2026-11-20T10:00:00Z");
const facture = (joursAvant: number, relances: number[] = []): F => ({
  id: "f1", numero: "CC-1", objet: "Cotisation 2026", montant: 150, devise: "CAD",
  date: new Date(AUJ.getTime() - joursAvant * 86_400_000), relances, memberId: "m1", member: { nom: "Bio Sud" },
});

beforeEach(() => {
  factures = []; contact = { nom: "Tojo Rabe", email: "tojo@x.mg" }; relancesReglees = [7, 15, 30]; envoiOk = true;
  envoyes.length = 0; majs.length = 0;
});

describe("relances automatiques des membres", () => {
  it("coupées (aucun jour réglé) : rien n'est lu ni envoyé", async () => {
    relancesReglees = [];
    factures = [facture(40)];
    expect(await relancesMembresDues(AUJ)).toBe(0);
    expect(envoyes).toHaveLength(0);
  });

  it("au jour 10 : la relance du jour 7, avec le lien vers la facture et le bouton pour payer", async () => {
    factures = [facture(10)];
    expect(await relancesMembresDues(AUJ)).toBe(1);
    expect(envoyes[0].sujet).toBe("Facture CC-1 en attente de règlement");
    expect(envoyes[0].texte).toContain("depuis 10 jours");
    expect(envoyes[0].texte).toContain("https://client.x/membre/cotisations/f1");
    expect(envoyes[0].texte).toContain("Régler la facture");
    expect(majs).toEqual([{ id: "f1", relances: [7] }]);
  });

  it("relance du jour 7 déjà faite : rien de plus au jour 10", async () => {
    factures = [facture(10, [7])];
    expect(await relancesMembresDues(AUJ)).toBe(0);
    expect(majs).toHaveLength(0);
  });

  it("facture ancienne à l'activation : une seule relance, toutes les passées notées", async () => {
    factures = [facture(40)];
    expect(await relancesMembresDues(AUJ)).toBe(1);
    expect(envoyes).toHaveLength(1);
    expect(majs).toEqual([{ id: "f1", relances: [7, 15, 30] }]);
  });

  it("sans contact : rien n'est envoyé, la relance compte comme faite", async () => {
    contact = null;
    factures = [facture(10)];
    expect(await relancesMembresDues(AUJ)).toBe(0);
    expect(majs).toEqual([{ id: "f1", relances: [7] }]);
  });

  it("courriel refusé : rien n'est noté, elle repartira au prochain passage", async () => {
    envoiOk = false;
    factures = [facture(10)];
    expect(await relancesMembresDues(AUJ)).toBe(0);
    expect(majs).toHaveLength(0);
  });

  it("avant le premier jour réglé : rien", async () => {
    factures = [facture(3)];
    expect(await relancesMembresDues(AUJ)).toBe(0);
  });
});
