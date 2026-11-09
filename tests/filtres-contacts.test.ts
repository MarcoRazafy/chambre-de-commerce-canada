import { describe, expect, it } from "vitest";
import { conditionsContacts, lireFiltresContacts, parametresContacts, SANS_TAG } from "@/lib/filtres-contacts";

describe("filtres de la page Contacts (une ligne par entreprise)", () => {
  it("lit plusieurs situations et plusieurs tags, et ignore l'inconnu", () => {
    const f = lireFiltresContacts({ situation: ["a_jour", "en_retard", "principal", "pirate"], tag: ["VIP", " Décideurs ", "VIP"], q: " bio " });
    expect(f).toEqual({ q: "bio", situations: ["a_jour", "en_retard"], tags: ["VIP", "Décideurs"] });
  });

  it("reprend l'ancienne adresse ?acces=", () => {
    expect(lireFiltresContacts({ acces: "invite" }).situations).toEqual(["invite"]);
  });

  it("redonne les mêmes paramètres d'adresse", () => {
    const f = lireFiltresContacts({ situation: ["a_jour", "actif"], tag: "VIP" });
    expect(parametresContacts(f).toString()).toBe("situation=a_jour&situation=actif&tag=VIP");
    expect(lireFiltresContacts({ situation: ["a_jour", "actif"], tag: ["VIP"] })).toEqual(f);
  });

  it("additionne les cas d'une même famille, combine les familles", () => {
    const et = conditionsContacts(lireFiltresContacts({ situation: ["a_jour", "en_retard", "invite"] }));
    expect(et).toEqual([
      { statut: { in: ["a_jour", "en_retard"] } },
      { users: { some: { role: "membre", contactPrincipal: true, motDePasse: null } } },
    ]);
  });

  it("cocher les deux cas de l'accès revient à ne pas filtrer", () => {
    expect(conditionsContacts(lireFiltresContacts({ situation: ["actif", "invite"] }))).toEqual([]);
  });

  it("filtre les tags de l'entreprise : au moins un des tags cochés, ou sans tag", () => {
    expect(conditionsContacts(lireFiltresContacts({ tag: ["VIP", "Décideurs"] }))).toEqual([{ etiquettes: { hasSome: ["VIP", "Décideurs"] } }]);
    expect(conditionsContacts(lireFiltresContacts({ tag: SANS_TAG }))).toEqual([{ etiquettes: { isEmpty: true } }]);
    expect(conditionsContacts(lireFiltresContacts({ tag: ["VIP", SANS_TAG] }))).toEqual([
      { OR: [{ etiquettes: { hasSome: ["VIP"] } }, { etiquettes: { isEmpty: true } }] },
    ]);
  });
});
