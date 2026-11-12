import { describe, expect, it } from "vitest";
import { filtrerNav, fonctionDuChemin } from "@/lib/fonctions-plateforme";
import { NAV_ADMIN, NAV_MEMBRE } from "@/lib/nav";

const hrefs = (nav: { items: { href: string }[] }[]) => nav.flatMap((g) => g.items.map((i) => i.href));

describe("fonctions incluses dans l'offre de la Chambre", () => {
  it("chaque page a sa fonction, sans confondre les adresses voisines", () => {
    expect(fonctionDuChemin("/admin/newsletter/nouvelle")).toBe("newsletter");
    expect(fonctionDuChemin("/membre/evenements/abc")).toBe("evenements");
    expect(fonctionDuChemin("/admin/offres")).toBe("offres");
    expect(fonctionDuChemin("/admin/offres-cancham")).toBe("ressources");
    expect(fonctionDuChemin("/admin/membres")).toBeNull();
    expect(fonctionDuChemin("/admin/messageries")).toBeNull();
  });

  it("le menu perd les fonctions non incluses ; sans réglage, rien ne change", () => {
    expect(filtrerNav(NAV_ADMIN, null)).toEqual(NAV_ADMIN);
    const admin = hrefs(filtrerNav(NAV_ADMIN, ["evenements", "messagerie"]));
    expect(admin).toContain("/admin/evenements");
    expect(admin).toContain("/admin/membres");
    expect(admin).not.toContain("/admin/newsletter");
    expect(admin).not.toContain("/admin/maillage");
    const membre = hrefs(filtrerNav(NAV_MEMBRE, []));
    expect(membre).toContain("/membre/cotisations");
    expect(membre).not.toContain("/membre/messagerie");
    // Aucune rubrique vide
    expect(filtrerNav(NAV_MEMBRE, []).every((g) => g.items.length)).toBe(true);
  });
});
