import { describe, expect, it } from "vitest";
import { docVide, lireDoc, nettoyerHtml, urlSure, versHtml, versTexte, type DocLettre } from "@/lib/lettre-blocs";

const O = {
  base: "https://site.mg",
  vars: { prenom: "Noro", entreprise: "Bio Sud" },
  mention: "Vous êtes membre.",
  desabonnement: "https://site.mg/desabonnement?x",
  coordonnees: { adresse: "Antananarivo", email: "info@x.mg", telephone: "+261", confidentialite: "https://x.mg/conf" },
};

describe("lettre de la newsletter", () => {
  it("nettoie le texte mis en forme : garde gras, italique, liens sûrs, listes ; retire le reste", () => {
    const h = nettoyerHtml('<b>gras</b> <i onclick="x">ital</i> <script>alert(1)</script><a href="javascript:x">a</a> <a href="https://a.mg" target="_blank">b</a><img src=x onerror=y><ul><li>un</li></ul><span style="color:red">t</span>');
    expect(h).toBe('<strong>gras</strong> <em>ital</em> <a>a</a> <a href="https://a.mg">b</a><ul><li>un</li></ul>t');
  });

  it("refuse les adresses dangereuses", () => {
    expect(urlSure("javascript:alert(1)")).toBe("");
    expect(urlSure("cancham.mg/agenda")).toBe("https://cancham.mg/agenda");
    expect(urlSure("/televersements/lettre-1.webp")).toBe("/televersements/lettre-1.webp");
  });

  it("relit un contenu enregistré en corrigeant ce qui est invalide, et reprend une lettre du premier éditeur", () => {
    const d = lireDoc(JSON.stringify({ v: 2, bandeau: { image: "javascript:x", titre: "T" }, blocs: [{ type: "bouton", url: "javascript:x", libelle: "Go" }, { type: "inconnu" }], pied: { reseaux: { facebook: "fb.com/x", tiktok: "javascript:y" } } }))!;
    expect(d.bandeau).toMatchObject({ image: "", titre: "T" });
    expect(d.blocs).toEqual([expect.objectContaining({ type: "bouton", url: "", libelle: "Go" })]);
    expect(d.pied.reseaux).toMatchObject({ facebook: "https://fb.com/x", tiktok: "" });
    const v1 = lireDoc(JSON.stringify({ v: 1, blocs: [{ type: "bandeau", titre: "Ancien" }, { type: "texte", texte: "Bonjour\nà tous" }] }))!;
    expect(v1.bandeau.titre).toBe("Ancien");
    expect(v1.blocs).toEqual([expect.objectContaining({ type: "texte", html: "Bonjour<br>à tous" })]);
    expect(lireDoc("Bonjour,\n\ntexte simple")).toBeNull();
  });

  it("produit le courriel : logo, bandeau, variables, images absolues, réseaux remplis, pied, désabonnement", () => {
    const base = docVide({ linkedin: "https://linkedin.com/x" });
    const doc: DocLettre = {
      ...base,
      apercu: "Pour {prenom}",
      blocs: [{ id: "a", type: "image", url: "/televersements/a.webp", lien: "", alt: "" }, { id: "b", type: "texte", html: "Chez <b>{entreprise}</b>" }],
    };
    const html = versHtml(doc, O);
    expect(html).toContain("Pour Noro");
    expect(html).toContain("https://site.mg/marque/logo-couleur.png");
    expect(html).toContain('src="https://site.mg/televersements/a.webp"');
    expect(html).toContain("Chez <strong>Bio Sud</strong>");
    expect(html).toContain("/marque/reseaux/linkedin.png");
    expect(html).not.toContain("/marque/reseaux/facebook.png");
    expect(html).toContain("https://site.mg/desabonnement?x");
    expect(versTexte(doc, O)).toContain("Chez Bio Sud");
  });
});
