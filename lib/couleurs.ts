// Couleurs d'une Chambre (Paramètres → Couleurs) : la barre latérale (une couleur ou un dégradé de deux), la barre
// du haut, la couleur principale (boutons, liens, mots en relief) et le fond de la page de connexion. Chaque couleur
// vide garde celle de la plateforme. Le CSS produit ne redéfinit que les variables de l'interface, sur les espaces
// de la Chambre (back-office, espace membre, connexion) : jamais le site ni l'espace Administrateur.

export type CouleursChambre = {
  principale: string | null;
  laterale: string | null;
  laterale2: string | null;
  haut: string | null;
  connexion: string | null;
  /** Page de connexion et d'adhésion : le fond du formulaire et la couleur de son texte */
  fondConnexion?: string | null;
  texteConnexion?: string | null;
};

const HEX = /^#[0-9a-f]{6}$/i;
export const couleur = (v?: string | null) => (v && HEX.test(v.trim()) ? v.trim().toLowerCase() : null);

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const versHex = (c: number[]) => `#${c.map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, "0")).join("")}`;

// Mélange une couleur avec le blanc (part > 0) ou le noir (part < 0) : -0.2 = 20 % plus sombre
export function nuance(hex: string, part: number): string {
  const cible = part >= 0 ? 255 : 0;
  const t = Math.abs(part);
  return versHex(rgb(hex).map((x) => x + (cible - x) * t));
}

// Luminance relative (WCAG) : au-delà de ~0.45, un texte blanc devient peu lisible
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((x) => {
    const c = x / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const tropClaire = (hex: string) => luminance(hex) > 0.45;

// Les variables CSS à poser, ou une chaîne vide si rien n'est réglé
export function cssCouleurs(c: CouleursChambre): string {
  const v: string[] = [];
  const p = couleur(c.principale);
  if (p) {
    v.push(
      `--accent:${p}`, `--accent-strong:${nuance(p, -0.2)}`, `--accent-soft:${nuance(p, 0.9)}`,
      `--marque-rouge:${p}`, `--marque-rouge-clair:${nuance(p, 0.2)}`,
      `--bouton-rouge:linear-gradient(120deg,${nuance(p, 0.15)} 0%,${p} 58%,${nuance(p, -0.22)} 100%)`,
      `--bouton-rouge-survol:linear-gradient(120deg,${nuance(p, 0.25)} 0%,${nuance(p, 0.08)} 58%,${nuance(p, -0.12)} 100%)`,
    );
  }
  const l = couleur(c.laterale);
  const l2 = couleur(c.laterale2);
  if (l) v.push(`--laterale:${l2 ? `linear-gradient(180deg,${l} 0%,${l2} 100%)` : l}`);
  const h = couleur(c.haut);
  if (h) v.push(`--superieure:${h}`);
  const k = couleur(c.connexion);
  if (k) v.push(`--connexion:${k}`);
  const f = couleur(c.fondConnexion);
  // Texte : celui choisi ; sur un fond foncé sans choix, blanc
  const t = couleur(c.texteConnexion) ?? (f && !tropClaire(f) ? "#ffffff" : null);
  if (!v.length && !f && !t) return "";
  // « html » devant : passe avant les valeurs de la plateforme (globals.css), à sélecteur égal
  let css = v.length ? `html :is(.espace-admin,.espace-membre,.cadre-auth){${v.join(";")}}` : "";
  if (f) css += `html .cadre-auth{background:${f};--fond-connexion:${f}}`;
  if (t) {
    // Le texte de la colonne du formulaire ; les champs, cartes et boutons blancs gardent un texte foncé
    css += `html .cadre-auth .colonne-connexion{--text:${t};--text-muted:color-mix(in srgb,${t} 80%,transparent);--text-faint:color-mix(in srgb,${t} 65%,transparent);color:${t}}`;
    css += "html .cadre-auth .colonne-connexion :is(.bg-white,.bg-surface,.bg-surface-2,.bg-surface-3,.champ-auth,.champ-auth-cadre){--text:#16202b;--text-muted:#5b6b7a;--text-faint:#8797a6}";
    // Le petit titre au-dessus du grand : dans la couleur du texte (le rouge ou le vert se perdent sur un fond foncé)
    css += `html .cadre-auth .colonne-connexion main .surtitre{color:color-mix(in srgb,${t} 80%,transparent)}`;
  }
  // Fond de connexion foncé : le texte du panneau passe en clair
  if (k && !tropClaire(k)) css += "html .cadre-auth .panneau-connexion{--text:#ffffff;--text-muted:rgba(255,255,255,.82);--text-faint:rgba(255,255,255,.7)}";
  return css;
}
