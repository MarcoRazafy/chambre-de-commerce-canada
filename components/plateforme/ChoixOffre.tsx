"use client";

// Choix de l'offre à la création d'une Chambre ; offre à la carte : ses fonctions à cocher, le prix en direct
import { useState } from "react";
import { ChoixCarte } from "@/components/public/ChoixCarte";
import { ComposeurOffre } from "@/components/plateforme/ComposeurOffre";
import type { OffrePublique } from "@/lib/plateforme-site";

export function ChoixOffre({ offres, choisie, fonctions }: { offres: OffrePublique[]; choisie?: string; fonctions: string[] }) {
  const [offre, setOffre] = useState(choisie);
  const surMesure = offres.find((o) => o.id === offre && o.surMesure && o.options.length);

  return (
    <fieldset className="m-0 p-0 border-0 min-w-0">
      <legend className="block text-[13px] font-semibold text-ink mb-2">Offre</legend>
      <div
        className="grid gap-3 sm:grid-cols-2"
        onChange={(e) => {
          const t = e.target as HTMLInputElement;
          if (t.name === "offre") setOffre(t.value);
        }}
      >
        {offres.map((o) => (
          <div key={o.id} className={o.surMesure ? "sm:col-span-2 grid" : "grid"}>
            <ChoixCarte name="offre" value={o.id} requis defaultChecked={o.id === choisie} titre={o.nom} detail={o.detail} prix={o.prix} periode={o.periode} />
          </div>
        ))}
      </div>
      {surMesure ? (
        <div className="mt-4">
          <ComposeurOffre
            mode="champ"
            offre={{ id: surMesure.id, nom: surMesure.nom, base: surMesure.base, parUtilisateur: surMesure.parUtilisateur, offerts: surMesure.offerts, options: surMesure.options }}
            initiales={fonctions}
          />
        </div>
      ) : null}
    </fieldset>
  );
}
