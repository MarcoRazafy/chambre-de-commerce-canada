import { Eye, Save, Send, TestTube } from "lucide-react";
import { Panneau } from "@/components/admin/ui";
import { enregistrerLettre } from "@/lib/actions/newsletter";
import { STATUTS_AUDIENCE, type Audience } from "@/lib/newsletter";

const CHAMP = "w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.6px] outline-none focus:border-accent";
const CASE = "inline-flex items-center gap-2 text-[13.4px] text-ink cursor-pointer";

// Rédaction d'une lettre : objet, texte (un paragraphe par ligne vide), audience ; brouillon, test, envoi
export function EditeurLettre({
  lettre,
  audience,
  etiquettes,
  nbDestinataires,
}: {
  lettre: { id: string; sujet: string; contenu: string } | null;
  audience: Audience;
  etiquettes: string[];
  nbDestinataires: number | null;
}) {
  return (
    <form action={enregistrerLettre} className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px]">
      {lettre ? <input type="hidden" name="id" value={lettre.id} /> : null}
      <Panneau titre="La lettre" teinte="degrade">
        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="block text-[12.5px] font-semibold text-muted mb-1">Objet du courriel</span>
            <input name="sujet" required maxLength={200} defaultValue={lettre?.sujet ?? ""} placeholder="Ex. Les rendez-vous de la CanCham en décembre" className={CHAMP} />
          </label>
          <label className="block">
            <span className="block text-[12.5px] font-semibold text-muted mb-1">Texte</span>
            <textarea name="contenu" required rows={16} defaultValue={lettre?.contenu ?? ""} className={`${CHAMP} leading-relaxed`}
              placeholder={"Bonjour,\n\nUn paragraphe par bloc : laissez une ligne vide entre deux paragraphes.\n\nÀ bientôt,\nL’équipe CanCham"} />
            <span className="block mt-1 text-[12px] text-faint">Une ligne vide sépare les paragraphes. Le courriel reprend l’en-tête CanCham.</span>
          </label>
        </div>
      </Panneau>

      <div className="flex flex-col gap-4">
        <Panneau titre="Destinataires" teinte="bleu" sousTitre={nbDestinataires !== null ? `${nbDestinataires} adresse${nbDestinataires > 1 ? "s" : ""} avec l’audience enregistrée` : undefined}>
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-[12.5px] font-semibold text-muted mb-1.5">Contacts des membres</div>
              <div className="flex flex-col gap-1.5">
                {STATUTS_AUDIENCE.map(([k, l]) => (
                  <label key={k} className={CASE}><input type="checkbox" name="statuts" value={k} defaultChecked={audience.statuts.includes(k)} className="w-4 h-4 accent-[var(--accent)]" />{l}</label>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="block text-[12.5px] font-semibold text-muted mb-1">Chez chaque membre</span>
              <select name="contacts" defaultValue={audience.contacts} className={CHAMP}>
                <option value="tous">Tous les contacts</option>
                <option value="principal">Le contact principal seulement</option>
              </select>
            </label>
            {etiquettes.length ? (
              <label className="block">
                <span className="block text-[12.5px] font-semibold text-muted mb-1">Seulement les membres avec l’étiquette</span>
                <select name="etiquettes" multiple size={Math.min(6, etiquettes.length)} defaultValue={audience.etiquettes} className={CHAMP}>
                  {etiquettes.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <span className="block mt-1 text-[12px] text-faint">Aucune sélection : tous les membres des statuts cochés.</span>
              </label>
            ) : null}
            <label className={`${CASE} pt-2 border-t border-line`}>
              <input type="checkbox" name="abonnes" value="1" defaultChecked={audience.abonnes} className="w-4 h-4 accent-[var(--accent)]" />
              Abonnés à la lettre d’information
            </label>
          </div>
        </Panneau>

        <div className="flex flex-col gap-2">
          <button type="submit" name="intention" value="enregistrer" className="btn-contour btn-contour-sm text-ink"><Save size={14} /> Enregistrer le brouillon</button>
          <button type="submit" name="intention" value="test" className="btn-contour btn-contour-sm text-ink"><TestTube size={14} /> M’envoyer un test</button>
          <button type="submit" name="intention" value="envoyer" className="btn-action btn-action-sm"><Send size={14} /> Envoyer la lettre</button>
          <p className="m-0 text-[12px] text-faint flex items-start gap-1.5"><Eye size={13} className="shrink-0 mt-px" />Enregistrez pour voir le nombre de destinataires ; l’envoi part tout de suite.</p>
        </div>
      </div>
    </form>
  );
}
