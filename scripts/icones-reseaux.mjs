// Génère les icônes des réseaux sociaux de la newsletter (PNG : Gmail n'affiche pas le SVG),
// une par couleur de la palette : public/marque/reseaux/<reseau>-<couleur>.png
// Lancer : node scripts/icones-reseaux.mjs
import sharp from "sharp";

const PALETTE = {
  rouge: "#ad0707", bordeaux: "#8b0512", vert: "#007140", marine: "#0f1d2c", encre: "#16202b", ardoise: "#5b6b7a",
  blanc: "#ffffff", rose: "#fdeaed", menthe: "#e3f3ea", ciel: "#e6ecf4", brume: "#f1f4f7",
};
const CLAIRES = new Set(["blanc", "rose", "menthe", "ciel", "brume"]);

const icones = {
  facebook: (c) => `<path fill="${c}" d="M52 78V52h9l1.5-10H52v-6.5c0-3 .9-5 5.2-5H63v-9a74 74 0 0 0-8-.4c-8 0-13.4 4.9-13.4 13.8V42H33v10h8.6v26z"/>`,
  youtube: (c, fond) => `<rect x="20" y="30" width="56" height="38" rx="11" fill="${c}"/><path fill="${fond}" d="M42 39v20l17-10z"/>`,
  linkedin: (c) => `<rect x="26" y="40" width="9" height="30" fill="${c}"/><circle cx="30.5" cy="30" r="5.5" fill="${c}"/><path fill="${c}" d="M42 40h8.6v4.2c1.7-3 5.2-5 9.6-5 8 0 9.8 5 9.8 11.8V70h-9V53c0-4-.6-6.6-4.4-6.6-3.9 0-5.6 2.7-5.6 6.6v17h-9z"/>`,
  instagram: (c) => `<rect x="26" y="26" width="44" height="44" rx="13" fill="none" stroke="${c}" stroke-width="6"/><circle cx="48" cy="48" r="10" fill="none" stroke="${c}" stroke-width="6"/><circle cx="61" cy="35" r="3.4" fill="${c}"/>`,
  tiktok: (c) => `<path fill="${c}" d="M52 22h9c.6 6.8 4.6 11 11 11.6v9c-4.2.1-8-1.1-11-3.3V58c0 9.4-7.5 16-16.4 16C35.7 74 29 67.4 29 58.4c0-9.6 8-16.6 18-15.4v9.2c-4.7-1-8.7 1.8-8.7 6.2 0 3.8 3 6.6 6.8 6.6 4 0 6.9-2.8 6.9-7.4z"/>`,
};

const travaux = [];
for (const [couleur, fond] of Object.entries(PALETTE)) {
  const motif = CLAIRES.has(couleur) ? PALETTE.marine : "#ffffff";
  const bord = couleur === "blanc" ? `<circle cx="48" cy="48" r="47" fill="none" stroke="#e5eaf0" stroke-width="2"/>` : "";
  for (const [nom, dessin] of Object.entries(icones)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><circle cx="48" cy="48" r="48" fill="${fond}"/>${bord}${dessin(motif, fond)}</svg>`;
    travaux.push(sharp(Buffer.from(svg)).png().toFile(`public/marque/reseaux/${nom}-${couleur}.png`));
  }
}
await Promise.all(travaux);
console.log(`${travaux.length} icônes générées`);
