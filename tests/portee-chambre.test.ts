import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { avecChambre, chambreCourante } from "@/lib/chambre-courante";
import { ChambreHorsPortee, COMMUNES, DIRECTES, PAR_PARENT, POSSEDEES, RELATIONS, restreindre, SYSTEME_SEULEMENT } from "@/lib/portee-chambre";

// Le schéma, lu tel quel : chaque table doit avoir sa règle de Chambre
const schema = readFileSync("prisma/schema.prisma", "utf8");
const modeles = new Map([...schema.matchAll(/\nmodel (\w+) \{\n([\s\S]*?)\n\}/g)].map((m) => [m[1], m[2]]));
const champs = (corps: string) =>
  corps
    .split("\n")
    .map((l) => l.trim().split(/\s+/))
    .filter((t) => t.length >= 2 && /^\w/.test(t[0]) && !t[0].startsWith("//"));

describe("règles de Chambre et schéma", () => {
  it("chaque table est principale (chambreId), enfant (par son parent), commune, de l'Admin GM, ou la table des Chambres", () => {
    for (const [nom, corps] of modeles) {
      if (nom === "Chambre" || COMMUNES.has(nom) || SYSTEME_SEULEMENT.has(nom)) continue;
      const aChambre = champs(corps).some(([c]) => c === "chambreId");
      expect(DIRECTES.has(nom), `${nom} : chambreId`).toBe(aChambre);
      if (!aChambre) expect(PAR_PARENT[nom], `${nom} : règle par le parent`).toBeTypeOf("function");
    }
    for (const nom of [...DIRECTES, ...Object.keys(PAR_PARENT)]) expect(modeles.has(nom), nom).toBe(true);
  });

  it("les relations suivies pour les créations imbriquées sont celles du schéma", () => {
    const attendues: Record<string, Record<string, string>> = {};
    const possedees: Record<string, string[]> = {};
    for (const [nom, corps] of modeles) {
      if (nom === "Chambre") continue;
      for (const [champ, type, ...reste] of champs(corps)) {
        const cible = type.replace(/[[\]?]/g, "");
        if (!modeles.has(cible) || cible === "Chambre" || COMMUNES.has(cible)) continue;
        (attendues[nom] ??= {})[champ] = cible;
        if (DIRECTES.has(nom) && reste.join(" ").includes("fields:")) (possedees[nom] ??= []).push(champ);
      }
    }
    expect(RELATIONS).toEqual(attendues);
    expect(POSSEDEES).toEqual(possedees);
  });
});

describe("restreindre : chaque requête limitée à la Chambre", () => {
  const C = "chambre-a";

  it("lecture d'une table principale : filtre chambreId, en gardant le reste du where", () => {
    expect(restreindre("Member", "findMany", { where: { statut: "a_jour" } }, C)).toEqual({
      where: { statut: "a_jour", AND: [{ chambreId: C }] },
    });
    expect(restreindre("Member", "count", undefined, C)).toEqual({ where: { AND: [{ chambreId: C }] } });
    // AND déjà présent (objet ou liste) : conservé
    expect(restreindre("Tag", "findMany", { where: { AND: { nom: "x" } } }, C).where).toEqual({ AND: [{ nom: "x" }, { chambreId: C }] });
  });

  it("findUnique, update, delete : le champ unique reste en tête (requête valide)", () => {
    expect(restreindre("Invoice", "findUnique", { where: { id: "f1" } }, C)).toEqual({ where: { id: "f1", AND: [{ chambreId: C }] } });
    const u = restreindre("Member", "update", { where: { id: "m1" }, data: { nom: "X" } }, C);
    expect(u.where).toEqual({ id: "m1", AND: [{ chambreId: C }] });
    expect(u.data).toEqual({ nom: "X" });
  });

  it("table enfant : filtre par son parent", () => {
    expect(restreindre("Registration", "findMany", { where: { code: "A" } }, C).where).toEqual({
      code: "A",
      AND: [{ event: { is: { chambreId: C } } }],
    });
    expect(restreindre("PieceJointe", "deleteMany", {}, C).where).toEqual({
      AND: [{ message: { is: { thread: { is: { chambreId: C } } } } }],
    });
    expect(restreindre("Comment", "findMany", {}, C).where).toEqual({
      AND: [{ OR: [{ news: { is: { chambreId: C } } }, { resource: { is: { chambreId: C } } }] }],
    });
  });

  it("création : la Chambre est posée (et remplace celle qui serait donnée)", () => {
    expect(restreindre("Tag", "create", { data: { nom: "VIP" } }, C).data).toEqual({ nom: "VIP", chambreId: C });
    expect(restreindre("Tag", "create", { data: { nom: "VIP", chambreId: "autre" } }, C).data).toEqual({ nom: "VIP", chambreId: C });
    expect(restreindre("Tag", "createMany", { data: [{ nom: "A" }, { nom: "B" }] }, C).data).toEqual([
      { nom: "A", chambreId: C },
      { nom: "B", chambreId: C },
    ]);
  });

  it("création reliée (member: { connect }) : la Chambre aussi par relation", () => {
    expect(restreindre("Invoice", "create", { data: { numero: "1", member: { connect: { id: "m" } } } }, C).data).toEqual({
      numero: "1",
      member: { connect: { id: "m" } },
      chambre: { connect: { id: C } },
    });
    // Par identifiant (memberId) : la Chambre par identifiant
    expect(restreindre("Invoice", "create", { data: { numero: "1", memberId: "m" } }, C).data).toEqual({ numero: "1", memberId: "m", chambreId: C });
  });

  it("créations imbriquées : une entreprise et ses comptes, une facture et ses paiements", () => {
    const m = restreindre("Member", "create", { data: { nom: "E", users: { create: [{ email: "a@x.mg" }, { email: "b@x.mg" }] } } }, C);
    expect(m.data).toEqual({
      nom: "E",
      chambreId: C,
      users: { create: [{ email: "a@x.mg", chambreId: C }, { email: "b@x.mg", chambreId: C }] },
    });
    const f = restreindre("Invoice", "update", { where: { id: "f" }, data: { paiements: { createMany: { data: [{ montant: 1 }] } } } }, C);
    expect(f.data).toEqual({ paiements: { createMany: { data: [{ montant: 1, chambreId: C }] } } });
    // Un événement créé avec sa facture
    const e =restreindre("Event", "create", { data: { titre: "T", factures: { create: { numero: "9" } } } }, C);
    expect(e.data).toEqual({ titre: "T", chambreId: C, factures: { create: { numero: "9", chambreId: C } } });
  });

  it("upsert : where limité et Chambre posée à la création", () => {
    const u = restreindre("Abonne", "upsert", { where: { chambreId_email: { chambreId: C, email: "a@x.mg" } }, create: { email: "a@x.mg" }, update: { prenom: "A" } }, C);
    expect(u.where).toEqual({ chambreId_email: { chambreId: C, email: "a@x.mg" }, AND: [{ chambreId: C }] });
    expect(u.create).toEqual({ email: "a@x.mg", chambreId: C });
    expect(u.update).toEqual({ prenom: "A" });
  });

  it("table des Chambres : seulement la sienne, et pas de création ici", () => {
    expect(restreindre("Chambre", "findMany", {}, C).where).toEqual({ AND: [{ id: C }] });
    expect(() => restreindre("Chambre", "create", { data: {} }, C)).toThrow(ChambreHorsPortee);
  });

  it("offres : communes à toute la plateforme, lues sans filtre, jamais modifiées depuis une Chambre", () => {
    expect(restreindre("Offre", "findMany", { where: { id: "payante" } }, C)).toEqual({ where: { id: "payante" } });
    expect(() => restreindre("Offre", "update", { where: { id: "payante" }, data: { forfait: 0 } }, C)).toThrow(ChambreHorsPortee);
  });

  it("refus : table sans règle, comptes de l'Admin GM, Chambre vide", () => {
    expect(() => restreindre("Inconnue", "findMany", {}, C)).toThrow(ChambreHorsPortee);
    expect(() => restreindre("CompteGM", "findMany", {}, C)).toThrow(ChambreHorsPortee);
    expect(() => restreindre("Member", "findMany", {}, "")).toThrow(ChambreHorsPortee);
  });

  it("ne modifie pas les arguments reçus", () => {
    const args = { where: { id: "m" }, data: { nom: "E", users: { create: { email: "a@x.mg" } } } };
    const copie = structuredClone(args);
    restreindre("Member", "update", args, C);
    restreindre("Member", "create", { data: args.data }, C);
    expect(args).toEqual(copie);
  });
});

describe("Chambre courante", () => {
  it("fixée par avecChambre, y compris après une attente", async () => {
    expect(await avecChambre("b", async () => {
      await new Promise((r) => setTimeout(r, 1));
      return chambreCourante();
    })).toBe("b");
    expect(await avecChambre("a", () => avecChambre("b", () => chambreCourante()))).toBe("b");
  });

  it("hors d'une requête et sans avecChambre : erreur plutôt qu'une Chambre devinée", async () => {
    await expect(chambreCourante()).rejects.toThrow(/hors d'une requête/);
  });
});
