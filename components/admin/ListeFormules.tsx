// Paramètres > Formules d'adhésion : une ligne modifiable par formule, l'ajout, les formules archivées
import { ArrowDown, ArrowUp, Plus, RotateCcw, Save, X } from "lucide-react";
import { INPUT } from "@/components/champ-style";
import {
  ajouterFormuleAdhesion,
  descendreFormuleAdhesion,
  monterFormuleAdhesion,
  enregistrerFormuleAdhesion,
  remettreFormuleAdhesion,
  retirerFormuleAdhesion,
} from "@/lib/actions/formules";
import { fmtCotisation, libelleFormule, type Formule } from "@/lib/membership";

type Ligne = Formule & { active: boolean; membres: number };

const GRILLE = "grid gap-2.5 items-end grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_120px_96px_auto]";
const ICONE = "inline-flex items-center justify-center size-9 rounded-[var(--radius-s)] border border-line bg-surface text-muted cursor-pointer hover:text-ink hover:bg-surface-2 disabled:opacity-40 disabled:cursor-default";
const libelle = "block text-[12px] font-semibold text-muted mb-1";

function Champs({ f }: { f?: Formule }) {
  return (
    <>
      <label className="min-w-0"><span className={libelle}>Titre</span>
        <input name="pays" required maxLength={60} defaultValue={f?.pays ?? ""} placeholder="Titre" className={INPUT} />
      </label>
      <label className="min-w-0"><span className={libelle}>Profil</span>
        <input name="profil" required maxLength={120} defaultValue={f?.profil ?? ""} placeholder="À qui elle s’adresse" className={INPUT} />
      </label>
      <label className="min-w-0"><span className={libelle}>Montant par an</span>
        <input name="montant" required inputMode="numeric" pattern="[0-9 ]+" defaultValue={f ? String(f.montant) : ""} placeholder="0" className={INPUT} />
      </label>
      <label className="min-w-0"><span className={libelle}>Devise</span>
        <select name="devise" defaultValue={f?.devise ?? "CAD"} className={INPUT}>
          <option value="CAD">$ CAD</option>
          <option value="MGA">Ar</option>
        </select>
      </label>
    </>
  );
}

export function ListeFormules({ formules, gere }: { formules: Ligne[]; gere: boolean }) {
  const actives = formules.filter((f) => f.active);
  const archivees = formules.filter((f) => !f.active);
  return (
    <div className="flex flex-col gap-4">
      {actives.map((f, i) => (
        <form key={f.id} action={enregistrerFormuleAdhesion} className="rounded-[var(--radius-m)] border border-line bg-surface p-3.5">
          <input type="hidden" name="formuleId" value={f.id} />
          <div className={GRILLE}>
            <Champs f={f} />
            {gere ? (
              <div className="flex items-center gap-1.5 sm:col-span-2 lg:col-span-1">
                <button type="submit" aria-label={`Enregistrer ${f.pays}`} title="Enregistrer" className={ICONE}><Save size={15} /></button>
                <button type="submit" formAction={monterFormuleAdhesion} disabled={i === 0} aria-label="Monter" title="Monter" className={ICONE} formNoValidate><ArrowUp size={15} /></button>
                <button type="submit" formAction={descendreFormuleAdhesion} disabled={i === actives.length - 1} aria-label="Descendre" title="Descendre" className={ICONE} formNoValidate><ArrowDown size={15} /></button>
                <button type="submit" formAction={retirerFormuleAdhesion} aria-label={`Retirer ${f.pays}`} title={f.membres ? "Archiver (ses membres la gardent)" : "Supprimer"} className={`${ICONE} hover:!text-bad`} formNoValidate><X size={15} /></button>
              </div>
            ) : null}
          </div>
          {f.membres ? <p className="m-0 mt-2 text-[12px] text-faint">{f.membres} membre{f.membres > 1 ? "s" : ""}</p> : null}
        </form>
      ))}

      {gere ? (
        <form action={ajouterFormuleAdhesion} className="rounded-[var(--radius-m)] border border-dashed border-line-champ bg-surface-2 p-3.5">
          <div className={GRILLE}>
            <Champs />
            <div className="sm:col-span-2 lg:col-span-1">
              <button type="submit" className="btn-contour btn-contour-sm text-ink hover:bg-surface"><Plus size={14} /> Ajouter</button>
            </div>
          </div>
        </form>
      ) : null}

      {archivees.length ? (
        <details className="group">
          <summary className="cursor-pointer text-[13px] font-semibold text-muted list-none [&::-webkit-details-marker]:hidden">
            Archivées ({archivees.length})
          </summary>
          <ul className="m-0 mt-3 p-0 list-none flex flex-col gap-2">
            {archivees.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 flex-wrap rounded-[var(--radius-s)] border border-line px-3.5 py-2.5 text-[13.5px]">
                <span><span className="text-ink">{libelleFormule(f)}</span> <span className="text-muted">· {fmtCotisation(f)} · {f.membres} membre{f.membres > 1 ? "s" : ""}</span></span>
                {gere ? (
                  <form action={remettreFormuleAdhesion}>
                    <input type="hidden" name="formuleId" value={f.id} />
                    <button type="submit" className="btn-contour btn-contour-sm text-ink hover:bg-surface-2"><RotateCcw size={14} /> Proposer de nouveau</button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
