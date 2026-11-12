import { fmtCotisation, libelleFormule, type Formule } from "@/lib/membership";

// Les formules d'adhésion de la Chambre, en options d'une liste
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
