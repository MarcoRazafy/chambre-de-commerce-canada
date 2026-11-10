import { ArrowRight, Pause, Play, Trash2, Wand2 } from "lucide-react";
import { Panneau } from "@/components/admin/ui";
import { SubmitButton } from "@/components/form-bits";
import { ajouterRegleTag, basculerRegleTag, supprimerRegleTag } from "@/lib/actions/tags-auto";
import { SITUATIONS_REGLE } from "@/lib/tags";

const CHAMP = "rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2 text-[13.4px] outline-none focus:border-accent";
const libelle = (statut: string) => SITUATIONS_REGLE.find(([s]) => s === statut)?.[1] ?? statut;

// Tags automatiques : « quand une entreprise est [situation], elle porte le tag [X] » (et le perd sinon)
export function ReglesTags({ regles, tousTags }: { regles: { id: string; statut: string; tag: string; actif: boolean }[]; tousTags: string[] }) {
  return (
    <Panneau titre="Tags automatiques" sousTitre="Posés et retirés tout seuls selon la situation de l’entreprise" teinte="vert" className="mb-6">
      {regles.length ? (
        <ul className="list-none m-0 p-0 mb-4">
          {regles.map((r) => (
            <li key={r.id} className={`flex items-center gap-3 flex-wrap py-2.5 border-t border-line first:border-t-0 ${r.actif ? "" : "opacity-55"}`}>
              <Wand2 size={16} className="text-success shrink-0" aria-hidden />
              <span className="text-[13.6px] text-ink">
                Quand une entreprise est <b>{libelle(r.statut)}</b>
              </span>
              <ArrowRight size={14} className="text-muted" aria-hidden />
              <span className="inline-flex items-center rounded-full bg-accent-soft text-accent-strong px-2.5 py-0.5 text-[12.5px] font-semibold">{r.tag}</span>
              {r.actif ? null : <span className="text-[12px] text-muted">en pause</span>}
              <span className="flex-1" />
              <form action={basculerRegleTag}>
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" className="btn-contour btn-contour-sm text-ink">{r.actif ? <><Pause size={14} /> Mettre en pause</> : <><Play size={14} /> Réactiver</>}</button>
              </form>
              <form action={supprimerRegleTag}>
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" aria-label={`Supprimer la règle « ${r.tag} »`} title="Supprimer la règle"
                  className="w-9 h-9 grid place-items-center rounded-[var(--radius-s)] border border-line bg-surface text-muted cursor-pointer hover:text-bad hover:border-bad"><Trash2 size={15} /></button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
      <form action={ajouterRegleTag} className="flex items-center gap-2 flex-wrap rounded-[var(--radius-m)] border border-dashed border-line px-3 py-2.5">
        <span className="text-[13.4px] text-ink">Quand une entreprise est</span>
        <select name="statut" required defaultValue="a_jour" aria-label="Situation" className={CHAMP}>
          {SITUATIONS_REGLE.map(([s, l]) => <option key={s} value={s}>{l}</option>)}
        </select>
        <span className="text-[13.4px] text-ink">, poser le tag</span>
        <input name="tag" required maxLength={60} list="tags-regles" placeholder="Ex. Relance cotisation" aria-label="Tag" className={`${CHAMP} min-w-[180px]`} />
        <datalist id="tags-regles">{tousTags.map((t) => <option key={t} value={t} />)}</datalist>
        <SubmitButton sm pendingLabel="Ajout…"><Wand2 size={14} /> Ajouter la règle</SubmitButton>
      </form>
    </Panneau>
  );
}
