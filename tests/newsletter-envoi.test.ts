import { beforeEach, describe, expect, it, vi } from "vitest";

// Envoi des lettres programmées, avec une base et des courriels simulés
type Lettre = { id: string; sujet: string; contenu: string; audience: unknown; auteur: string; statut: string; programmeeLe: Date | null; envoyes?: number };
let lettres: Lettre[] = [];
let envois: { id: string; lettreId: string; email: string; resendId?: string }[] = [];
const courriels: { a: string; suivi?: string }[] = [];
let abonnes: { email: string; prenom: string }[] = [];

vi.mock("@/lib/db", () => ({
  prisma: {
    // Aucune règle de tag automatique : les tags ne bougent pas
    regleTag: { findMany: async () => [] },
    lettre: {
      findMany: async ({ where }: { where: { statut: string; programmeeLe: { lte: Date } } }) =>
        lettres.filter((l) => l.statut === where.statut && l.programmeeLe && l.programmeeLe <= where.programmeeLe.lte),
      updateMany: async ({ where, data }: { where: { id: string; statut: string }; data: Partial<Lettre> }) => {
        const l = lettres.find((x) => x.id === where.id && x.statut === where.statut);
        if (!l) return { count: 0 };
        Object.assign(l, data);
        return { count: 1 };
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Lettre> }) => Object.assign(lettres.find((x) => x.id === where.id)!, data),
    },
    envoiLettre: {
      create: async ({ data }: { data: { lettreId: string; email: string } }) => {
        const e = { id: `envoi-${envois.length + 1}`, ...data };
        envois.push(e);
        return e;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        envois = envois.filter((e) => e.id !== where.id);
      },
      update: async ({ where, data }: { where: { id: string }; data: { resendId: string } }) => Object.assign(envois.find((e) => e.id === where.id)!, data),
    },
    user: { findMany: async () => [] },
    abonne: { findMany: async () => abonnes },
    auditLog: { create: async () => ({}) },
  },
}));
vi.mock("@/lib/courriel", () => ({
  courrielsActifs: () => true,
  envoyerCourriel: async () => true,
  envoyerCourrielSuivi: async (c: { a: string }, o: { suivi?: string }) => {
    courriels.push({ a: c.a, suivi: o.suivi });
    return `msg-${courriels.length}@relay`;
  },
  gabarit: () => ({ html: "", texte: "" }),
  urlPublique: async (chemin: string) => `https://app.cancham.mg${chemin}`,
}));

const { envoyerLettresDues } = await import("@/lib/newsletter");
const AUDIENCE = { statuts: [], etiquettes: [], exclus: [], contacts: "tous", abonnes: true };

beforeEach(() => {
  courriels.length = 0;
  envois = [];
  abonnes = [{ email: "a@x.mg", prenom: "A" }, { email: "b@x.mg", prenom: "B" }];
  lettres = [
    { id: "l1", sujet: "Due", contenu: "Texte", audience: AUDIENCE, auteur: "Com", statut: "programmee", programmeeLe: new Date("2026-11-09T06:00:00Z") },
    { id: "l2", sujet: "Plus tard", contenu: "Texte", audience: AUDIENCE, auteur: "Com", statut: "programmee", programmeeLe: new Date("2026-11-20T06:00:00Z") },
  ];
});

describe("lettres programmées", () => {
  it("envoie celles dont l'heure est venue, et elles seules, à l'audience lue au moment de l'envoi", async () => {
    abonnes.push({ email: "c@x.mg", prenom: "C" });
    expect(await envoyerLettresDues(new Date("2026-11-09T06:03:00Z"))).toBe(1);
    expect(courriels.map((c) => c.a)).toEqual(["a@x.mg", "b@x.mg", "c@x.mg"]);
    expect(lettres[0]).toMatchObject({ statut: "envoyee", envoyes: 3 });
    expect(lettres[1].statut).toBe("programmee");
  });

  it("relie chaque courriel à son envoi pour le suivi (en-tête du fournisseur)", async () => {
    await envoyerLettresDues(new Date("2026-11-09T06:03:00Z"));
    expect(courriels.map((c) => c.suivi)).toEqual(envois.map((e) => e.id));
    expect(envois[0].resendId).toBe("msg-1@relay");
  });

  it("n'envoie pas deux fois une lettre déjà partie ou en cours d'envoi", async () => {
    await envoyerLettresDues(new Date("2026-11-09T06:03:00Z"));
    await envoyerLettresDues(new Date("2026-11-09T06:08:00Z"));
    expect(courriels).toHaveLength(2);
    lettres[1].statut = "envoi";
    expect(await envoyerLettresDues(new Date("2026-11-21T00:00:00Z"))).toBe(0);
  });
});
