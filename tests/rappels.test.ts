import { beforeEach, describe, expect, it, vi } from "vitest";
import { debutEvenement, decomposerDelai, echeance, estDu, libelleDelai, lireDelai, MESSAGE_DEFAUT, regrouperParAdresse, remplir } from "@/lib/rappels";

const H = 3_600_000;
// Le 20 novembre 2026 à 14 h, heure de Madagascar (11 h UTC)
const DEBUT = Date.parse("2026-11-20T11:00:00Z");

describe("calendrier des rappels", () => {
  it("lit le début à l'heure de Madagascar, 9 h sans heure de début", () => {
    expect(debutEvenement("2026-11-20", "14:00")).toBe(DEBUT);
    expect(debutEvenement("2026-11-20", null)).toBe(Date.parse("2026-11-20T06:00:00Z"));
  });

  it("place chaque rappel avant le début, quel que soit son délai", () => {
    expect(echeance(7 * 1440, DEBUT)).toBe(DEBUT - 7 * 24 * H);
    expect(echeance(1440, DEBUT)).toBe(DEBUT - 24 * H);
    expect(echeance(120, DEBUT)).toBe(DEBUT - 2 * H);
  });

  it("n'envoie pas avant l'heure, envoie à l'heure, et encore un peu en retard", () => {
    expect(estDu(1440, DEBUT, DEBUT - 24 * H - 60_000)).toBe(false);
    expect(estDu(1440, DEBUT, DEBUT - 24 * H)).toBe(true);
    expect(estDu(1440, DEBUT, DEBUT - 13 * H)).toBe(true);
  });

  it("saute un rappel trop en retard : un « 7 jours avant » reçu la veille n'a plus de sens", () => {
    expect(estDu(7 * 1440, DEBUT, DEBUT - 5 * 24 * H)).toBe(false);
    expect(estDu(1440, DEBUT, DEBUT - 11 * H)).toBe(false);
  });

  it("ne rappelle jamais un événement commencé", () => {
    expect(estDu(120, DEBUT, DEBUT - H - 60_000)).toBe(true);
    expect(estDu(120, DEBUT, DEBUT)).toBe(false);
  });

  it("lit et nomme un délai : minutes, heures, jours, dans les limites", () => {
    expect(lireDelai("3", "jours")).toBe(3 * 1440);
    expect(lireDelai("2", "heures")).toBe(120);
    expect(lireDelai("5", "minutes")).toBeNull();
    expect(lireDelai("100", "jours")).toBeNull();
    expect(lireDelai("1", "semaines")).toBeNull();
    expect(decomposerDelai(2880)).toEqual({ nombre: 2, unite: "jours" });
    expect(decomposerDelai(90)).toEqual({ nombre: 90, unite: "minutes" });
    expect(libelleDelai(1440)).toBe("La veille");
    expect(libelleDelai(7 * 1440)).toBe("7 jours avant");
    expect(libelleDelai(60)).toBe("1 heure avant");
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
    { id: "r7", avant: 7 * 1440, sujet: null, message: null, event: e },
    { id: "r1", avant: 1440, sujet: null, message: null, event: e },
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
