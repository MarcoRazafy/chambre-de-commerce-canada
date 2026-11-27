import { describe, expect, it } from "vitest";
import { fuseauConnu, jourDans } from "@/lib/fuseau";

describe("jour dans le fuseau de la Chambre", () => {
  it("22 h à Montréal reste le même jour, alors qu’il est déjà le lendemain en UTC", () => {
    const soir = new Date("2026-11-28T03:00:00Z");
    expect(jourDans(soir, "America/Toronto")).toBe("2026-11-27");
    expect(jourDans(soir, "Indian/Antananarivo")).toBe("2026-11-28");
  });
  it("seuls les fuseaux proposés sont acceptés", () => {
    expect(fuseauConnu("America/Vancouver")).toBe(true);
    expect(fuseauConnu("Mars/Olympus")).toBe(false);
  });
});
