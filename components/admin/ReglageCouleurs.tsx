"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Check, RotateCcw, TriangleAlert } from "lucide-react";
import { BLANC, contraste, CONTRASTE_MIN, nuance, nuanceLisible, texteLisible } from "@/lib/couleurs";

type Champ = "couleurPrincipale" | "couleurLaterale" | "couleurLaterale2" | "couleurHaut" | "couleurConnexion" | "couleurFondConnexion" | "couleurTexteConnexion";
export type ValeursCouleurs = Record<Champ, string>;

const DEFAUTS: Record<Champ, string> = {
  couleurPrincipale: "#ad0707",
  couleurLaterale: "#a3122a",
  couleurLaterale2: "#007140",
  couleurHaut: "#0f1d2c",
  couleurConnexion: "#f1f4f7",
  couleurFondConnexion: "#ffffff",
  couleurTexteConnexion: "#16202b",
};
const LATERALE_DEFAUT = "linear-gradient(180deg,#a3122a 0%,#5c1220 32%,#2a1f26 50%,#123f2d 70%,#007140 100%)";
const VIDES: ValeursCouleurs = { couleurPrincipale: "", couleurLaterale: "", couleurLaterale2: "", couleurHaut: "", couleurConnexion: "", couleurFondConnexion: "", couleurTexteConnexion: "" };

type Theme = { nom: string; principale: string; laterale: string; laterale2: string; haut: string };
const THEMES: Theme[] = [
  { nom: "Par défaut", principale: "", laterale: "", laterale2: "", haut: "" },
  { nom: "Bleu nuit", principale: "#1d4ed8", laterale: "#1e3a8a", laterale2: "#0f172a", haut: "#0f172a" },
  { nom: "Vert forêt", principale: "#047857", laterale: "#065f46", laterale2: "#022c22", haut: "#052e16" },
  { nom: "Bordeaux", principale: "#9f1239", laterale: "#881337", laterale2: "#4c0519", haut: "#1c0a10" },
  { nom: "Orange brûlé", principale: "#c2410c", laterale: "#9a3412", laterale2: "#431407", haut: "#1c1917" },
  { nom: "Violet", principale: "#6d28d9", laterale: "#5b21b6", laterale2: "#2e1065", haut: "#1e1b4b" },
  { nom: "Ardoise", principale: "#0f766e", laterale: "#334155", laterale2: "#0f172a", haut: "#0f172a" },
];

const HEX = /^#?([0-9a-f]{6})$/i;
const idCouleur = (nom: Champ) => `couleur-${nom}`;
const ouvrir = (nom: Champ) => document.getElementById(idCouleur(nom))?.click();

function themeDuLogo(base: string): Theme {
  const principale = contraste(base, BLANC) >= CONTRASTE_MIN ? base : nuanceLisible(base);
  const laterale = nuanceLisible(nuance(principale, -0.2));
  return { nom: "Votre logo", principale, laterale, laterale2: nuance(principale, -0.65), haut: nuance(principale, -0.78) };
}

function couleurDominante(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const cote = 64;
        const toile = document.createElement("canvas");
        toile.width = cote;
        toile.height = cote;
        const ctx = toile.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, cote, cote);
        const { data } = ctx.getImageData(0, 0, cote, cote);
        const comptes = new Map<string, { n: number; r: number; g: number; b: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
          if (a < 200) continue;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          if (max - min < 40 || max < 40 || min > 225) continue;
          const cle = `${r >> 4}-${g >> 4}-${b >> 4}`;
          const c = comptes.get(cle) ?? { n: 0, r: 0, g: 0, b: 0 };
          comptes.set(cle, { n: c.n + 1, r: c.r + r, g: c.g + g, b: c.b + b });
        }
        const meilleur = [...comptes.values()].sort((x, y) => y.n - x.n)[0];
        if (!meilleur) return resolve(null);
        const hex = [meilleur.r, meilleur.g, meilleur.b].map((x) => Math.round(x / meilleur.n).toString(16).padStart(2, "0")).join("");
        resolve(`#${hex}`);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

type Alerte = { texte: string; correction?: string } | null;

function Couleur({ libelle, nom, valeur, onChange, alerte }: { libelle: string; nom: Champ; valeur: string; onChange: (v: string) => void; alerte?: Alerte }) {
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const affichee = valeur || DEFAUTS[nom];

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12.3px] font-semibold text-muted">{libelle}</span>
      <div className="flex items-center gap-2.5">
        <label className="relative size-10 shrink-0 rounded-[var(--radius-s)] border border-line cursor-pointer overflow-hidden" style={{ backgroundColor: affichee }}>
          <span className="sr-only">Choisir : {libelle}</span>
          <input id={idCouleur(nom)} type="color" value={affichee} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
        <input
          type="text"
          value={brouillon ?? valeur.toUpperCase()}
          onChange={(e) => {
            const t = e.target.value.trim();
            setBrouillon(t.toUpperCase());
            const m = HEX.exec(t);
            if (m) onChange(`#${m[1].toLowerCase()}`);
          }}
          onBlur={() => setBrouillon(null)}
          placeholder={`Par défaut · ${DEFAUTS[nom].toUpperCase()}`}
          aria-label={`Code couleur : ${libelle}`}
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          className="w-[200px] min-w-0 rounded-[var(--radius-s)] border border-line-champ bg-surface px-3 py-2 text-[13.5px] tabular-nums uppercase text-ink placeholder:normal-case placeholder:text-faint outline-none focus:border-accent"
        />
        {valeur ? (
          <button type="button" onClick={() => onChange("")} title="Remettre la couleur par défaut" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted hover:text-ink cursor-pointer bg-transparent border-0">
            <RotateCcw size={13} aria-hidden /> Par défaut
          </button>
        ) : null}
        <input type="hidden" name={nom} value={valeur} />
      </div>
      {alerte ? (
        <span className="flex items-center gap-1.5 flex-wrap text-[12px] text-warn">
          <TriangleAlert size={13} aria-hidden /> {alerte.texte}
          {alerte.correction ? (
            <button type="button" onClick={() => onChange(alerte.correction!)} className="inline-flex items-center gap-1.5 font-semibold text-ink underline bg-transparent border-0 p-0 cursor-pointer">
              <span className="size-3 rounded-sm border border-line" style={{ backgroundColor: alerte.correction }} aria-hidden /> Utiliser {alerte.correction.toUpperCase()}
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

function Zone({ nom, libelle, className = "", style, children }: { nom: Champ; libelle: string; className?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => ouvrir(nom)}
      title={`Changer : ${libelle}`}
      aria-label={`Changer la couleur : ${libelle}`}
      className={`border-0 p-0 m-0 text-left cursor-pointer outline-offset-[-2px] hover:outline-2 hover:outline-dashed hover:outline-white/80 focus-visible:outline-2 focus-visible:outline-accent ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}

export function ReglageCouleurs({ initiales, logo }: { initiales: ValeursCouleurs; logo?: string | null }) {
  const [v, setV] = useState<ValeursCouleurs>(initiales);
  const [degrade, setDegrade] = useState(Boolean(initiales.couleurLaterale2));
  const [duLogo, setDuLogo] = useState<Theme | null>(null);
  const maj = (c: Champ) => (x: string) => setV((o) => ({ ...o, [c]: x }));
  const clair = (x: string): Alerte => (x && contraste(x, BLANC) < CONTRASTE_MIN ? { texte: "Le texte blanc sera peu lisible.", correction: nuanceLisible(x) } : null);

  useEffect(() => {
    if (!logo) return;
    let actif = true;
    couleurDominante(logo).then((c) => {
      if (actif && c) setDuLogo(themeDuLogo(c));
    });
    return () => {
      actif = false;
    };
  }, [logo]);

  const appliquer = (t: Theme) => {
    setV((o) => ({ ...o, couleurPrincipale: t.principale, couleurLaterale: t.laterale, couleurLaterale2: t.laterale2, couleurHaut: t.haut }));
    setDegrade(Boolean(t.laterale2));
  };
  const themeActif = (t: Theme) => v.couleurPrincipale === t.principale && v.couleurLaterale === t.laterale && v.couleurLaterale2 === t.laterale2 && v.couleurHaut === t.haut;
  const modifie = (Object.keys(v) as Champ[]).some((k) => v[k] !== initiales[k]);
  const themes = duLogo ? [duLogo, ...THEMES] : THEMES;

  const p = v.couleurPrincipale || DEFAUTS.couleurPrincipale;
  const laterale = v.couleurLaterale ? (degrade && v.couleurLaterale2 ? `linear-gradient(180deg,${v.couleurLaterale} 0%,${v.couleurLaterale2} 100%)` : v.couleurLaterale) : LATERALE_DEFAUT;
  const haut = v.couleurHaut || DEFAUTS.couleurHaut;
  const connexion = v.couleurConnexion || DEFAUTS.couleurConnexion;
  const texteConnexion = texteLisible(connexion);
  const fond = v.couleurFondConnexion || DEFAUTS.couleurFondConnexion;
  const texte = v.couleurTexteConnexion || texteLisible(fond);
  const lisibilite: Alerte = contraste(fond, texte) < CONTRASTE_MIN ? { texte: "Le texte sera peu lisible sur ce fond.", correction: v.couleurTexteConnexion ? nuanceLisible(v.couleurTexteConnexion, fond) : undefined } : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] font-semibold text-ink">Thèmes</span>
        <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
          {themes.map((t) => {
            const actif = themeActif(t);
            const tp = t.principale || DEFAUTS.couleurPrincipale;
            const tl = t.laterale ? `linear-gradient(180deg,${t.laterale} 0%,${t.laterale2 || t.laterale} 100%)` : LATERALE_DEFAUT;
            return (
              <button
                key={t.nom}
                type="button"
                onClick={() => appliquer(t)}
                aria-pressed={actif}
                className={`group flex flex-col gap-1.5 rounded-[var(--radius-s)] border bg-surface p-1.5 text-left cursor-pointer transition-colors ${actif ? "border-accent ring-2 ring-accent/25" : "border-line hover:border-faint"}`}
              >
                <span className="flex h-11 overflow-hidden rounded-[6px]" aria-hidden>
                  <span className="w-[38%]" style={{ background: tl }} />
                  <span className="flex-1 flex flex-col">
                    <span className="h-3" style={{ background: t.haut || DEFAUTS.couleurHaut }} />
                    <span className="flex-1 bg-white flex items-center px-1.5">
                      <span className="h-2.5 w-7 rounded-sm" style={{ background: tp }} />
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-1 text-[12px] font-semibold text-ink truncate">
                  {actif ? <Check size={12} className="shrink-0 text-accent" aria-hidden /> : null}
                  {t.nom}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-start">
        <div className="flex flex-col gap-5">
          <span className="text-[13px] font-semibold text-ink">Espaces de l’équipe et des membres</span>
          <Couleur libelle="Couleur principale (boutons, liens, mots en relief)" nom="couleurPrincipale" valeur={v.couleurPrincipale} onChange={maj("couleurPrincipale")} alerte={clair(v.couleurPrincipale)} />
          <Couleur libelle="Barre latérale" nom="couleurLaterale" valeur={v.couleurLaterale} onChange={maj("couleurLaterale")} alerte={clair(v.couleurLaterale)} />
          {v.couleurLaterale ? (
            <label className="flex items-center gap-2.5 text-[13.5px] text-ink cursor-pointer w-fit -mt-2">
              <input type="checkbox" checked={degrade} onChange={(e) => { setDegrade(e.target.checked); if (!e.target.checked) maj("couleurLaterale2")(""); }} className="size-4 accent-[var(--accent)]" />
              Dégradé vers une deuxième couleur
            </label>
          ) : null}
          {v.couleurLaterale && degrade ? (
            <Couleur libelle="Barre latérale, en bas" nom="couleurLaterale2" valeur={v.couleurLaterale2} onChange={maj("couleurLaterale2")} alerte={clair(v.couleurLaterale2)} />
          ) : <input type="hidden" name="couleurLaterale2" value="" />}
          <Couleur libelle="Barre du haut" nom="couleurHaut" valeur={v.couleurHaut} onChange={maj("couleurHaut")} alerte={clair(v.couleurHaut)} />
          <div className="pt-4 border-t border-line flex flex-col gap-5">
            <span className="text-[13px] font-semibold text-ink">Page de connexion et d’adhésion</span>
            <Couleur libelle="Fond du formulaire" nom="couleurFondConnexion" valeur={v.couleurFondConnexion} onChange={maj("couleurFondConnexion")} />
            <Couleur libelle="Texte" nom="couleurTexteConnexion" valeur={v.couleurTexteConnexion} onChange={maj("couleurTexteConnexion")} alerte={lisibilite} />
            <Couleur libelle="Panneau de gauche (sans couverture)" nom="couleurConnexion" valeur={v.couleurConnexion} onChange={maj("couleurConnexion")} />
          </div>
          <button type="button" onClick={() => { setV(VIDES); setDegrade(false); }} className="self-start inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted hover:text-ink cursor-pointer bg-transparent border-0 p-0">
            <RotateCcw size={13} aria-hidden /> Tout remettre par défaut
          </button>
        </div>

        <div className="flex flex-col gap-3 lg:sticky lg:top-24">
          <span className="flex items-center justify-between gap-3 text-[12.3px] font-semibold text-muted">
            <span>Aperçu · cliquez sur une zone pour la changer</span>
            {modifie ? <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11.5px] font-semibold text-warn">Non enregistré</span> : null}
          </span>
          <div className="rounded-[var(--radius-m)] border border-line overflow-hidden flex h-[220px] bg-white">
            <Zone nom="couleurLaterale" libelle="barre latérale" className="w-[34%] p-3 flex flex-col gap-2" style={{ background: laterale }}>
              <span className="h-2.5 w-16 rounded-full bg-white/70" />
              <span className="mt-3 h-7 rounded-md flex items-center px-2 text-[11px] font-semibold text-white" style={{ background: p }}>Membres</span>
              <span className="h-7 rounded-md flex items-center px-2 text-[11px] text-white/85">Événements</span>
              <span className="h-7 rounded-md flex items-center px-2 text-[11px] text-white/85">Newsletter</span>
            </Zone>
            <div className="flex-1 flex flex-col">
              <Zone nom="couleurHaut" libelle="barre du haut" className="h-9 flex items-center px-3" style={{ background: haut }}>
                <span className="h-2 w-20 rounded-full bg-white/50" />
              </Zone>
              <div className="p-4 flex flex-col gap-3 items-start">
                <span className="text-[17px] font-bold text-[#16202b]">Gestion des <i style={{ color: p }}>membres</i></span>
                <span className="text-[12px] text-[#5b6b7a]">Un <span style={{ color: p }} className="font-semibold">lien</span> dans le texte</span>
                <Zone nom="couleurPrincipale" libelle="couleur principale" className="rounded-[5px] px-3.5 py-2 text-[10.5px] font-bold tracking-[0.09em] uppercase text-white hover:outline-[#16202b]/50" style={{ backgroundImage: `linear-gradient(120deg,${nuance(p, 0.15)} 0%,${p} 58%,${nuance(p, -0.22)} 100%)` }}>
                  Enregistrer
                </Zone>
              </div>
            </div>
          </div>
          <div className="rounded-[var(--radius-m)] border border-line overflow-hidden flex h-[150px]">
            <Zone nom="couleurConnexion" libelle="panneau de gauche" className="w-[38%] flex items-center justify-center text-[11px] font-semibold text-center px-2 hover:outline-[#16202b]/40" style={{ background: connexion, color: texteConnexion }}>
              Panneau de gauche
            </Zone>
            <Zone nom="couleurFondConnexion" libelle="fond du formulaire" className="flex-1 p-4 flex flex-col gap-2 hover:outline-[#16202b]/40" style={{ background: fond, color: texte }}>
              <span className="text-[15px] font-bold">Rejoindre la Chambre</span>
              <span className="text-[11px] opacity-80">Une phrase sous le titre</span>
              <span className="h-7 w-full rounded-md border border-[#dfe5ec] bg-white text-[10.5px] text-[#16202b] flex items-center px-2">vous@entreprise.mg</span>
              <span className="self-start rounded-[5px] px-3 py-1.5 text-[10px] font-bold tracking-[0.09em] uppercase text-white" style={{ background: p }}>Se connecter</span>
            </Zone>
          </div>
        </div>
      </div>
    </div>
  );
}
