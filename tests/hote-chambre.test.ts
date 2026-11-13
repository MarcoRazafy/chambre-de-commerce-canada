import { afterEach, describe, expect, it, vi } from "vitest";
import { brancherRechercheChambre, CHAMBRE_PRINCIPALE, oublierAdresses, resoudreHote } from "@/lib/chambre-courante";
import { lireHote, slugValide } from "@/lib/hote-chambre";

const P = "lalliee-virtuelle.com";

describe("lireHote : l'adresse du site → la Chambre", () => {
  it("sous-domaine de la plateforme (majuscules, port, point final, liste x-forwarded-host)", () => {
    expect(lireHote("cancham.lalliee-virtuelle.com", P, false)).toEqual({ type: "sous-domaine", slug: "cancham" });
    expect(lireHote("Cancham.Lalliee-Virtuelle.com:443", P, false)).toEqual({ type: "sous-domaine", slug: "cancham" });
    expect(lireHote("cancham.lalliee-virtuelle.com.", P, false)).toEqual({ type: "sous-domaine", slug: "cancham" });
    expect(lireHote("cancham.lalliee-virtuelle.com, proxy.interne", P, false)).toEqual({ type: "sous-domaine", slug: "cancham" });
  });

  it("en développement : « slug ».localhost ; en production, non", () => {
    expect(lireHote("essai-b.localhost:3000", null, true)).toEqual({ type: "sous-domaine", slug: "essai-b" });
    expect(lireHote("essai-b.localhost:3000", null, false)).toEqual({ type: "autre", hote: "essai-b.localhost" });
  });

  it("le site public de la plateforme : son domaine, avec ou sans www", () => {
    expect(lireHote("lalliee-virtuelle.com", P, false)).toEqual({ type: "plateforme" });
    expect(lireHote("WWW.lalliee-virtuelle.com:443", P, false)).toEqual({ type: "plateforme" });
    expect(lireHote("www.localhost:3000", null, true)).toEqual({ type: "plateforme" });
    expect(lireHote("localhost:3000", null, true)).toEqual({ type: "plateforme" });
    expect(lireHote("www.localhost:3000", null, false).type).toBe("autre");
    expect(lireHote("localhost:3000", null, false)).toEqual({ type: "autre", hote: "localhost" });
    expect(lireHote("lalliee-virtuelle.com", null, false).type).toBe("autre");
  });

  it("le reste : l'adresse telle quelle (domaine propre, domaine principal, IP)", () => {
    expect(lireHote("cancham.mg", P, false)).toEqual({ type: "autre", hote: "cancham.mg" });
    expect(lireHote("127.0.0.1:3000", P, false)).toEqual({ type: "autre", hote: "127.0.0.1" });
    expect(lireHote(null, P, false)).toEqual({ type: "autre", hote: "" });
  });

  it("sous-domaines réservés et noms invalides : pas une Chambre", () => {
    for (const h of ["app.lalliee-virtuelle.com", "api.lalliee-virtuelle.com", "a.b.lalliee-virtuelle.com", "-x.lalliee-virtuelle.com"]) {
      expect(lireHote(h, P, false).type).toBe("autre");
    }
    // L'espace administrateur de la plateforme
    expect(lireHote("manager.lalliee-virtuelle.com", P, false)).toEqual({ type: "gm" });
    expect(lireHote("manager.localhost:3000", null, true)).toEqual({ type: "gm" });
    expect(lireHote("manager.localhost:3000", null, false).type).toBe("autre");
    // Les espaces partagés : dev. (les équipes), client. (les membres)
    expect(lireHote("dev.lalliee-virtuelle.com", P, false)).toEqual({ type: "partage", espace: "equipe" });
    expect(lireHote("client.lalliee-virtuelle.com", P, false)).toEqual({ type: "partage", espace: "client" });
    expect(lireHote("dev.localhost:3000", null, true)).toEqual({ type: "partage", espace: "equipe" });
    expect(lireHote("client.localhost:3000", null, true)).toEqual({ type: "partage", espace: "client" });
    // gm., manage. restent réservés : ni l'espace administrateur ni une Chambre
    expect(lireHote("gm.lalliee-virtuelle.com", P, false).type).toBe("autre");
    expect(lireHote("manage.lalliee-virtuelle.com", P, false).type).toBe("autre");
    expect(slugValide("client")).toBe(false);
    expect(slugValide("dev")).toBe(false);
    expect(slugValide("cancham")).toBe(true);
    expect(slugValide("www")).toBe(false);
    expect(slugValide("Cancham")).toBe(false);
    expect(slugValide("can_cham")).toBe(false);
  });
});

describe("resoudreHote : recherche en base", () => {
  afterEach(() => {
    oublierAdresses();
    vi.unstubAllEnvs();
  });

  it("sous-domaine connu, inconnu ; domaine propre ; autre adresse → Chambre n° 1", async () => {
    vi.stubEnv("DOMAINE_PLATEFORME", P);
    const cancham = { id: "c-cancham", suspendue: false, restriction: null, accesDev: false, fonctions: null };
    const chercher = vi.fn(async (r: { slug: string } | { domaine: string } | { id: string }) =>
      "slug" in r
        ? r.slug === "cancham" ? cancham : r.slug === "fermee" ? { id: "c-fermee", suspendue: true, restriction: null, accesDev: false, fonctions: null } : r.slug === "retard" ? { id: "c-retard", suspendue: false, restriction: "lecture" as const, accesDev: false, fonctions: null } : null
        : "domaine" in r ? (r.domaine === "cancham.mg" ? cancham : null)
        : { id: r.id, suspendue: false, restriction: null, accesDev: false, fonctions: null },
    );
    brancherRechercheChambre(chercher);
    expect(await resoudreHote("cancham.lalliee-virtuelle.com")).toEqual({ id: "c-cancham", propre: true, partage: null, suspendue: false, restriction: null, accesDev: false, fonctions: null });
    expect(await resoudreHote("inconnue.lalliee-virtuelle.com")).toEqual({ id: null, propre: true, partage: null, suspendue: false, restriction: null, accesDev: false, fonctions: null });
    expect(await resoudreHote("fermee.lalliee-virtuelle.com")).toEqual({ id: "c-fermee", propre: true, partage: null, suspendue: true, restriction: null, accesDev: false, fonctions: null });
    expect(await resoudreHote("retard.lalliee-virtuelle.com")).toEqual({ id: "c-retard", propre: true, partage: null, suspendue: false, restriction: "lecture", accesDev: false, fonctions: null });
    expect(await resoudreHote("cancham.mg")).toEqual({ id: "c-cancham", propre: true, partage: null, suspendue: false, restriction: null, accesDev: false, fonctions: null });
    expect(await resoudreHote("app.exemple.org")).toEqual({ id: CHAMBRE_PRINCIPALE, propre: false, partage: null, suspendue: false, restriction: null, accesDev: false, fonctions: null });
    expect(await resoudreHote("manager.lalliee-virtuelle.com")).toEqual({ id: null, propre: true, partage: null, suspendue: false, restriction: null, accesDev: false, fonctions: null });
    // Espaces partagés : aucune Chambre par l'adresse (elle vient du compte connecté)
    expect(await resoudreHote("dev.lalliee-virtuelle.com")).toEqual({ id: null, propre: true, partage: "equipe", suspendue: false, restriction: null, accesDev: false, fonctions: null });
    expect(await resoudreHote("client.lalliee-virtuelle.com")).toEqual({ id: null, propre: true, partage: "client", suspendue: false, restriction: null, accesDev: false, fonctions: null });
    // Gardé en mémoire : pas de seconde recherche
    await resoudreHote("cancham.lalliee-virtuelle.com");
    expect(chercher).toHaveBeenCalledTimes(7);
  });
});
