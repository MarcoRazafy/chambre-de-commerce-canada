import { beforeEach, describe, expect, it, vi } from "vitest";
import { choisirRappel, lettreDeRelance } from "@/lib/rappels-membres-base";

type R = { id: string; declencheur: string; jours: number; sujet: string; contenu: string; actif: boolean };
let rappels: R[] = [];
let factures: { id: string; numero: string; objet: string; montant: number; devise: "CAD"; date: Date; relances: number[]; memberId: string; member: { nom: string } }[] = [];
let membres: { id: string; nom: string; adhesion: Date; rappelsFin: string[]; formule: null; factures: { date: Date; objet: string; statut: string }[] }[] = [];
let anciennes: number[] = [];
const envoyes: { a: string; sujet: string; texte: string; html: string }[] = [];
const majsFactures: { id: string; relances: number[] }[] = [];
const majsMembres: { id: string; rappelsFin: string[] }[] = [];
const crees: { jours: number }[] = [];

vi.mock("@/lib/db", () => ({
  prisma: {
    rappelMembre: {
      findMany: async () => rappels.filter((r) => r.actif),
      count: async () => rappels.length,
      createMany: async ({ data }: { data: { jours: number }[] }) => { crees.push(...data); },
      update: async () => ({}),
    },
    profilChambre: { update: async ({ data }: { data: { relancesMembres: number[] } }) => { anciennes = data.relancesMembres; } },
    invoice: {
      findMany: async () => factures,
      update: async ({ where, data }: { where: { id: string }; data: { relances: number[] } }) => { majsFactures.push({ id: where.id, relances: data.relances }); },
    },
    member: {
      findMany: async () => membres,
      update: async ({ where, data }: { where: { id: string }; data: { rappelsFin: string[] } }) => { majsMembres.push({ id: where.id, rappelsFin: data.rappelsFin }); },
    },
    user: { findFirst: async () => ({ nom: "Tojo Rabe", email: "tojo@x.mg" }) },
    auditLog: { create: async () => ({}) },
  },
}));
vi.mock("@/lib/courriel", () => ({
  envoyerCourriel: async (c: { a: string; sujet: string; texte: string; html: string }) => { envoyes.push(c); return true; },
  urlPublique: async (chemin: string) => `https://client.x${chemin}`,
}));
vi.mock("@/lib/profil-chambre", () => ({
  getProfilChambreBrut: async () => ({ id: "p1", chambreId: "c-a", nom: "Ucan", relancesMembres: anciennes }),
  logoPourCourriel: async () => undefined,
}));
vi.mock("@/lib/parametres", () => ({ calculer: () => ({ reseaux: {}, mentions: {} }) }));

const { envoyerRappelsMembresDus, lettreParDefaut } = await import("@/lib/rappels-membres");

const AUJ = new Date("2026-11-20T10:00:00Z");
const ilYa = (jours: number) => new Date(AUJ.getTime() - jours * 86_400_000);
const rappel = (declencheur: "facture" | "adhesion", jours: number): R => {
  const { sujet, doc } = lettreParDefaut(declencheur);
  return { id: `${declencheur}-${jours}`, declencheur, jours, sujet, contenu: JSON.stringify(doc), actif: true };
};
const facture = (age: number, relances: number[] = []) => ({
  id: "f1", numero: "CC-1", objet: "Cotisation 2026", montant: 150, devise: "CAD" as const, date: ilYa(age), relances, memberId: "m1", member: { nom: "Bio Sud" },
});

beforeEach(() => {
  rappels = []; factures = []; membres = []; anciennes = [];
  envoyes.length = 0; majsFactures.length = 0; majsMembres.length = 0; crees.length = 0;
});

describe("choix du rappel à envoyer", () => {
  const liste = [{ jours: 7 }, { jours: 30 }, { jours: 60 }];
  it("facture : le dernier seuil atteint, les précédents comptent comme faits", () => {
    expect(choisirRappel(liste, 40, "facture", () => false)).toEqual({ rappel: { jours: 30 }, atteints: [{ jours: 7 }, { jours: 30 }] });
    expect(choisirRappel(liste, 3, "facture", () => false)).toBeNull();
    expect(choisirRappel(liste, 10, "facture", (r) => r.jours === 7)).toBeNull();
  });
  it("adhésion : le seuil le plus proche de l'échéance, rien une fois l'échéance passée", () => {
    expect(choisirRappel(liste, 20, "adhesion", () => false)?.rappel).toEqual({ jours: 30 });
    expect(choisirRappel(liste, 5, "adhesion", () => false)?.rappel).toEqual({ jours: 7 });
    expect(choisirRappel(liste, 90, "adhesion", () => false)).toBeNull();
    expect(choisirRappel(liste, -1, "adhesion", () => false)).toBeNull();
  });
});

describe("lettre d’une relance manuelle", () => {
  const liste = [{ jours: 7 }, { jours: 30 }, { jours: 60 }];
  it("la lettre du dernier seuil atteint, sinon la plus proche, sinon aucune", () => {
    expect(lettreDeRelance(liste, 40)).toEqual({ jours: 30 });
    expect(lettreDeRelance(liste, 90)).toEqual({ jours: 60 });
    expect(lettreDeRelance(liste, 2)).toEqual({ jours: 7 });
    expect(lettreDeRelance([], 10)).toBeNull();
  });
});

describe("rappels envoyés aux membres", () => {
  it("aucun rappel actif : rien ne part", async () => {
    factures = [facture(40)];
    expect(await envoyerRappelsMembresDus(AUJ)).toBe(0);
  });

  it("facture impayée depuis 10 jours : la lettre personnalisée, avec le lien pour régler", async () => {
    rappels = [rappel("facture", 7), rappel("facture", 30)];
    factures = [facture(10)];
    expect(await envoyerRappelsMembresDus(AUJ)).toBe(1);
    expect(envoyes[0].a).toBe("tojo@x.mg");
    expect(envoyes[0].sujet).toBe("Facture CC-1 en attente de règlement");
    expect(envoyes[0].texte).toContain("Bonjour Tojo");
    expect(envoyes[0].texte).toContain("150");
    expect(envoyes[0].texte).toContain("depuis 10 jours");
    expect(envoyes[0].texte).toContain("Régler la facture : https://client.x/membre/cotisations/f1");
    expect(envoyes[0].html).toContain('href="https://client.x/membre/cotisations/f1"');
    expect(majsFactures).toEqual([{ id: "f1", relances: [7] }]);
  });

  it("rappel coupé : ignoré", async () => {
    rappels = [{ ...rappel("facture", 7), actif: false }];
    factures = [facture(10)];
    expect(await envoyerRappelsMembresDus(AUJ)).toBe(0);
  });

  it("fin d'adhésion dans 20 jours : le rappel de 30 jours part une fois, noté pour cette échéance", async () => {
    rappels = [rappel("adhesion", 30), rappel("adhesion", 7)];
    const adhesion = new Date("2025-12-10T00:00:00Z");
    membres = [{ id: "m1", nom: "Bio Sud", adhesion, rappelsFin: ["2025-12-10:30"], formule: null, factures: [] }];
    expect(await envoyerRappelsMembresDus(AUJ)).toBe(1);
    expect(envoyes[0].sujet).toMatch(/^Votre adhésion se termine le 10 déc/);
    expect(envoyes[0].texte).toContain("Bio Sud");
    expect(majsMembres).toEqual([{ id: "m1", rappelsFin: ["2026-12-10:30"] }]);

    envoyes.length = 0;
    membres[0].rappelsFin = ["2026-12-10:30"];
    expect(await envoyerRappelsMembresDus(AUJ)).toBe(0);
  });

  it("anciennes relances (jours réglés dans les paramètres) : reprises en rappels, une fois", async () => {
    anciennes = [7, 15];
    await envoyerRappelsMembresDus(AUJ);
    expect(crees.map((c) => c.jours)).toEqual([7, 15]);
    expect(anciennes).toEqual([]);
  });
});
