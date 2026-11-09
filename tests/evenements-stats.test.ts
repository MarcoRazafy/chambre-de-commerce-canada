import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { correspond, fmtPourcentCsv, lirePeriode, selection, statistiques } from "@/lib/evenements-stats";

const EVENTS = [
  { id: "a", date: "2026-10-15", titre: "Atelier en ligne — Mobilité francophone", lieu: "En ligne", format: "Webinaire" },
  { id: "b", date: "2026-10-09", titre: "Canada Expo — Caravane de régionalisation", lieu: "Tamatave", format: "Présentiel" },
  { id: "c", date: "2026-11-09", titre: "Accueil des nouveaux membres", lieu: "Antananarivo", format: "Présentiel" },
  { id: "d", date: "2026-12-02", titre: "Formation — Exporter vers le Québec", lieu: "En ligne", format: "Webinaire" },
];

beforeAll(() => {
  process.env.CANCHAM_TODAY = "2026-11-09";
});
afterAll(() => {
  delete process.env.CANCHAM_TODAY;
});

describe("sélection des événements", () => {
  it("sépare les événements à venir (dont ceux du jour) et passés, chacun dans le bon ordre", () => {
    expect(selection(EVENTS, "a_venir").map((e) => e.id)).toEqual(["c", "d"]);
    expect(selection(EVENTS, "passes").map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("cherche dans le titre, le lieu et le format, sans tenir compte des accents ni de la casse", () => {
    expect(selection(EVENTS, "passes", "regionalisation").map((e) => e.id)).toEqual(["b"]);
    expect(selection(EVENTS, "passes", "TAMATAVE").map((e) => e.id)).toEqual(["b"]);
    expect(selection(EVENTS, "a_venir", "webinaire").map((e) => e.id)).toEqual(["d"]);
    expect(selection(EVENTS, "a_venir", "quebec").map((e) => e.id)).toEqual(["d"]);
  });

  it("exige tous les mots de la recherche, dans n'importe quel ordre", () => {
    expect(correspond(EVENTS[0], "ligne mobilité")).toBe(true);
    expect(correspond(EVENTS[0], "ligne tamatave")).toBe(false);
    expect(correspond(EVENTS[0], "   ")).toBe(true);
  });

  it("lit la période, « à venir » par défaut", () => {
    expect(lirePeriode("passes")).toBe("passes");
    expect(lirePeriode(undefined)).toBe("a_venir");
    expect(lirePeriode("n'importe quoi")).toBe("a_venir");
  });
});

describe("statistiques d'un événement", () => {
  it("compte inscrits, présents, absents et calcule remplissage et taux de présence", () => {
    expect(statistiques(200, { a_valider: 2, confirme: 4, present: 60, absent: 30 })).toEqual({
      inscrits: 96,
      remplissage: 48,
      presents: 60,
      absents: 30,
      aValider: 2,
      nonPointes: 4,
      tauxPresence: 66.7,
    });
  });

  it("laisse les taux vides quand ils ne se calculent pas", () => {
    const s = statistiques(0, { a_valider: 0, confirme: 5, present: 0, absent: 0 });
    expect(s.remplissage).toBeNull();
    expect(s.tauxPresence).toBeNull();
    expect(fmtPourcentCsv(s.tauxPresence)).toBe("");
    expect(fmtPourcentCsv(66.7)).toBe("66,7 %");
  });
});
