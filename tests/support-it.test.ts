import { describe, expect, it } from "vitest";
import { ajouterPieces, PIECES_MAX } from "@/components/support/ChoixPieces";
import { restreindre } from "@/lib/portee-chambre";

const fichier = (nom: string, type: string, taille = 10) => new File([new Uint8Array(taille)], nom, { type });

describe("Support IT : pièces jointes choisies", () => {
  it("photos, vidéos (MP4, WebM, MOV) et PDF acceptés", () => {
    const r = ajouterPieces([], [
      fichier("a.png", "image/png"),
      fichier("b.mp4", "video/mp4"),
      fichier("c.mov", "video/quicktime"),
      fichier("d.pdf", "application/pdf"),
    ]);
    expect(r.erreur).toBeNull();
    expect(r.fichiers).toHaveLength(4);
  });

  it("autres types écartés, avec un message", () => {
    const r = ajouterPieces([], [fichier("x.zip", "application/zip"), fichier("a.jpg", "image/jpeg")]);
    expect(r.fichiers.map((f) => f.name)).toEqual(["a.jpg"]);
    expect(r.erreur).toContain("x.zip");
  });

  it(`${PIECES_MAX} au plus par message`, () => {
    const r = ajouterPieces([], Array.from({ length: PIECES_MAX + 2 }, (_, i) => fichier(`${i}.png`, "image/png")));
    expect(r.fichiers).toHaveLength(PIECES_MAX);
    expect(r.erreur).toContain(String(PIECES_MAX));
  });
});

describe("Support IT : limité à la Chambre", () => {
  it("conversation, messages et pièces : ceux de la Chambre seulement", () => {
    expect(JSON.stringify(restreindre("FilSupportIT", "findFirst", {}, "c1").where)).toContain('{"chambreId":"c1"}');
    expect(JSON.stringify(restreindre("MessageSupportIT", "count", {}, "c1").where)).toContain('"fil":{"is":{"chambreId":"c1"}}');
    expect(JSON.stringify(restreindre("PieceSupportIT", "findFirst", { where: { id: "p" } }, "c1").where)).toContain('"message":{"is":{"fil":{"is":{"chambreId":"c1"}}}}');
  });
});
