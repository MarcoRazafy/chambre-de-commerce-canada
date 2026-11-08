import { beforeEach, describe, expect, it, vi } from "vitest";

// Une base en mémoire : les membres et les mises en relation (faites ou écartées)
type MembreTest = {
  id: string;
  nom: string;
  statut: string;
  pays: string | null;
  besoinsTags: string[];
  offresTags: string[];
  interetsTags: string[];
  besoins: string | null;
  motivation: string | null;
  maillage: { reponses: unknown } | null;
};
type RelationTest = {
  id: string;
  memberAId: string;
  memberBId: string;
  statut: string;
  note: string | null;
  createdAt: Date;
};

let membres: MembreTest[] = [];
let miseEnRelations: RelationTest[] = [];

vi.mock("@/lib/db", () => ({
  prisma: {
    member: {
      findMany: async ({ where }: { where?: { statut?: { in: string[] } } } = {}) =>
        membres.filter((m) => !where?.statut || where.statut.in.includes(m.statut)),
    },
    miseEnRelation: {
      findMany: async ({
        where,
      }: {
        where?: { statut?: string; OR?: { memberAId?: string; memberBId?: string }[] };
      } = {}) => {
        const fiche = (id: string) => {
          const m = membres.find((x) => x.id === id)!;
          return { id: m.id, nom: m.nom, secteur: "", ville: "", pays: m.pays, logo: null };
        };
        return miseEnRelations
          .filter((r) => !where?.statut || r.statut === where.statut)
          .filter(
            (r) =>
              !where?.OR ||
              where.OR.some((c) => r.memberAId === c.memberAId || r.memberBId === c.memberBId),
          )
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map((r) => ({ ...r, memberA: fiche(r.memberAId), memberB: fiche(r.memberBId) }));
      },
    },
  },
}));

const { suggestions, relations } = await import("@/lib/maillage-donnees");
const { QUESTIONS, estRepondu, nettoyer, prerempli, progression, texteDemande } = await import(
  "@/lib/maillage"
);

function membre(id: string, champs: Partial<MembreTest> = {}): MembreTest {
  return {
    id,
    nom: `Entreprise ${id}`,
    statut: "a_jour",
    pays: "Madagascar",
    besoinsTags: [],
    offresTags: [],
    interetsTags: [],
    besoins: null,
    motivation: null,
    maillage: null,
    ...champs,
  };
}

function relation(a: string, b: string, statut = "relation", jour = 1): RelationTest {
  return {
    id: `${a}-${b}`,
    memberAId: a,
    memberBId: b,
    statut,
    note: null,
    createdAt: new Date(Date.UTC(2026, 10, jour)),
  };
}

const paire = (s: { a: { id: string }; b: { id: string } }) => [s.a.id, s.b.id].sort().join("|");

beforeEach(() => {
  membres = [];
  miseEnRelations = [];
});

describe("suggestions de mises en relation", () => {
  it("rapprochent un besoin et l'offre correspondante d'un autre membre", async () => {
    membres = [
      membre("m1", { besoinsTags: ["Comptabilité"] }),
      membre("m2", { offresTags: ["Comptabilité"] }),
    ];
    const s = await suggestions();
    expect(s).toHaveLength(1);
    expect(s[0].flows).toEqual([{ tag: "Comptabilité", from: "m2", to: "m1" }]);
    expect(s[0].why).toContain("Entreprise m1 cherche « Comptabilité », proposé par Entreprise m2");
  });

  it("ne proposent rien sans besoin couvert par une offre", async () => {
    membres = [
      membre("m1", { besoinsTags: ["Comptabilité"], interetsTags: ["IA"] }),
      membre("m2", { offresTags: ["Juridique"], interetsTags: ["IA"], pays: "Canada" }),
    ];
    expect(await suggestions()).toEqual([]);
  });

  it("ignorent une étiquette trop générale", async () => {
    membres = [
      membre("m1", { besoinsTags: ["Réseau d’affaires au Canada"] }),
      membre("m2", { offresTags: ["Réseau d’affaires au Canada"] }),
    ];
    expect(await suggestions()).toEqual([]);
  });

  it("exigent que le besoin se retrouve dans ce que le membre a écrit", async () => {
    membres = [
      membre("m1", { besoinsTags: ["Transport & logistique"], besoins: "Nous cherchons des clients." }),
      membre("m2", { offresTags: ["Transport & logistique"] }),
    ];
    expect(await suggestions()).toEqual([]);

    membres[0].besoins = "Nous cherchons un partenaire pour la logistique vers Montréal.";
    expect(await suggestions()).toHaveLength(1);
  });

  it("lisent aussi la motivation et la section C du questionnaire", async () => {
    membres = [
      membre("m1", { besoinsTags: ["Transport & logistique"], motivation: "Développer l'export." }),
      membre("m2", {
        besoinsTags: ["Formation & montée en compétences"],
        maillage: { reponses: { C2: { texte: "Une formation pour nos équipes" } } },
      }),
      membre("m3", { offresTags: ["Transport & logistique", "Formation & montée en compétences"] }),
    ];
    const s = await suggestions();
    expect(s.map(paire).sort()).toEqual(["m1|m3", "m2|m3"]);
  });

  it("calculent le score : 61 pour un besoin, plus pour le pont Canada–Madagascar et les intérêts communs", async () => {
    membres = [
      membre("m1", { besoinsTags: ["Comptabilité"] }),
      membre("m2", { offresTags: ["Comptabilité"] }),
    ];
    expect((await suggestions())[0]).toMatchObject({ score: 61, bridge: false, shared: [] });

    membres[1].pays = "Canada";
    expect((await suggestions())[0]).toMatchObject({ score: 71, bridge: true });

    membres[0].interetsTags = ["IA", "Énergie"];
    membres[1].interetsTags = ["IA"];
    const s = (await suggestions())[0];
    expect(s).toMatchObject({ score: 83, shared: ["IA"] });
    expect(s.why).toContain("Intérêts communs : IA");
    expect(s.why).toContain("Un membre au Canada, l’autre à Madagascar");
  });

  it("plafonnent le score à 97", async () => {
    membres = [
      membre("m1", { besoinsTags: ["Comptabilité", "Juridique"], offresTags: ["Design"], pays: "Canada" }),
      membre("m2", { besoinsTags: ["Design"], offresTags: ["Comptabilité", "Juridique"] }),
    ];
    const [s] = await suggestions();
    expect(s.flows).toHaveLength(3);
    expect(s.score).toBe(97);
  });

  it("comptent un membre sans pays comme malgache", async () => {
    membres = [
      membre("m1", { besoinsTags: ["Comptabilité"], pays: null }),
      membre("m2", { offresTags: ["Comptabilité"], pays: "Madagascar" }),
    ];
    expect((await suggestions())[0].bridge).toBe(false);
  });

  it("classent les meilleures d'abord", async () => {
    membres = [
      membre("m1", { besoinsTags: ["Comptabilité"] }),
      membre("m2", { offresTags: ["Comptabilité"] }),
      membre("m3", { offresTags: ["Comptabilité"], pays: "Canada" }),
    ];
    const s = await suggestions();
    expect(s.map((x) => x.score)).toEqual([71, 61]);
    expect(paire(s[0])).toBe("m1|m3");
  });

  it("laissent de côté les candidatures et les adhésions refusées", async () => {
    membres = [
      membre("m1", { besoinsTags: ["Comptabilité"] }),
      membre("m2", { offresTags: ["Comptabilité"], statut: "candidature" }),
      membre("m3", { offresTags: ["Comptabilité"], statut: "refusee" }),
      membre("m4", { offresTags: ["Comptabilité"], statut: "en_retard" }),
      membre("m5", { offresTags: ["Comptabilité"], statut: "en_attente" }),
    ];
    expect((await suggestions()).map(paire).sort()).toEqual(["m1|m4", "m1|m5"]);
  });

  it("ne reproposent pas une paire déjà mise en relation ou écartée, dans un sens comme dans l'autre", async () => {
    membres = [
      membre("m1", { besoinsTags: ["Comptabilité"] }),
      membre("m2", { offresTags: ["Comptabilité"] }),
      membre("m3", { offresTags: ["Comptabilité"] }),
      membre("m4", { offresTags: ["Comptabilité"] }),
    ];
    miseEnRelations = [relation("m2", "m1", "relation"), relation("m1", "m3", "ignoree")];
    expect((await suggestions()).map(paire)).toEqual(["m1|m4"]);
  });

  it("retiennent trois suggestions au plus par membre dans la vue d'ensemble", async () => {
    membres = [
      membre("hub", { offresTags: ["Comptabilité"] }),
      ...["d1", "d2", "d3", "d4", "d5"].map((id) => membre(id, { besoinsTags: ["Comptabilité"] })),
    ];
    const s = await suggestions();
    expect(s).toHaveLength(3);
    expect(s.every((x) => x.a.id === "hub" || x.b.id === "hub")).toBe(true);
  });

  it("donnent toutes les suggestions d'un membre, et seulement les siennes, sur sa fiche", async () => {
    membres = [
      membre("hub", { offresTags: ["Comptabilité"] }),
      ...["d1", "d2", "d3", "d4", "d5"].map((id) => membre(id, { besoinsTags: ["Comptabilité"] })),
      membre("x1", { besoinsTags: ["Juridique"] }),
      membre("x2", { offresTags: ["Juridique"] }),
    ];
    const pourHub = await suggestions("hub");
    expect(pourHub).toHaveLength(5);
    expect(pourHub.every((x) => x.a.id === "hub" || x.b.id === "hub")).toBe(true);

    expect((await suggestions("d1")).map(paire)).toEqual(["d1|hub"]);
    expect((await suggestions("x1")).map(paire)).toEqual(["x1|x2"]);
  });
});

describe("mises en relation", () => {
  it("ne listent que celles faites, pas les suggestions écartées", async () => {
    membres = [membre("m1"), membre("m2"), membre("m3")];
    miseEnRelations = [relation("m1", "m2", "relation"), relation("m1", "m3", "ignoree")];
    const rs = await relations();
    expect(rs.map((r) => r.id)).toEqual(["m1-m2"]);
    expect(rs[0].autre).toBeNull();
  });

  it("donnent, pour un membre, l'autre entreprise de chaque relation, la plus récente d'abord", async () => {
    membres = [membre("m1"), membre("m2"), membre("m3"), membre("m4")];
    miseEnRelations = [
      relation("m1", "m2", "relation", 1),
      relation("m3", "m1", "relation", 5),
      relation("m2", "m4", "relation", 3),
    ];
    const rs = await relations("m1");
    expect(rs.map((r) => r.autre?.id)).toEqual(["m3", "m2"]);
    expect(rs[0].createdAt).toBe("2026-11-05T00:00:00.000Z");
  });
});

describe("questionnaire de maillage", () => {
  const question = (id: string) => QUESTIONS.find((q) => q.id === id)!;

  it("compte les questions répondues", () => {
    expect(progression({})).toEqual({ faites: 0, total: QUESTIONS.length, pct: 0 });
    const r = { A3: "Nous distillons des huiles essentielles.", C4: "Trouver un transporteur." };
    expect(progression(r)).toMatchObject({ faites: 2, pct: Math.round((2 / QUESTIONS.length) * 100) });
  });

  it("ne compte pas une réponse vide ou d'un seul caractère", () => {
    expect(estRepondu(question("A3"), "")).toBe(false);
    expect(estRepondu(question("A3"), "x")).toBe(false);
    expect(estRepondu(question("A3"), "  ")).toBe(false);
    expect(estRepondu(question("A3"), null)).toBe(false);
  });

  it("exige les champs obligatoires", () => {
    expect(estRepondu(question("A1"), { annee: "2015", site: "https://x.mg" })).toBe(false);
    expect(estRepondu(question("A1"), { nom: "Bio Sud" })).toBe(true);
    expect(estRepondu(question("C2"), { delai: "2026-12-01" })).toBe(false);
  });

  it("exige au moins une fiche remplie", () => {
    expect(estRepondu(question("B1"), [])).toBe(false);
    expect(estRepondu(question("B1"), [{ description: "sans nom" }])).toBe(false);
    expect(estRepondu(question("B1"), [{ nom: "Huile de girofle" }])).toBe(true);
  });

  it("exige le détail quand il est obligatoire", () => {
    expect(estRepondu(question("D1"), { choix: ["PME"] })).toBe(false);
    expect(estRepondu(question("D1"), { choix: ["PME"], details: "Les hôtels de Nosy Be" })).toBe(true);
    expect(estRepondu(question("B5"), { choix: ["Laboratoire"] })).toBe(true);
  });

  it("accepte une liste de mots-clés ou de secteurs non vide", () => {
    expect(estRepondu(question("D3"), { actuels: [], vises: [] })).toBe(false);
    expect(estRepondu(question("D3"), { vises: ["Ontario"] })).toBe(true);
    expect(estRepondu(question("A2"), { noms: [] })).toBe(false);
    expect(estRepondu(question("A2"), { noms: ["Agribusiness"] })).toBe(true);
  });

  it("nettoie les réponses envoyées : questions inconnues et réponses trop longues retirées", () => {
    const r = nettoyer({ A3: "Bonjour", Z9: "piège", C4: "x".repeat(9000) });
    expect(r).toEqual({ A3: "Bonjour" });
    expect(nettoyer("pas un objet")).toEqual({});
    expect(nettoyer(["A3"])).toEqual({});
  });

  it("préremplit à partir de la fiche du membre", () => {
    expect(
      prerempli({ nom: "Bio Sud", siteweb: "biosud.mg", secteur: "Agribusiness", desc: "", activite: "Distillation" }),
    ).toEqual({
      A1: { nom: "Bio Sud", site: "biosud.mg" },
      A2: { noms: ["Agribusiness"] },
      A3: "Distillation",
    });
    expect(prerempli({})).toEqual({});
  });

  it("rassemble ce que le membre cherche (section C)", () => {
    const t = texteDemande({
      C1: [{ poste: "Emballages carton", volume: "20 tonnes" }],
      C2: { texte: "Un transporteur frigorifique" },
      C4: "Les délais de dédouanement",
      A3: "Ne doit pas apparaître",
    });
    expect(t).toContain("Emballages carton 20 tonnes");
    expect(t).toContain("Un transporteur frigorifique");
    expect(t).toContain("Les délais de dédouanement");
    expect(t).not.toContain("Ne doit pas apparaître");
    expect(texteDemande({})).toBe("");
  });
});
