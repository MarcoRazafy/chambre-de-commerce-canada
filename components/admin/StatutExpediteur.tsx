// Domaine d'expédition (Paramètres → Courriels) : il s'ajoute d'abord ; ensuite son état chez Brevo et, tant qu'il
// n'est pas validé, les enregistrements DNS à copier chez l'hébergeur du domaine.
// Les boutons envoient tout le formulaire de l'expéditeur (rien de ce qui a été tapé ne se perd).
import { CheckCircle2, Plus, RefreshCw, ShieldCheck, X, XCircle } from "lucide-react";
import { INPUT } from "@/components/champ-style";
import { BoutonCopier } from "@/components/paiement/Copiable";
import {
  ajouterDomaineExpediteur,
  retirerDomaineExpediteur,
  validerDomaineExpediteur,
  verifierDomaineExpediteur,
} from "@/lib/actions/parametres";
import type { EtatDomaine } from "@/lib/brevo-domaines";

const BOUTON = "btn-contour btn-contour-sm text-ink hover:bg-surface-2 self-start";
const LIBELLE = "block text-[12.3px] font-semibold text-muted mb-1.5";
// « @ » → « domaine.com. » ; « brevo1._domainkey » → « brevo1._domainkey.domaine.com. » (le point final : nom absolu)
const nomComplet = (nom: string, domaine: string) => `${nom === "@" ? domaine : `${nom}.${domaine}`}.`;

const PASTILLE: Partial<Record<EtatDomaine["etat"], { libelle: string; ton: string }>> = {
  valide: { libelle: "Validé", ton: "bg-success-soft text-success" },
  en_attente: { libelle: "En attente", ton: "bg-warn-soft text-warn" },
  absent: { libelle: "À valider", ton: "bg-warn-soft text-warn" },
};

// Le domaine qui envoie les courriels en ce moment (celui de la plateforme tant que l'entreprise n'a pas le sien)
export function DomaineActif({ domaine }: { domaine: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-muted">
      Domaine actif
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[12.8px] text-ink">
        <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
        {domaine}
      </span>
    </span>
  );
}

export function DomaineExpediteur({ domaine, etat, gere }: { domaine: string; etat: EtatDomaine | null; /** Super admin */ gere: boolean }) {
  if (!domaine || !etat) {
    return (
      <div>
        <label htmlFor="expediteurDomaine" className={LIBELLE}>Votre domaine</label>
        <div className="flex gap-2.5 sm:max-w-[520px]">
          <input
            id="expediteurDomaine"
            name="expediteurDomaine"
            inputMode="url"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            maxLength={300}
            placeholder="entreprise.com"
            className={`${INPUT} min-w-0 flex-1`}
          />
          {gere ? (
            <button type="submit" formAction={ajouterDomaineExpediteur} formNoValidate className="btn-contour btn-contour-sm text-ink hover:bg-surface-2 shrink-0">
              <Plus size={14} /> Ajouter
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const pastille = PASTILLE[etat.etat] ?? { libelle: "Vérification impossible", ton: "bg-surface-3 text-muted" };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className={LIBELLE}>Votre domaine</span>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="inline-flex items-center gap-2.5 min-h-[40px] max-w-full border border-line-champ bg-surface-2 rounded-[var(--radius-s)] px-3 text-[13.6px]">
            <b className="text-ink truncate">{domaine}</b>
            <span className={`shrink-0 text-[11.5px] font-bold px-2 py-0.5 rounded-full ${pastille.ton}`}>{pastille.libelle}</span>
          </div>
          {gere ? (
            <button type="submit" formAction={retirerDomaineExpediteur} formNoValidate className="btn-contour btn-contour-sm text-muted hover:bg-surface-2">
              <X size={14} /> Retirer
            </button>
          ) : null}
        </div>
      </div>

      {etat.etat === "absent" && gere ? (
        <button type="submit" formAction={validerDomaineExpediteur} className={BOUTON} formNoValidate>
          <ShieldCheck size={14} /> Valider ce domaine
        </button>
      ) : null}

      {etat.etat === "en_attente" ? (
        <>
          <div className="overflow-x-auto rounded-[var(--radius-s)] border border-line bg-surface">
            <table className="w-full min-w-[640px] border-collapse text-[12.8px]">
              <thead>
                <tr className="bg-surface-2 text-left text-faint">
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Nom</th>
                  <th className="px-3 py-2 font-semibold">Valeur</th>
                  <th className="px-3 py-2 font-semibold text-right">Trouvé</th>
                </tr>
              </thead>
              <tbody>
                {etat.enregistrements.map((x) => (
                  <tr key={`${x.type}-${x.nom}`} className="border-t border-line align-top">
                    <td className="px-3 py-2 font-semibold text-ink">{x.type}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <code className="font-[family-name:var(--font-mono)] text-ink break-all">{x.nom}</code>
                        <BoutonCopier valeur={x.nom} libelle={`le nom ${x.nom}`} className="!min-h-8 !px-2 !text-[12px] border-line bg-surface text-ink" />
                      </div>
                      {/* Nom complet, pour les hébergeurs qui refusent « @ » ou les noms courts (cPanel) */}
                      <div className="mt-1 flex items-center gap-2 text-[11.5px] text-muted">
                        ou <code className="font-[family-name:var(--font-mono)] break-all">{nomComplet(x.nom, etat.domaine)}</code>
                        <BoutonCopier valeur={nomComplet(x.nom, etat.domaine)} libelle={`le nom complet ${nomComplet(x.nom, etat.domaine)}`} className="!min-h-7 !px-2 !text-[11px] border-line bg-surface text-ink" />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <code className="font-[family-name:var(--font-mono)] text-ink break-all">{x.valeur}</code>
                        <BoutonCopier valeur={x.valeur} libelle={`la valeur de ${x.nom}`} className="!min-h-8 !px-2 !text-[12px] border-line bg-surface text-ink" />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {x.ok ? <CheckCircle2 size={16} className="inline text-success" aria-label="Trouvé" /> : <XCircle size={16} className="inline text-faint" aria-label="Pas encore trouvé" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {gere ? (
            <button type="submit" formAction={verifierDomaineExpediteur} className={BOUTON} formNoValidate>
              <RefreshCw size={14} /> Vérifier maintenant
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
