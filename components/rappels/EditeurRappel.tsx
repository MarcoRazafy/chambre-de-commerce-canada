import { Check, Send } from "lucide-react";
import { Panneau } from "@/components/admin/ui";
import { EditeurBlocs } from "@/components/newsletter/EditeurBlocs";
import { enregistrerRappelMembre } from "@/lib/actions/rappels-membres";
import { lireDoc } from "@/lib/lettre-blocs";
import { getParametres } from "@/lib/parametres";
import { getProfilChambre } from "@/lib/profil-chambre";
import { lettreParDefaut } from "@/lib/rappels-membres";
import { DECLENCHEURS, JOURS_MAX, VARIABLES_RAPPEL, type Declencheur } from "@/lib/rappels-membres-base";

const CHAMP = "w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.6px] outline-none focus:border-accent";

export async function EditeurRappel({
  rappel,
}: {
  rappel: { id?: string; declencheur: Declencheur; jours: number; sujet: string; contenu: string; actif: boolean };
}) {
  const [{ reseaux, mentions }, profil] = await Promise.all([getParametres(), getProfilChambre()]);
  const defaut = lettreParDefaut(rappel.declencheur, reseaux, mentions);
  const initial = lireDoc(rappel.contenu, reseaux) ?? defaut.doc;

  return (
    <form action={enregistrerRappelMembre} className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px]">
      {rappel.id ? <input type="hidden" name="id" value={rappel.id} /> : null}
      <Panneau titre="La lettre" teinte="degrade">
        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="block text-[12.5px] font-semibold text-muted mb-1">Objet du courriel</span>
            <input name="sujet" required maxLength={200} defaultValue={rappel.sujet || defaut.sujet} className={CHAMP} />
          </label>
          <EditeurBlocs initial={initial} reseaux={reseaux} pied={mentions} logo={profil.logo} variables={VARIABLES_RAPPEL} />
        </div>
      </Panneau>

      <div className="flex flex-col gap-4 lg:sticky lg:top-[88px]">
        <Panneau titre="Envoi" teinte="rouge">
          <div className="flex flex-col gap-4">
            <fieldset className="m-0 p-0 border-0 min-w-0">
              <legend className="text-[12.5px] font-semibold text-ink mb-2">Quand part-il ?</legend>
              <div className="flex flex-col gap-2.5">
                {(Object.keys(DECLENCHEURS) as Declencheur[]).map((d) => (
                  <label
                    key={d}
                    className="flex gap-3 items-start rounded-[var(--radius-s)] border border-line bg-surface px-3.5 py-3 cursor-pointer hover:border-faint has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
                  >
                    <input type="radio" name="declencheur" value={d} defaultChecked={rappel.declencheur === d} className="mt-0.5 accent-[var(--accent)]" />
                    <span>
                      <span className="block text-[13.5px] font-semibold text-ink">{DECLENCHEURS[d].titre}</span>
                      <span className="block text-[12.5px] text-muted">Le nombre de {DECLENCHEURS[d].delai}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="block text-[12.5px] font-semibold text-ink mb-1">Nombre de jours</span>
              <input type="number" name="jours" required min={1} max={JOURS_MAX} defaultValue={rappel.jours} className={`${CHAMP} max-w-[140px]`} />
            </label>

            <label className="flex items-center gap-2.5 text-[13.5px] text-ink cursor-pointer w-fit">
              <input type="checkbox" name="actif" value="1" defaultChecked={rappel.actif} className="size-4 accent-[var(--accent)]" />
              Rappel actif
            </label>

            <div className="pt-4 border-t border-line flex flex-col gap-2">
              <button type="submit" name="intention" value="enregistrer" className="btn-action btn-action-sm"><Check size={14} /> Enregistrer le rappel</button>
              <button type="submit" name="intention" value="essai" className="btn-contour btn-contour-sm text-ink"><Send size={14} /> M’envoyer un essai</button>
            </div>
          </div>
        </Panneau>
      </div>
    </form>
  );
}
