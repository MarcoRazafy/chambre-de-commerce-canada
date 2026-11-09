import { CalendarClock, Eye, Save, Send, TestTube } from "lucide-react";
import { Panneau } from "@/components/admin/ui";
import { enregistrerLettre } from "@/lib/actions/newsletter";
import { DELAI_MAX_JOURS, programmationParDefaut } from "@/lib/lettres";
import { STATUTS_AUDIENCE, type Audience } from "@/lib/newsletter";

const CHAMP = "w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.6px] outline-none focus:border-accent";
const CASE = "inline-flex items-center gap-2 text-[13.4px] text-ink cursor-pointer";

// Rédaction d'une lettre : objet, texte (un paragraphe par ligne vide), audience ; brouillon, test, envoi
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
  return (
    <form action={enregistrerLettre} className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px]">
      {lettre?.id ? <input type="hidden" name="id" value={lettre.id} /> : null}
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
          {evenement ? (
            <div className="flex flex-col gap-2 text-[13.4px] text-ink">
              <input type="hidden" name="evenement" value={evenement.id} />
              <p className="m-0">Les inscrits de <b>« {evenement.titre} »</b>, une fois par adresse (sauf ceux notés absents).</p>
              <p className="m-0 text-[12px] text-faint">Pour écrire à tous les membres, partez d’une nouvelle lettre depuis la page Newsletter.</p>
            </div>
          ) : (
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
                <span className="block text-[12.5px] font-semibold text-muted mb-1">Seulement les contacts avec le tag</span>
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
          )}
        </Panneau>

        <div className="flex flex-col gap-2">
          <button type="submit" name="intention" value="enregistrer" className="btn-contour btn-contour-sm text-ink"><Save size={14} /> Enregistrer le brouillon</button>
          <button type="submit" name="intention" value="test" className="btn-contour btn-contour-sm text-ink"><TestTube size={14} /> M’envoyer un test</button>
          <p className="m-0 text-[12px] text-faint flex items-start gap-1.5"><Eye size={13} className="shrink-0 mt-px" />Enregistrez pour voir le nombre de destinataires.</p>
        </div>

        <div id="envoi" className="scroll-mt-24">
          <Panneau titre="Envoi" teinte="rouge" sousTitre="Tout de suite, ou à la date et l’heure de votre choix">
            <div className="flex flex-col gap-3">
              <button type="submit" name="intention" value="envoyer" className="btn-action btn-action-sm"><Send size={14} /> Envoyer maintenant</button>
              <div className="pt-3 border-t border-line flex flex-col gap-2">
                <label className="block">
                  <span className="block text-[12.5px] font-semibold text-muted mb-1">Programmer pour le (heure de Madagascar)</span>
                  <input type="datetime-local" name="programmeeLe" defaultValue={programmationParDefaut()} className={CHAMP} />
                </label>
                <button type="submit" name="intention" value="programmer" className="btn-contour btn-contour-sm text-ink"><CalendarClock size={14} /> Programmer l’envoi</button>
                <span className="text-[12px] text-faint">Jusqu’à {DELAI_MAX_JOURS} jours à l’avance ; elle part dans les 5 minutes qui suivent l’heure choisie. Les destinataires sont lus au moment de l’envoi (un désabonnement entre-temps est respecté). Une lettre programmée peut être annulée tant qu’elle n’est pas partie.</span>
              </div>
            </div>
          </Panneau>
        </div>
      </div>
    </form>
  );
}
