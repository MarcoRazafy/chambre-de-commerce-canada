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

  it("relit un contenu enregistré en corrigeant ce qui est invalide (couleurs hors palette, adresses, types)", () => {
    const d = lireDoc(JSON.stringify({ v: 3, fond: "fuchsia", sections: [
      { type: "bouton", url: "javascript:x", libelle: "Go", couleurBouton: "#ff00ff", taille: 99 },
      { type: "inconnu" },
      { type: "bandeau", image: "javascript:x", titre: "T", fond: "degrade" },
      { type: "reseaux", liens: { facebook: "fb.com/x", tiktok: "javascript:y" } },
    ] }))!;
    expect(d.fond).toBe("brume");
    expect(d.sections.map((s) => s.type)).toEqual(["bouton", "bandeau", "reseaux"]);
    expect(d.sections[0]).toMatchObject({ url: "", libelle: "Go", couleurBouton: "rouge", taille: 22 });
    expect(d.sections[1]).toMatchObject({ image: "", titre: "T", fond: "degrade" });
    expect(d.sections[2]).toMatchObject({ liens: { facebook: "https://fb.com/x", tiktok: "" } });
    expect(lireDoc("Bonjour,\n\ntexte simple")).toBeNull();
  });

  it("reprend une lettre des éditeurs précédents", () => {
    const v2 = lireDoc(JSON.stringify({ v: 2, bandeau: { titre: "Ancien" }, blocs: [{ type: "texte", html: "Bonjour" }], appel: { actif: true, titre: "Venez" }, pied: { reseaux: { linkedin: "https://l.in/x" } } }))!;
    expect(v2.sections.map((s) => s.type)).toEqual(["logo", "bandeau", "texte", "appel", "reseaux", "pied"]);
    expect(v2.sections[1]).toMatchObject({ titre: "Ancien" });
  });

  it("produit le courriel : couleurs de la palette, variables, images absolues, réseaux remplis, désabonnement", () => {
    const doc: DocLettre = { ...docVide({ linkedin: "https://linkedin.com/x" }), apercu: "Pour {prenom}" };
    doc.sections.push(
      { id: "a", type: "image", fond: "", align: "center", url: "/televersements/a.webp", lien: "", alt: "", largeur: 100 },
      { id: "b", type: "texte", fond: "menthe", align: "left", html: "Chez <b>{entreprise}</b>", taille: 16, couleur: "vert" },
    );
    const html = versHtml(doc, O);
    expect(html).toContain("Pour Noro");
    expect(html).toContain("https://site.mg/marque/logo-couleur.png");
    expect(html).toContain('src="https://site.mg/televersements/a.webp"');
    expect(html).toContain("Chez <strong>Bio Sud</strong>");
    expect(html).toContain("background-color:#e3f3ea");
    expect(html).toContain("color:#007140");
    expect(html).toContain("/marque/reseaux/linkedin.png");
    expect(html).not.toContain("/marque/reseaux/facebook.png");
    expect(html).toContain("https://site.mg/desabonnement?x");
    expect(versTexte(doc, O)).toContain("Chez Bio Sud");
  });
});
