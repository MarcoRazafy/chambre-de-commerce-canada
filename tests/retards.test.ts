import { describe, expect, it } from "vitest";
import { etatRetard, joursDepuis, lireRelances, relanceDue, REGLAGES_PAR_DEFAUT } from "@/lib/retards";

const j = (iso: string) => new Date(`${iso}T00:00:00Z`);
const R = REGLAGES_PAR_DEFAUT;

describe("retards de paiement de l'abonnement", () => {
  it("compte les jours depuis la facture (0 le jour même, quelle que soit l'heure)", () => {
    expect(joursDepuis(j("2026-11-01"), new Date("2026-11-01T23:59:00Z"))).toBe(0);
    expect(joursDepuis(j("2026-11-01"), new Date("2026-11-02T00:01:00Z"))).toBe(1);
  });

  it("la plus ancienne facture suivie impayée décide ; payée ou non suivie : rien", () => {
    const m = j("2026-11-20");
    expect(etatRetard([], R, m)).toEqual({ enRetard: false, jours: 0, restriction: null });
    expect(etatRetard([{ date: j("2026-11-20"), payeeLe: null, suivie: true }], R, m)).toEqual({ enRetard: false, jours: 0, restriction: null });
    expect(etatRetard([{ date: j("2026-11-10"), payeeLe: null, suivie: true }], R, m)).toEqual({ enRetard: true, jours: 10, restriction: null });
    expect(etatRetard([{ date: j("2026-11-01"), payeeLe: null, suivie: true }], R, m).restriction).toBe("lecture");
    expect(etatRetard([{ date: j("2026-11-01"), payeeLe: j("2026-11-02"), suivie: true }], R, m).enRetard).toBe(false);
    expect(etatRetard([{ date: j("2026-01-01"), payeeLe: null, suivie: false }], R, m).enRetard).toBe(false);
    expect(etatRetard([{ date: j("2026-11-01"), payeeLe: null, suivie: true }], { ...R, actionRetard: "blocage" }, m).restriction).toBe("blocage");
    // Délai 0 : jamais de restriction
    expect(etatRetard([{ date: j("2026-01-01"), payeeLe: null, suivie: true }], { ...R, delaiRetard: 0 }, m).restriction).toBeNull();
  });

  it("relance : la plus récente due, une seule fois", () => {
    expect(relanceDue({ date: j("2026-11-01"), relances: [] }, R, j("2026-11-01"))).toBeNull();
    expect(relanceDue({ date: j("2026-11-01"), relances: [] }, R, j("2026-11-02"))).toBe(1);
    expect(relanceDue({ date: j("2026-11-01"), relances: [1] }, R, j("2026-11-05"))).toBeNull();
    // Tâches arrêtées une semaine : une seule relance, la plus récente
    expect(relanceDue({ date: j("2026-11-01"), relances: [] }, R, j("2026-11-16"))).toBe(14);
  });

  it("lit les jours de relance saisis", () => {
    expect(lireRelances("14, 1 ,7 7")).toEqual([1, 7, 14]);
    expect(lireRelances("")).toEqual([]);
    expect(lireRelances("0, 3")).toBeNull();
    expect(lireRelances("deux")).toBeNull();
  });
});
