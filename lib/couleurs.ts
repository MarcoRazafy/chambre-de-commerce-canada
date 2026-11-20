export type CouleursChambre = {
  principale: string | null;
  laterale: string | null;
  laterale2: string | null;
  haut: string | null;
  connexion: string | null;
  fondConnexion?: string | null;
  texteConnexion?: string | null;
};

const HEX = /^#[0-9a-f]{6}$/i;
export const couleur = (v?: string | null) => (v && HEX.test(v.trim()) ? v.trim().toLowerCase() : null);

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const versHex = (c: number[]) => `#${c.map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, "0")).join("")}`;

export function nuance(hex: string, part: number): string {
  const cible = part >= 0 ? 255 : 0;
  const t = Math.abs(part);
  return versHex(rgb(hex).map((x) => x + (cible - x) * t));
}

export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((x) => {
    const c = x / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const tropClaire = (hex: string) => luminance(hex) > 0.45;

export const BLANC = "#ffffff";
export const TEXTE_FONCE = "#16202b";
export const CONTRASTE_MIN = 4.5;

export function contraste(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

export const texteLisible = (fond: string) => (contraste(fond, BLANC) >= contraste(fond, TEXTE_FONCE) ? BLANC : TEXTE_FONCE);

export function nuanceLisible(hex: string, texte: string = BLANC): string {
  const vers = luminance(texte) > luminance(hex) ? -1 : 1;
  for (let i = 1; i <= 20; i++) {
    const c = nuance(hex, vers * i * 0.05);
    if (contraste(c, texte) >= CONTRASTE_MIN) return c;
  }
  return vers < 0 ? "#000000" : BLANC;
}

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
  const t = couleur(c.texteConnexion) ?? (f && texteLisible(f) === BLANC ? BLANC : null);
  if (!v.length && !f && !t) return "";
  let css = v.length ? `html :is(.espace-admin,.espace-membre,.cadre-auth){${v.join(";")}}` : "";
  if (f) css += `html .cadre-auth{background:${f};--fond-connexion:${f}}`;
  if (t) {
    css += `html .cadre-auth .colonne-connexion{--text:${t};--text-muted:color-mix(in srgb,${t} 80%,transparent);--text-faint:color-mix(in srgb,${t} 65%,transparent);color:${t}}`;
    css += "html .cadre-auth .colonne-connexion :is(.bg-white,.bg-surface,.bg-surface-2,.bg-surface-3,.champ-auth,.champ-auth-cadre){--text:#16202b;--text-muted:#5b6b7a;--text-faint:#8797a6}";
    css += `html .cadre-auth .colonne-connexion main .surtitre{color:color-mix(in srgb,${t} 80%,transparent)}`;
  }
  if (k && texteLisible(k) === BLANC) css += "html .cadre-auth .panneau-connexion{--text:#ffffff;--text-muted:rgba(255,255,255,.82);--text-faint:rgba(255,255,255,.7)}";
  return css;
}
