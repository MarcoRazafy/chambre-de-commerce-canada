import { describe, expect, it } from "vitest";
import { instantDans, mentionFuseau, saisieDans } from "@/lib/fuseau";

describe("heures dans le fuseau de la Chambre", () => {
  it("9 h à Madagascar = 6 h UTC ; 9 h à Montréal = 14 h UTC l’hiver, 13 h l’été", () => {
    expect(new Date(instantDans("2026-11-27", "09:00", "Indian/Antananarivo")).toISOString()).toBe("2026-11-27T06:00:00.000Z");
    expect(new Date(instantDans("2026-11-27", "09:00", "America/Toronto")).toISOString()).toBe("2026-11-27T14:00:00.000Z");
    expect(new Date(instantDans("2026-07-01", "09:00", "America/Toronto")).toISOString()).toBe("2026-07-01T13:00:00.000Z");
  });
  it("aller-retour : l’instant se relit à la même heure locale", () => {
    const t = instantDans("2026-03-08", "15:30", "America/Vancouver");
    expect(saisieDans(t, "America/Vancouver")).toBe("2026-03-08T15:30");
  });
  it("mention lisible", () => {
    expect(mentionFuseau("America/Toronto")).toBe("heure de l’Est (Montréal)");
    expect(mentionFuseau("Indian/Antananarivo")).toBe("heure de Madagascar");
  });
});
