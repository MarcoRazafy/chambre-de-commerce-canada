"use client";

import { useState } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { nuance, tropClaire } from "@/lib/couleurs";

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

function Couleur({ libelle, nom, valeur, onChange, alerte }: { libelle: string; nom: Champ; valeur: string; onChange: (v: string) => void; alerte?: string | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12.3px] font-semibold text-muted">{libelle}</span>
      <div className="flex items-center gap-2.5">
        <label className="relative size-10 shrink-0 rounded-[var(--radius-s)] border border-line cursor-pointer overflow-hidden" style={{ backgroundColor: valeur || DEFAUTS[nom] }}>
          <span className="sr-only">{libelle}</span>
          <input type="color" value={valeur || DEFAUTS[nom]} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
        <span className="text-[13.5px] tabular-nums text-ink">{valeur ? valeur.toUpperCase() : "Par défaut"}</span>
        {valeur ? (
          <button type="button" onClick={() => onChange("")} className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted hover:text-ink cursor-pointer bg-transparent border-0">
            <RotateCcw size={13} aria-hidden /> Par défaut
          </button>
        ) : null}
        <input type="hidden" name={nom} value={valeur} />
      </div>
      {alerte ? <span className="flex items-center gap-1.5 text-[12px] text-warn"><TriangleAlert size={13} aria-hidden /> {alerte}</span> : null}
    </div>
  );
}

export function ReglageCouleurs({ initiales }: { initiales: ValeursCouleurs }) {
  const [v, setV] = useState<ValeursCouleurs>(initiales);
  const [degrade, setDegrade] = useState(Boolean(initiales.couleurLaterale2));
  const maj = (c: Champ) => (x: string) => setV((o) => ({ ...o, [c]: x }));
  const clair = (x: string) => (x && tropClaire(x) ? "Couleur claire : le texte blanc sera peu lisible." : null);

  const p = v.couleurPrincipale || DEFAUTS.couleurPrincipale;
  const laterale = v.couleurLaterale ? (degrade && v.couleurLaterale2 ? `linear-gradient(180deg,${v.couleurLaterale} 0%,${v.couleurLaterale2} 100%)` : v.couleurLaterale) : LATERALE_DEFAUT;
  const haut = v.couleurHaut || DEFAUTS.couleurHaut;
  const connexion = v.couleurConnexion || DEFAUTS.couleurConnexion;
  const texteConnexion = tropClaire(connexion) ? "#16202b" : "#ffffff";
  const fond = v.couleurFondConnexion || DEFAUTS.couleurFondConnexion;
  const texte = v.couleurTexteConnexion || (tropClaire(fond) ? DEFAUTS.couleurTexteConnexion : "#ffffff");
  const lisibilite = tropClaire(fond) === tropClaire(texte) ? "Le texte et le fond se ressemblent : le texte sera peu lisible." : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-start">
      <div className="flex flex-col gap-5">
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
      </div>

      <div className="flex flex-col gap-3" aria-hidden>
        <span className="text-[12.3px] font-semibold text-muted">Aperçu</span>
        <div className="rounded-[var(--radius-m)] border border-line overflow-hidden flex h-[220px] bg-white">
          <div className="w-[34%] p-3 flex flex-col gap-2" style={{ background: laterale }}>
            <span className="h-2.5 w-16 rounded-full bg-white/70" />
            <span className="mt-3 h-7 rounded-md flex items-center px-2 text-[11px] font-semibold text-white" style={{ background: p }}>Membres</span>
            <span className="h-7 rounded-md flex items-center px-2 text-[11px] text-white/85">Événements</span>
            <span className="h-7 rounded-md flex items-center px-2 text-[11px] text-white/85">Newsletter</span>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="h-9 flex items-center px-3" style={{ background: haut }}>
              <span className="h-2 w-20 rounded-full bg-white/50" />
            </div>
            <div className="p-4 flex flex-col gap-3">
              <span className="text-[17px] font-bold text-[#16202b]">Gestion des <i style={{ color: p }}>membres</i></span>
              <span className="text-[12px] text-[#5b6b7a]">Un <a style={{ color: p }} className="font-semibold">lien</a> dans le texte</span>
              <span className="self-start rounded-[5px] px-3.5 py-2 text-[10.5px] font-bold tracking-[0.09em] uppercase text-white" style={{ backgroundImage: `linear-gradient(120deg,${nuance(p, 0.15)} 0%,${p} 58%,${nuance(p, -0.22)} 100%)` }}>Enregistrer</span>
            </div>
          </div>
        </div>
        <div className="rounded-[var(--radius-m)] border border-line overflow-hidden flex h-[150px]">
          <div className="w-[38%] flex items-center justify-center text-[11px] font-semibold text-center px-2" style={{ background: connexion, color: texteConnexion }}>Panneau de gauche</div>
          <div className="flex-1 p-4 flex flex-col gap-2" style={{ background: fond, color: texte }}>
            <span className="text-[15px] font-bold">Rejoindre la Chambre</span>
            <span className="text-[11px] opacity-80">Une phrase sous le titre</span>
            <span className="h-7 rounded-md border border-[#dfe5ec] bg-white text-[10.5px] text-[#16202b] flex items-center px-2">vous@entreprise.mg</span>
            <span className="self-start rounded-[5px] px-3 py-1.5 text-[10px] font-bold tracking-[0.09em] uppercase text-white" style={{ background: p }}>Se connecter</span>
          </div>
        </div>
      </div>
    </div>
  );
}
