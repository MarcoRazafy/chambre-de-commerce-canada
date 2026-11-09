import { describe, expect, it } from "vitest";
import { conditionsContacts, lireFiltresContacts, parametresContacts, SANS_TAG } from "@/lib/filtres-contacts";

describe("filtres de la page Contacts", () => {
  it("lit plusieurs situations et plusieurs tags, et ignore l'inconnu", () => {
    const f = lireFiltresContacts({ situation: ["a_jour", "en_retard", "pirate"], tag: ["VIP", " Décideurs ", "VIP"], q: " ando " });
    expect(f).toEqual({ q: "ando", situations: ["a_jour", "en_retard"], tags: ["VIP", "Décideurs"] });
  });

  it("reprend les anciennes adresses (?acces=, ?principal=1)", () => {
    expect(lireFiltresContacts({ acces: "invite", principal: "1" }).situations).toEqual(["invite", "principal"]);
  });

  it("redonne les mêmes paramètres d'adresse", () => {
    const f = lireFiltresContacts({ situation: ["a_jour", "principal"], tag: "VIP" });
    expect(parametresContacts(f).toString()).toBe("situation=a_jour&situation=principal&tag=VIP");
    expect(lireFiltresContacts(Object.fromEntries([["situation", ["a_jour", "principal"]], ["tag", ["VIP"]]]))).toEqual(f);
  });

  it("additionne les cas d'une même famille, combine les familles", () => {
    const et = conditionsContacts(lireFiltresContacts({ situation: ["a_jour", "en_retard", "principal"] }));
    expect(et).toEqual([{ member: { statut: { in: ["a_jour", "en_retard"] } } }, { contactPrincipal: true }]);
  });

  it("cocher les deux cas d'une famille revient à ne pas filtrer", () => {
    expect(conditionsContacts(lireFiltresContacts({ situation: ["actif", "invite", "principal", "secondaire"] }))).toEqual([]);
    expect(conditionsContacts(lireFiltresContacts({ situation: "invite" }))).toEqual([{ motDePasse: null }]);
  });

  it("filtre les tags : au moins un des tags cochés, ou sans tag", () => {
    expect(conditionsContacts(lireFiltresContacts({ tag: ["VIP", "Décideurs"] }))).toEqual([{ etiquettes: { hasSome: ["VIP", "Décideurs"] } }]);
    expect(conditionsContacts(lireFiltresContacts({ tag: SANS_TAG }))).toEqual([{ etiquettes: { isEmpty: true } }]);
    expect(conditionsContacts(lireFiltresContacts({ tag: ["VIP", SANS_TAG] }))).toEqual([
      { OR: [{ etiquettes: { hasSome: ["VIP"] } }, { etiquettes: { isEmpty: true } }] },
    ]);
  });
});
