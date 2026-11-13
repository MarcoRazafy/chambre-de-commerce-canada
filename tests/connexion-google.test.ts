import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  configGoogle,
  defi,
  emailDuJeton,
  lienGoogle,
  lireEtat,
  memeEtat,
  nouvelEtat,
  scellerEtat,
  suiteSure,
  urlAutorisation,
} from "@/lib/google";

const VARS = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_URL_RETOUR"] as const;
const avant: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const v of VARS) avant[v] = process.env[v];
  process.env.GOOGLE_CLIENT_ID = "client-essai.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_SECRET = "secret-essai";
  process.env.GOOGLE_URL_RETOUR = "https://www.exemple.test/api/google/retour";
});
afterEach(() => {
  for (const v of VARS) {
    if (avant[v] === undefined) delete process.env[v];
    else process.env[v] = avant[v];
  }
});

// Un jeton d'identité comme Google le renvoie (la signature n'est pas relue : il arrive directement de Google)
const jeton = (charge: Record<string, unknown>) =>
  ["e30", Buffer.from(JSON.stringify(charge)).toString("base64url"), "signature"].join(".");
const MAINTENANT = Date.UTC(2026, 10, 13, 12);
const valide = {
  iss: "https://accounts.google.com",
  aud: "client-essai.apps.googleusercontent.com",
  exp: MAINTENANT / 1000 + 600,
  email: "Membre@Exemple.test",
  email_verified: true,
};

describe("configuration", () => {
  it("sans l'une des trois variables, la connexion avec Google n'existe pas (pas de bouton)", () => {
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(configGoogle()).toBeNull();
    expect(lienGoogle()).toBeNull();
  });

  it("une adresse de retour invalide désactive aussi la connexion", () => {
    process.env.GOOGLE_URL_RETOUR = "pas une adresse";
    expect(configGoogle()).toBeNull();
  });
});

describe("lien du bouton", () => {
  it("part de l'adresse du retour, avec la Chambre et la page demandée", () => {
    const u = new URL(lienGoogle({ depuis: "chambre_1", suite: "/membre/evenements" })!);
    expect(u.origin).toBe("https://www.exemple.test");
    expect(u.pathname).toBe("/api/google/connexion");
    expect(u.searchParams.get("depuis")).toBe("chambre_1");
    expect(u.searchParams.get("suite")).toBe("/membre/evenements");
  });

  it("ignore une page qui mènerait ailleurs et un identifiant de Chambre douteux", () => {
    const u = new URL(lienGoogle({ depuis: "x'; drop", suite: "//pirate.test/x" })!);
    expect(u.searchParams.has("depuis")).toBe(false);
    expect(u.searchParams.has("suite")).toBe(false);
  });

  it("une page d'arrivée sûre est un chemin de l'espace", () => {
    expect(suiteSure("/admin/membres?page=2")).toBe("/admin/membres?page=2");
    expect(suiteSure("https://pirate.test")).toBe("");
    expect(suiteSure("//pirate.test")).toBe("");
    expect(suiteSure("/\\pirate.test")).toBe("");
    expect(suiteSure(undefined)).toBe("");
  });
});

describe("état signé", () => {
  it("se relit tel qu'il a été posé", () => {
    const e = nouvelEtat("chambre_1", "/admin", MAINTENANT);
    const relu = lireEtat(scellerEtat(e), MAINTENANT + 1000);
    expect(relu).toEqual(e);
    expect(memeEtat(relu!, e.etat)).toBe(true);
    expect(memeEtat(relu!, "autre")).toBe(false);
    expect(memeEtat(relu!, null)).toBe(false);
  });

  it("refuse un cookie modifié ou expiré", () => {
    const e = nouvelEtat("", "", MAINTENANT);
    const [charge, signature] = scellerEtat(e).split(".");
    const falsifie = Buffer.from(JSON.stringify({ ...e, depuis: "autre_chambre" })).toString("base64url");
    expect(lireEtat(`${falsifie}.${signature}`, MAINTENANT)).toBeNull();
    expect(lireEtat(`${charge}.x${signature.slice(1)}`, MAINTENANT)).toBeNull();
    expect(lireEtat(scellerEtat(e), MAINTENANT + 11 * 60 * 1000)).toBeNull();
    expect(lireEtat(undefined)).toBeNull();
    expect(lireEtat("n'importe quoi")).toBeNull();
  });
});

describe("page de Google", () => {
  it("demande l'adresse e-mail, avec l'état et le défi PKCE", () => {
    const e = nouvelEtat("", "", MAINTENANT);
    const u = new URL(urlAutorisation(configGoogle()!, e));
    expect(u.origin).toBe("https://accounts.google.com");
    expect(u.searchParams.get("client_id")).toBe("client-essai.apps.googleusercontent.com");
    expect(u.searchParams.get("redirect_uri")).toBe("https://www.exemple.test/api/google/retour");
    expect(u.searchParams.get("scope")).toBe("openid email");
    expect(u.searchParams.get("state")).toBe(e.etat);
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("code_challenge")).toBe(createHash("sha256").update(e.verificateur).digest("base64url"));
    expect(defi(e.verificateur)).toBe(u.searchParams.get("code_challenge"));
  });
});

describe("jeton d'identité", () => {
  const ID = "client-essai.apps.googleusercontent.com";

  it("donne l'adresse vérifiée, en minuscules", () => {
    expect(emailDuJeton(jeton(valide), ID, MAINTENANT)).toBe("membre@exemple.test");
  });

  it("refuse une adresse que Google n'a pas vérifiée", () => {
    expect(emailDuJeton(jeton({ ...valide, email_verified: false }), ID, MAINTENANT)).toBeNull();
    expect(emailDuJeton(jeton({ ...valide, email_verified: undefined }), ID, MAINTENANT)).toBeNull();
  });

  it("refuse un jeton fait pour une autre application, d'un autre émetteur ou expiré", () => {
    expect(emailDuJeton(jeton({ ...valide, aud: "autre-client" }), ID, MAINTENANT)).toBeNull();
    expect(emailDuJeton(jeton({ ...valide, iss: "https://pirate.test" }), ID, MAINTENANT)).toBeNull();
    expect(emailDuJeton(jeton({ ...valide, exp: MAINTENANT / 1000 - 1 }), ID, MAINTENANT)).toBeNull();
  });

  it("refuse un jeton mal formé ou sans adresse", () => {
    expect(emailDuJeton("abc", ID, MAINTENANT)).toBeNull();
    expect(emailDuJeton("a.b.c", ID, MAINTENANT)).toBeNull();
    expect(emailDuJeton(jeton({ ...valide, email: "" }), ID, MAINTENANT)).toBeNull();
  });
});
