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
    expect(lireHote("localhost:3000", null, true)).toEqual({ type: "autre", hote: "localhost" });
  });

  it("le reste : l'adresse telle quelle (domaine propre, domaine principal, IP)", () => {
    expect(lireHote("cancham.mg", P, false)).toEqual({ type: "autre", hote: "cancham.mg" });
    expect(lireHote("lalliee-virtuelle.com", P, false)).toEqual({ type: "autre", hote: "lalliee-virtuelle.com" });
    expect(lireHote("127.0.0.1:3000", P, false)).toEqual({ type: "autre", hote: "127.0.0.1" });
    expect(lireHote(null, P, false)).toEqual({ type: "autre", hote: "" });
  });

  it("sous-domaines réservés et noms invalides : pas une Chambre", () => {
    for (const h of ["www.lalliee-virtuelle.com", "gm.lalliee-virtuelle.com", "a.b.lalliee-virtuelle.com", "-x.lalliee-virtuelle.com"]) {
      expect(lireHote(h, P, false).type).toBe("autre");
    }
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
    const chercher = vi.fn(async (r: { slug: string } | { domaine: string }) =>
      "slug" in r ? (r.slug === "cancham" ? "c-cancham" : null) : r.domaine === "cancham.mg" ? "c-cancham" : null,
    );
    brancherRechercheChambre(chercher);
    expect(await resoudreHote("cancham.lalliee-virtuelle.com")).toEqual({ id: "c-cancham", propre: true });
    expect(await resoudreHote("inconnue.lalliee-virtuelle.com")).toEqual({ id: null, propre: true });
    expect(await resoudreHote("cancham.mg")).toEqual({ id: "c-cancham", propre: true });
    expect(await resoudreHote("app.exemple.org")).toEqual({ id: CHAMBRE_PRINCIPALE, propre: false });
    // Gardé en mémoire : pas de seconde recherche
    await resoudreHote("cancham.lalliee-virtuelle.com");
    expect(chercher).toHaveBeenCalledTimes(4);
  });
});
