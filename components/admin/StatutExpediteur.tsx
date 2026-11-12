// État de l'adresse d'expédition (Paramètres → Courriels) : validée, à valider (avec les enregistrements DNS
// à copier chez l'hébergeur du domaine), messagerie gratuite, ou vérification impossible.
// Les boutons envoient tout le formulaire de la fiche (rien de ce qui a été tapé ne se perd).
import { CheckCircle2, Info, RefreshCw, ShieldCheck, TriangleAlert, XCircle } from "lucide-react";
import { BoutonCopier } from "@/components/paiement/Copiable";
import { validerDomaineExpediteur, verifierDomaineExpediteur } from "@/lib/actions/parametres";
import type { EtatDomaine } from "@/lib/brevo-domaines";

const BOUTON = "btn-contour btn-contour-sm text-ink hover:bg-surface-2 self-start";
// « @ » → « domaine.com. » ; « brevo1._domainkey » → « brevo1._domainkey.domaine.com. » (le point final : nom absolu)
const nomComplet = (nom: string, domaine: string) => `${nom === "@" ? domaine : `${nom}.${domaine}`}.`;

export function StatutExpediteur({ etat, serveur, gere = true }: { etat: EtatDomaine; email: string; nom: string; serveur: string; /** Super admin : peut valider et vérifier */ gere?: boolean }) {
  if (etat.etat === "vide") return null;

  const cadre = (ton: "ok" | "warn" | "muted", icone: React.ReactNode, contenu: React.ReactNode) => (
    <div
      id="expediteur"
      className={`flex gap-3 items-start rounded-[var(--radius-m)] border px-4 py-3 text-[13.2px] ${
        ton === "ok" ? "border-success/30 bg-success-soft text-ink" : ton === "warn" ? "border-warn/40 bg-warn-soft text-ink" : "border-line bg-surface-2 text-muted"
      }`}
    >
      <span className="shrink-0 mt-0.5">{icone}</span>
      <div className="min-w-0 flex-1 flex flex-col gap-2.5">{contenu}</div>
    </div>
  );
  const parServeur = <>Envoi depuis <b>{serveur}</b>.</>;

  switch (etat.etat) {
    case "valide":
      return cadre("ok", <CheckCircle2 size={17} className="text-success" />, <p className="m-0">Domaine <b>{etat.domaine}</b> validé.</p>);
    case "webmail":
      return cadre("muted", <Info size={17} />, <p className="m-0">Adresse <b>{etat.domaine}</b> non validable. {parServeur}</p>);
    case "indisponible":
      return cadre("muted", <Info size={17} />, <p className="m-0">Vérification impossible. {parServeur}</p>);
    case "absent":
      return cadre(
        "warn",
        <TriangleAlert size={17} className="text-warn" />,
        <>
          <p className="m-0">Domaine <b>{etat.domaine}</b> non validé. {parServeur}</p>
          {gere ? <button type="submit" formAction={validerDomaineExpediteur} className={BOUTON} formNoValidate>
            <ShieldCheck size={14} /> Valider ce domaine
          </button> : null}
        </>,
      );
    case "en_attente":
      return cadre(
        "warn",
        <TriangleAlert size={17} className="text-warn" />,
        <>
          <p className="m-0">Domaine <b>{etat.domaine}</b> en attente. {parServeur}</p>
          <div className="overflow-x-auto rounded-[var(--radius-s)] border border-line bg-surface">
            <table className="w-full border-collapse text-[12.8px]">
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
          {gere ? <button type="submit" formAction={verifierDomaineExpediteur} className={BOUTON} formNoValidate>
            <RefreshCw size={14} /> Vérifier maintenant
          </button> : null}
        </>,
      );
  }
}
