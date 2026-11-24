import { BLANC, contraste, couleur, texteLisible } from "@/lib/couleurs";

export type CouleursPage = { haut: string | null; pied: string | null; pied2: string | null };

export const HAUT_DEFAUT = "#0f1d2c";
export const PIED_DEFAUT = "#a3122a";
export const PIED2_DEFAUT = "#007140";
const FOND_HAUT_DEFAUT = "linear-gradient(90deg,#14293e 0%,#0f1d2c 100%)";
const FOND_PIED_DEFAUT = "linear-gradient(100deg,#a3122a 0%,#5c1220 32%,#2a1f26 50%,#123f2d 70%,#007140 100%)";
const ROUGE_BOUTON = "#ad0707";

const melange = (a: string, b: string) =>
  `#${[1, 3, 5].map((i) => Math.round((parseInt(a.slice(i, i + 2), 16) + parseInt(b.slice(i, i + 2), 16)) / 2).toString(16).padStart(2, "0")).join("")}`;

export type StylePage = {
  fondHaut: string;
  hautSombre: boolean;
  boutonClair: boolean;
  fondPied: string;
  piedSombre: boolean;
};

export function stylePagePublique(evenement: CouleursPage | null, chambre: CouleursPage | null): StylePage {
  const haut = couleur(evenement?.haut) ?? couleur(chambre?.haut);
  const [pied, pied2] = couleur(evenement?.pied)
    ? [couleur(evenement?.pied)!, couleur(evenement?.pied2) ?? couleur(evenement?.pied)!]
    : couleur(chambre?.pied)
      ? [couleur(chambre?.pied)!, couleur(chambre?.pied2) ?? couleur(chambre?.pied)!]
      : [null, null];
  return {
    fondHaut: haut ?? FOND_HAUT_DEFAUT,
    hautSombre: texteLisible(haut ?? HAUT_DEFAUT) === BLANC,
    boutonClair: haut ? contraste(haut, ROUGE_BOUTON) < 1.6 : false,
    fondPied: pied && pied2 ? (pied === pied2 ? pied : `linear-gradient(100deg,${pied} 0%,${pied2} 100%)`) : FOND_PIED_DEFAUT,
    piedSombre: texteLisible(pied && pied2 ? melange(pied, pied2) : "#2a1f26") === BLANC,
  };
}
