import type { ReactNode } from "react";
import { fmtCotisation, type Formule } from "@/lib/membership";

export function ChoixCarte({
  name,
  value,
  defaultChecked,
  requis = false,
  titre,
  detail,
  prix,
  periode = "an",
  icone,
}: {
  name: string;
  value: string;
  defaultChecked: boolean;
  requis?: boolean;
  titre: string;
  detail?: string;
  prix?: string;
  /** Après le prix : « / an » (cotisations), « / mois » (offres de la plateforme) ; vide : rien */
  periode?: string;
  icone?: ReactNode;
}) {
  return (
    <label className="group relative flex flex-col gap-3 rounded-2xl border-2 border-line bg-white p-5 cursor-pointer transition-[background-color,border-color] hover:border-faint has-checked:border-marque-vert has-checked:bg-marque-vert/[0.05] has-focus-visible:ring-4 has-focus-visible:ring-marque-vert/20">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        required={requis}
        className="sr-only"
      />
      <span
        aria-hidden
        className="absolute top-4 right-4 w-5 h-5 rounded-full border-2 border-line bg-white transition-colors group-has-checked:border-marque-vert group-has-checked:bg-[radial-gradient(circle,var(--marque-vert)_45%,white_50%)]"
      />
      {icone ? <span className="text-ink">{icone}</span> : null}
      <span className="min-w-0 pr-7">
        <span className="block text-[16px] font-semibold text-ink leading-snug">
          {titre}
        </span>
        {detail ? (
          <span className="block text-[13px] text-muted mt-0.5">{detail}</span>
        ) : null}
      </span>
      {prix ? (
        <span className="text-[20px] font-bold text-marque-vert whitespace-nowrap mt-auto">
          {prix}
          {periode ? <>{" "}<span className="text-[13px] font-semibold text-muted">/ {periode}</span></> : null}
        </span>
      ) : null}
    </label>
  );
}

// Les formules d'adhésion de la Chambre, en cartes à choisir
export function ChoixFormules({ formules, actuelle }: { formules: Formule[]; actuelle?: string | null }) {
  return (
    <div className="@container">
      <div className="grid gap-3 @md:grid-cols-2">
        {formules.map((f) => (
          <ChoixCarte
            key={f.id}
            name="formule"
            value={f.id}
            requis
            defaultChecked={actuelle === f.id}
            titre={f.pays}
            detail={f.profil}
            prix={fmtCotisation(f)}
          />
        ))}
      </div>
    </div>
  );
}
