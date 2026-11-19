import { fmtCotisation, libelleFormule, type Formule } from "@/lib/membership";

export function OptionsFormules({ formules, vide }: { formules: Formule[]; vide?: string }) {
  return (
    <>
      {vide ? <option value="">{vide}</option> : null}
      {formules.map((f) => (
        <option key={f.id} value={f.id}>
          {libelleFormule(f)} — {fmtCotisation(f)} / an
        </option>
      ))}
    </>
  );
}
