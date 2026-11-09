import { CalendarClock, Save, Send, TestTube } from "lucide-react";
import { Panneau } from "@/components/admin/ui";
import { enregistrerLettre } from "@/lib/actions/newsletter";
import { DELAI_MAX_JOURS, programmationParDefaut } from "@/lib/lettres";
import type { Audience } from "@/lib/newsletter";
import { EditeurBlocs } from "@/components/newsletter/EditeurBlocs";
import { SelecteurTags } from "@/components/newsletter/SelecteurTags";
import { docDepuisTexte, docVide, lireDoc } from "@/lib/lettre-blocs";
import { COORDONNEES } from "@/lib/coordonnees";

const CHAMP = "w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.6px] outline-none focus:border-accent";

// Rédaction d'une lettre : objet, éditeur visuel en blocs, audience ; brouillon, test, envoi
export function EditeurLettre({
  lettre,
  audience,
  etiquettes,
  nbDestinataires,
  evenement = null,
}: {
  /** Sans « id » : une nouvelle lettre préremplie */
  lettre: { id?: string; sujet: string; contenu: string } | null;
  audience: Audience;
  etiquettes: string[];
  nbDestinataires: number | null;
  /** Lettre aux inscrits de cet événement : l'audience est fixée */
  evenement?: { id: string; titre: string } | null;
}) {
  const contenu = lettre?.contenu ?? "";
  const reseaux = { facebook: COORDONNEES.reseaux.facebook, linkedin: COORDONNEES.reseaux.linkedin };
  const initial = lireDoc(contenu, reseaux) ?? (contenu.trim() ? docDepuisTexte(lettre?.sujet ?? "", contenu, reseaux) : docVide(reseaux));
  return (
    <form action={enregistrerLettre} className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px]">
      {lettre?.id ? <input type="hidden" name="id" value={lettre.id} /> : null}
      <Panneau titre="La lettre" teinte="degrade">
        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="block text-[12.5px] font-semibold text-muted mb-1">Objet du courriel</span>
            <input name="sujet" required maxLength={200} defaultValue={lettre?.sujet ?? ""} placeholder="Ex. Les rendez-vous de la Chambre en décembre" className={CHAMP} />
          </label>
          <EditeurBlocs initial={initial} reseaux={reseaux} />
        </div>
      </Panneau>

      <div className="flex flex-col gap-4 lg:sticky lg:top-[88px]">
        <Panneau titre="Envoi" teinte="rouge" sousTitre={nbDestinataires !== null ? `${nbDestinataires} destinataire${nbDestinataires > 1 ? "s" : ""} avec les tags enregistrés` : undefined}>
          <div className="flex flex-col gap-4">
            {evenement ? (
              <div className="flex flex-col gap-1.5 text-[13.4px] text-ink">
                <input type="hidden" name="evenement" value={evenement.id} />
                <p className="m-0">Les inscrits de <b>« {evenement.titre} »</b>, une fois par adresse (sauf ceux notés absents).</p>
              </div>
            ) : (
              <>
                <div>
                  <div className="text-[12.5px] font-semibold text-ink mb-1">Envoyer aux entreprises avec le tag</div>
                  <SelecteurTags name="etiquettes" options={etiquettes} initiaux={audience.etiquettes} bouton="Ajouter un tag" />
                  <p className="m-0 mt-1.5 text-[11.5px] text-faint">Sans tag : tous les membres.</p>
                </div>
                <div>
                  <div className="text-[12.5px] font-semibold text-ink mb-1">Ne pas envoyer aux entreprises avec le tag</div>
                  <SelecteurTags name="exclus" ton="gris" options={etiquettes} initiaux={audience.exclus} bouton="Exclure un tag" />
                </div>
              </>
            )}

            <div className="pt-4 border-t border-line flex flex-col gap-2">
              <button type="submit" name="intention" value="envoyer" className="btn-action btn-action-sm"><Send size={14} /> Envoyer maintenant</button>
              <div className="flex gap-2">
                <input type="datetime-local" name="programmeeLe" defaultValue={programmationParDefaut()} aria-label="Date et heure d’envoi (heure de Madagascar)" className={`${CHAMP} flex-1 min-w-0`} />
                <button type="submit" name="intention" value="programmer" className="btn-contour btn-contour-sm text-ink shrink-0" title={`Envoi automatique à la date choisie (heure de Madagascar, jusqu’à ${DELAI_MAX_JOURS} jours à l’avance)`}><CalendarClock size={14} /> Programmer</button>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" name="intention" value="enregistrer" className="btn-contour btn-contour-sm text-ink flex-1"><Save size={14} /> Brouillon</button>
              <button type="submit" name="intention" value="test" className="btn-contour btn-contour-sm text-ink flex-1"><TestTube size={14} /> M’envoyer un test</button>
            </div>
          </div>
        </Panneau>
      </div>
    </form>
  );
}
