import { describe, expect, it } from "vitest";
import { invitationIcs } from "@/lib/ics";
import {
  COULEURS_TYPE,
  couleurType,
  estMois,
  grilleMois,
  libelleLieu,
  lireLieu,
  moisVoisin,
  resumePlages,
} from "@/lib/rendezvous";

describe("calendrier de réservation", () => {
  it("commence le mois un lundi, avec des cases vides avant le 1er", () => {
    // Le 1er novembre 2026 est un dimanche : six cases vides avant
    const nov = grilleMois("2026-11");
    expect(nov.slice(0, 7)).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(nov.filter(Boolean)).toHaveLength(30);
    expect(nov.at(-1)).toBe("2026-11-30");
    // Le 1er février 2027 est un lundi : aucune case vide, 28 jours
    expect(grilleMois("2027-02")[0]).toBe("2027-02-01");
    expect(grilleMois("2027-02")).toHaveLength(28);
  });

  it("passe d'un mois à l'autre, y compris d'une année à l'autre", () => {
    expect(moisVoisin("2026-12", 1)).toBe("2027-01");
    expect(moisVoisin("2027-01", -1)).toBe("2026-12");
    expect(estMois("2026-11")).toBe(true);
    expect(estMois("2026-13")).toBe(false);
    expect(estMois("nov")).toBe(false);
  });
});

describe("types de rendez-vous", () => {
  it("résume les heures d'accueil en regroupant les jours aux mêmes heures", () => {
    expect(
      resumePlages([
        { jour: 4, debut: "14:00", fin: "17:00" },
        { jour: 2, debut: "14:00", fin: "17:00" },
        { jour: 1, debut: "09:00", fin: "12:00" },
      ]),
    ).toBe("Lun · 09:00 – 12:00 ; Mar, Jeu · 14:00 – 17:00");
    expect(resumePlages([])).toBe("");
  });

  it("garde une couleur de la palette, sinon en attribue une selon le rang", () => {
    expect(couleurType("#2E7247", 0)).toBe("#2E7247");
    expect(couleurType(null, 1)).toBe(COULEURS_TYPE[1]);
    expect(couleurType("rouge", 7)).toBe(COULEURS_TYPE[1]);
  });

  it("lit le lieu, le bureau par défaut", () => {
    expect(lireLieu("visio")).toBe("visio");
    expect(lireLieu("telephone")).toBe("telephone");
    expect(lireLieu("ailleurs")).toBe("bureau");
    expect(libelleLieu("visio").libelle).toBe("Visio");
  });
});

describe("invitation d'agenda (.ics)", () => {
  const base = {
    uid: "rdv1",
    debut: new Date("2026-11-10T11:00:00Z"),
    fin: new Date("2026-11-10T11:30:00Z"),
    titre: "Échange découverte — CanCham",
    maintenant: new Date("2026-11-09T08:00:00Z"),
  };

  it("décrit le rendez-vous en UTC, avec lieu et description échappés", () => {
    const ics = invitationIcs({ ...base, description: "Avec Ando\nPréparer la mission, en visio; merci", lieu: "https://meet.google.com/abc-defg-hij", url: "https://meet.google.com/abc-defg-hij" });
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("DTSTART:20261110T110000Z");
    expect(ics).toContain("DTEND:20261110T113000Z");
    expect(ics).toContain("UID:rdv1@cancham");
    expect(ics).toContain("METHOD:PUBLISH");
    expect(ics).toContain("DESCRIPTION:Avec Ando\\nPréparer la mission\\, en visio\\; merci");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("marque une annulation pour la retirer de l'agenda", () => {
    const ics = invitationIcs({ ...base, annule: true });
    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain("STATUS:CANCELLED");
  });

  it("replie les lignes trop longues", () => {
    const ics = invitationIcs({ ...base, description: "x".repeat(200) });
    for (const ligne of ics.split("\r\n")) expect(Buffer.byteLength(ligne)).toBeLessThanOrEqual(75);
  });
});
