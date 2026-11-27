"use client";

import { useState } from "react";
import Link from "next/link";
import { BoutonMarque } from "@/components/paiement/BoutonMarque";
import { preparerRemiseEspeces } from "@/lib/actions/reglements";

export function FormulaireRemise({
  reglementId,
  montant,
  sigle,
  adresseBureau,
  horaires,
  aujourdhui,
  limite,
  initial,
}: {
  reglementId: string;
  montant: string;
  sigle: string;
  adresseBureau: string;
  horaires: string;
  aujourdhui: string;
  limite: string;
  initial: {
    lieu?: string;
    adresse?: string;
    jour?: string;
    moment?: string;
  };
}) {
  const [lieu, setLieu] = useState(
    initial.lieu === "domicile" ? "domicile" : "bureau",
  );

  const CARTE =
    "flex min-h-[88px] cursor-pointer flex-col justify-center rounded-[12px] border px-4 py-3 transition-colors duration-200 has-[:checked]:border-[#d98c2b] has-[:checked]:bg-[#fff5e8] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#2b2946] border-line bg-white hover:border-faint";

  return (
    <form action={preparerRemiseEspeces}>
      <input type="hidden" name="reglementId" value={reglementId} />
      <h2 className="m-0 text-[24px] font-bold leading-tight text-ink sm:text-[26px]">
        Remettez votre règlement en main propre
      </h2>

      <p className="m-0 mb-1.5 mt-5 text-[14px] font-semibold text-ink">
        Montant
      </p>
      <div className="flex min-h-[58px] items-center justify-between rounded-[12px] border border-line bg-white px-4">
        <output className="text-[24px] font-bold text-ink tabular-nums">
          {montant}
        </output>
        <span className="text-[16px] font-semibold text-muted">{sigle}</span>
      </div>

      <fieldset className="m-0 mt-5 min-w-0 border-0 p-0">
        <legend className="mb-1.5 text-[14px] font-semibold text-ink">
          Où ?
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={CARTE}>
            <input
              type="radio"
              name="lieu"
              value="bureau"
              checked={lieu === "bureau"}
              onChange={() => setLieu("bureau")}
              className="sr-only"
            />
            <span className="text-[15px] font-bold text-ink">
              Au bureau de la Chambre
            </span>
            <span className="mt-0.5 whitespace-pre-line text-[13px] leading-snug text-muted">
              {adresseBureau}
            </span>
          </label>
          <label className={CARTE}>
            <input
              type="radio"
              name="lieu"
              value="domicile"
              checked={lieu === "domicile"}
              onChange={() => setLieu("domicile")}
              className="sr-only"
            />
            <span className="text-[15px] font-bold text-ink">
              L’équipe passe chez vous
            </span>
            <span className="mt-0.5 text-[13px] leading-snug text-muted">
              À Antananarivo et alentours
            </span>
          </label>
        </div>
      </fieldset>

      {lieu === "domicile" ? (
        <div className="mt-4">
          <label
            htmlFor="adresse-passage"
            className="mb-1.5 block text-[14px] font-semibold text-ink"
          >
            Adresse de passage
          </label>
          <input
            id="adresse-passage"
            name="adresse"
            required
            maxLength={200}
            autoComplete="street-address"
            defaultValue={initial.adresse ?? ""}
            placeholder="Rue, quartier, repère"
            className="min-h-12 w-full rounded-[12px] border border-line bg-white px-4 text-[16px] text-ink placeholder:text-faint focus:border-[#d98c2b] focus:outline-none"
          />
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="jour-remise"
            className="mb-1.5 block text-[14px] font-semibold text-ink"
          >
            Quel jour ?
          </label>
          <input
            id="jour-remise"
            type="date"
            name="jour"
            required
            min={aujourdhui}
            max={limite}
            defaultValue={initial.jour ?? aujourdhui}
            className="min-h-12 w-full rounded-[12px] border border-line bg-white px-4 text-[16px] text-ink focus:border-[#d98c2b] focus:outline-none"
          />
        </div>
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="mb-1.5 text-[14px] font-semibold text-ink">
            Quand ?
          </legend>
          <div className="grid min-h-12 grid-cols-2 overflow-hidden rounded-[12px] border border-line bg-white">
            {(
              [
                ["matin", "Matin"],
                ["apres-midi", "Après-midi"],
              ] as const
            ).map(([valeur, libelle], i) => (
              <label
                key={valeur}
                className={`flex cursor-pointer items-center justify-center text-[15px] font-semibold text-ink transition-colors duration-200 has-[:checked]:bg-[#e8a547] has-[:checked]:text-[#2b2946] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-4 has-[:focus-visible]:outline-[#2b2946] ${i ? "border-l border-line" : ""}`}
              >
                <input
                  type="radio"
                  name="moment"
                  value={valeur}
                  defaultChecked={(initial.moment ?? "matin") === valeur}
                  className="sr-only"
                />
                {libelle}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      {horaires ? (
        <p className="m-0 mt-2 text-[13px] text-muted">Horaires : {horaires}</p>
      ) : null}

      <BoutonMarque
        enCours="Préparation du bon…"
        className="mt-6 min-h-[52px] w-full rounded-[12px]"
      >
        Obtenir mon bon de remise
      </BoutonMarque>
      <div className="mt-4 text-center">
        <Link
          href="/membre/cotisations"
          className="text-[14px] text-muted underline underline-offset-4 hover:text-ink"
        >
          Revenir plus tard
        </Link>
      </div>
    </form>
  );
}
