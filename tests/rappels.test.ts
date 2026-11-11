import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleEnvoi, debutEvenement, echeance, estDuA, lireDateEnvoi, MESSAGE_DEFAUT, momentsEnvoi, regrouperParAdresse, remplir, versSaisie } from "@/lib/rappels";

const H = 3_600_000;
// Le 20 novembre 2026 à 14 h, heure de Madagascar (11 h UTC)
const DEBUT = Date.parse("2026-11-20T11:00:00Z");

describe("calendrier des rappels", () => {
  it("lit le début à l'heure de Madagascar, 9 h sans heure de début", () => {
    expect(debutEvenement("2026-11-20", "14:00")).toBe(DEBUT);
    expect(debutEvenement("2026-11-20", null)).toBe(Date.parse("2026-11-20T06:00:00Z"));
  });

  it("lit une date d'envoi à l'heure de Madagascar, et la réécrit pour le champ", () => {
    expect(lireDateEnvoi("2026-11-19T14:00")).toBe(DEBUT - 24 * H);
    expect(lireDateEnvoi("19/11/2026")).toBeNull();
    expect(versSaisie(DEBUT)).toBe("2026-11-20T14:00");
  });

  it("donne les moments d'envoi : les dates choisies, sinon l'ancien délai", () => {
    const d1 = new Date(DEBUT - 2 * H), d2 = new Date(DEBUT - 7 * 24 * H);
    expect(momentsEnvoi({ dates: [d1, d2], avant: 0 }, DEBUT)).toEqual([d2.getTime(), d1.getTime()]);
    expect(momentsEnvoi({ dates: [], avant: 1440 }, DEBUT)).toEqual([echeance(1440, DEBUT)]);
    expect(momentsEnvoi({ dates: [], avant: 0 }, DEBUT)).toEqual([]);
  });

  it("envoie à l'heure, rattrape jusqu'à 12 h de retard, jamais après le début", () => {
    const m = DEBUT - 24 * H;
    expect(estDuA(m, DEBUT, m - 60_000)).toBe(false);
    expect(estDuA(m, DEBUT, m)).toBe(true);
    expect(estDuA(m, DEBUT, m + 11 * H)).toBe(true);
    expect(estDuA(m, DEBUT, m + 13 * H)).toBe(false);
    expect(estDuA(DEBUT - H, DEBUT, DEBUT)).toBe(false);
  });

  it("note chaque date d'un rappel à part", () => {
    expect(cleEnvoi("r1", DEBUT)).toBe("r1@2026-11-20T11:00:00.000Z");
  });
});

describe("texte du rappel", () => {
  it("remplace les variables, avec ou sans accent, et garde les inconnues", () => {
    expect(remplir("Bonjour {prénom} de {entreprise}, {inconnue}", { "prénom": "Haja", entreprise: "Highlands" })).toBe(
      "Bonjour Haja de Highlands, {inconnue}",
    );
    expect(remplir("{ Prénom }", { "prénom": "Haja" })).toBe("Haja");
    expect(remplir(MESSAGE_DEFAUT, { "prénom": "Haja", "événement": "Gala", date: "20 nov.", lieu: "Tana" })).toContain("« Gala » a lieu le 20 nov.");
  });

  it("regroupe les inscrits d'une même adresse", () => {
    const g = regrouperParAdresse([
      { email: "Export@Bio.mg", nom: "A", entreprise: "Bio" },
      { email: "export@bio.mg ", nom: "B", entreprise: "Bio" },
      { email: "x@y.mg", nom: "C", entreprise: "Y" },
      { email: "", nom: "D", entreprise: "Z" },
    ]);
    expect(g.map((x) => [x.email, x.participants.map((p) => p.nom)])).toEqual([
      ["export@bio.mg", ["A", "B"]],
      ["x@y.mg", ["C"]],
    ]);
  });
});

// L'envoi, avec une base et des courriels simulés
const envoyes: { a: string; sujet: string; pieces?: unknown[]; html?: string }[] = [];
const reserves = new Set<string>();
let rappels: Record<string, unknown>[] = [];
let inscrits: { nom: string; entreprise: string; email: string; code: string | null; statut: string }[] = [];
let courrielsOk = true;

vi.mock("@/lib/db", () => ({
  prisma: {
    rappelEvenement: { findMany: async () => rappels },
    profilChambre: { findUnique: async () => null },
    attendee: { findMany: async () => inscrits },
    rappelEnvoye: {
      createMany: async ({ data }: { data: { eventId: string; type: string; email: string }[] }) => {
        const cle = `${data[0].eventId}|${data[0].type}|${data[0].email}`;
        if (reserves.has(cle)) return { count: 0 };
        reserves.add(cle);
        return { count: 1 };
      },
      deleteMany: async ({ where }: { where: { eventId: string; type: string; email: string } }) => {
        reserves.delete(`${where.eventId}|${where.type}|${where.email}`);
        return { count: 1 };
      },
    },
  },
}));
vi.mock("@/lib/courriel", () => ({
  courrielsActifs: () => true,
  envoyerCourriel: async (c: { a: string; sujet: string; pieces?: unknown[]; html?: string }) => {
    if (courrielsOk) envoyes.push(c);
    return courrielsOk;
  },
  gabarit: ({ paragraphes }: { paragraphes: string[] }) => ({ html: paragraphes.join("\n"), texte: paragraphes.join("\n") }),
  urlPublique: async (chemin: string) => `https://site.mg${chemin}`,
}));

const { envoyerRappelsDus } = await import("@/lib/rappels-envoi");

beforeEach(() => {
  envoyes.length = 0;
  reserves.clear();
  courrielsOk = true;
  const e = { id: "e1", titre: "Gala", date: new Date("2026-11-20T00:00:00Z"), debut: "14:00", fin: null, lieu: "Tana" };
  rappels = [
    { id: "r7", avant: 0, dates: [new Date(DEBUT - 7 * 24 * H)], sujet: null, message: null, event: e },
    { id: "r1", avant: 0, dates: [new Date(DEBUT - 24 * H)], sujet: null, message: null, event: e },
  ];
  inscrits = [
    { nom: "Haja Rakoto", entreprise: "Highlands", email: "haja@h.mg", code: "CC-AAAA-111111-1", statut: "confirme" },
    { nom: "Lova R.", entreprise: "Highlands", email: "haja@h.mg", code: "CC-AAAA-111111-2", statut: "confirme" },
    { nom: "Toky", entreprise: "Startup", email: "toky@s.mg", code: "CC-AAAA-222222-1", statut: "a_valider" },
  ];
});

describe("envoi des rappels", () => {
  it("envoie le rappel dû, une fois par adresse, avec les QR codes des inscrits confirmés", async () => {
    expect(await envoyerRappelsDus(DEBUT - 24 * H + 5 * 60_000)).toEqual({ envoyes: 2, echecs: 0 });
    const haja = envoyes.find((c) => c.a === "haja@h.mg")!;
    expect(haja.sujet).toBe("Rappel : Gala");
    expect(haja.pieces).toHaveLength(2);
    expect(envoyes.find((c) => c.a === "toky@s.mg")!.pieces).toHaveLength(0);
    // Le rappel par défaut, en lettre : bandeau de l'événement, prénom, QR codes avant le pied de page
    expect(haja.html).toContain("Bonjour Haja");
    expect(haja.html).toContain(">Gala<");
    expect(haja.html).toContain("cid:qr-");
    expect(haja.html!.indexOf("cid:qr-")).toBeLessThan(haja.html!.indexOf("Tous droits réservés"));
  });

  it("ne renvoie pas un rappel déjà parti au passage suivant", async () => {
    await envoyerRappelsDus(DEBUT - 24 * H + 60_000);
    await envoyerRappelsDus(DEBUT - 24 * H + 6 * 60_000);
    expect(envoyes).toHaveLength(2);
  });

  it("n'envoie rien pour un rappel désactivé ou pas encore dû", async () => {
    expect((await envoyerRappelsDus(DEBUT - 2 * H + 60_000)).envoyes).toBe(0);
    expect((await envoyerRappelsDus(DEBUT - 3 * 24 * H)).envoyes).toBe(0);
  });

  it("réessaie au passage suivant un rappel dont l'envoi a échoué", async () => {
    courrielsOk = false;
    expect(await envoyerRappelsDus(DEBUT - 24 * H + 60_000)).toEqual({ envoyes: 0, echecs: 2 });
    courrielsOk = true;
    expect((await envoyerRappelsDus(DEBUT - 24 * H + 6 * 60_000)).envoyes).toBe(2);
  });
});
