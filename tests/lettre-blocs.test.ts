import { describe, expect, it } from "vitest";
import { blocVide, docVide, lireDoc, miseEnForme, urlSure, versHtml, versTexte } from "@/lib/lettre-blocs";

const O = { base: "https://site.mg", logo: "<b>logo</b>", vars: { prenom: "Noro", entreprise: "Bio Sud" }, pied: ["Pied"] };

describe("lettre en blocs", () => {
  it("met en forme gras, italique, souligné, liens, listes et variables, en échappant le reste", () => {
    const h = miseEnForme("Bonjour {prenom} <script>\n**gras** *ital* __soul__ [site](https://a.mg)\n\n- un\n- deux", { prenom: "Noro" }, "#ad0707", "");
    expect(h).toContain("Bonjour Noro &lt;script&gt;");
    expect(h).toContain("<strong>gras</strong> <em>ital</em> <u>soul</u>");
    expect(h).toContain('<a href="https://a.mg" style="color:#ad0707');
    expect(h).toContain("<ul");
    expect(h).toContain("<li style=\"margin:0 0 4px\">deux</li>");
  });

  it("refuse les adresses dangereuses", () => {
    expect(urlSure("javascript:alert(1)")).toBe("");
    expect(urlSure("cancham.mg/agenda")).toBe("https://cancham.mg/agenda");
    expect(urlSure("/televersements/lettre-1.webp")).toBe("/televersements/lettre-1.webp");
    expect(miseEnForme("[x](javascript:alert(1))", {}, "#000000", "")).not.toContain("href");
  });

  it("relit un contenu enregistré en corrigeant ce qui est invalide", () => {
    const d = lireDoc(JSON.stringify({ v: 1, fond: "rouge", police: "Comic", largeur: 9999, blocs: [{ type: "bouton", url: "javascript:x", fond: "#123456" }, { type: "inconnu" }] }));
    expect(d).toMatchObject({ fond: "#f3f5f8", police: "Arial", largeur: 600 });
    expect(d!.blocs).toHaveLength(1);
    expect(d!.blocs[0]).toMatchObject({ type: "bouton", url: "", fond: "#123456" });
    expect(lireDoc("Bonjour,\n\ntexte simple")).toBeNull();
  });

  it("produit le HTML du courriel : ligne d'aperçu, images absolues, variables, pied", () => {
    const doc = { ...docVide(), apercu: "Pour {prenom}", blocs: [{ ...blocVide("image"), url: "/televersements/a.webp" }, { ...blocVide("texte"), texte: "Chez {entreprise}" }] } as ReturnType<typeof docVide>;
    const html = versHtml(doc, O);
    expect(html).toContain("Pour Noro");
    expect(html).toContain('src="https://site.mg/televersements/a.webp"');
    expect(html).toContain("Chez Bio Sud");
    expect(html).toContain("Pied");
    expect(versTexte(doc, O.vars, O.pied)).toContain("Chez Bio Sud");
  });
});
