"use client";

import { useState, useTransition } from "react";
import { majEtiquettes, type ChampEtiquettes } from "@/lib/actions/maillage";

// Liste d'étiquettes modifiable sur place : on tape puis Entrée ; × retire ; enregistré aussitôt
export function EtiquettesMembre({
  memberId,
  champ,
  valeurs,
  ton = "accent",
  vide = "Aucune étiquette.",
  lectureSeule = false,
}: {
  memberId: string;
  champ: ChampEtiquettes;
  valeurs: string[];
  ton?: "accent" | "bleu" | "vert";
  vide?: string;
  lectureSeule?: boolean;
}) {
  const [liste, setListe] = useState(valeurs);
  const [t, setT] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();
  const couleur = {
    accent: "bg-accent-soft text-accent-strong",
    bleu: "bg-navy-soft text-navy",
    vert: "bg-success-soft text-success-strong",
  }[ton];

  const enregistrer = (v: string[]) => {
    setListe(v);
    demarrer(async () => {
      const r = await majEtiquettes(memberId, champ, v);
      if (r.ok) { setListe(r.valeurs); setErreur(""); } else setErreur(r.erreur);
    });
  };
  const ajouter = () => {
    const m = t.trim().replace(/,$/, "");
    setT("");
    if (m && !liste.includes(m)) enregistrer([...liste, m]);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {liste.length === 0 && lectureSeule ? <span className="text-[13px] text-muted">{vide}</span> : null}
        {liste.map((m) => (
          <span key={m} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${couleur}`}>
            {m}
            {lectureSeule ? null : (
              <button type="button" aria-label={`Retirer ${m}`} className="border-0 bg-transparent cursor-pointer text-inherit opacity-60 hover:opacity-100 leading-none" onClick={() => enregistrer(liste.filter((x) => x !== m))}>×</button>
            )}
          </span>
        ))}
        {lectureSeule ? null : (
          <input
            value={t}
            onChange={(e) => setT(e.target.value)}
            onBlur={ajouter}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); ajouter(); } }}
            placeholder={liste.length ? "Ajouter…" : "Ajouter une étiquette puis Entrée"}
            aria-label="Ajouter une étiquette"
            className="flex-1 min-w-[150px] border border-dashed border-line rounded-full bg-transparent px-3 py-1 text-[12.5px] text-ink outline-none focus:border-accent"
          />
        )}
      </div>
      {enCours ? <p className="m-0 mt-1.5 text-[11.5px] text-faint">Enregistrement…</p> : null}
      {erreur ? <p className="m-0 mt-1.5 text-[12px] text-bad">{erreur}</p> : null}
    </div>
  );
}
