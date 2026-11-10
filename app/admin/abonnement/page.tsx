import Link from "next/link";
import { Download, Eye, FileText } from "lucide-react";
import { OngletEquipe } from "@/components/admin/OngletEquipe";
import { EnTeteAdmin, Panneau, Vide } from "@/components/admin/ui";
import { AjouterUtilisateur } from "@/components/forms/EquipeForms";
import { estAdministrateur } from "@/lib/autorisations";
import { assurerFactureDuMois, getFacturesPlateforme } from "@/lib/factures-plateforme";
import { Card, Pill, Saillant } from "@/components/ui";
import { aujourdhuiISO, fmtDate } from "@/lib/format";
import { configPlateforme, facturePlateforme, fmtDollars, fmtPourcent, prochaineFacturation } from "@/lib/plateforme";
import { getAdministrateurs } from "@/lib/queries-admin";
import { getCurrentUser } from "@/lib/session";

// Abonnement de la Chambre à la plateforme (forfait + comptes actifs de l'équipe), l'équipe et ses accès, les factures
export default async function AdminAbonnement({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  await assurerFactureDuMois();
  const [moi, equipe, factures] = await Promise.all([getCurrentUser("admin"), getAdministrateurs(), getFacturesPlateforme()]);
  const c = configPlateforme();
  const n = equipe.length;
  const f = facturePlateforme(n, c);
  const echeance = prochaineFacturation(aujourdhuiISO(), c.jourFacturation);
  const bloc = "rounded-[var(--radius-m)] border border-line bg-surface-2 px-4 py-2.5 flex flex-col";
  const ligne = "flex justify-between gap-3 items-baseline tabular-nums";

  return (
    <>
      <EnTeteAdmin
        surtitre="Plateforme"
        titre={<>Abonnement &amp; <Saillant>utilisateurs</Saillant></>}
        actions={estAdministrateur(moi) ? <AjouterUtilisateur /> : undefined}
      />

      <div className="grid gap-4 mb-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card className="p-6 flex flex-col gap-4">
          <div className="flex justify-between items-start gap-3 flex-wrap">
            <div>
              <span className="surtitre text-faint">Forfait actuel</span>
              <h2 className="text-[18px] m-0 mt-1">{c.nom}</h2>
            </div>
            <Pill tone="ok">Actif · prochaine facture le {fmtDate(echeance)}</Pill>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-[16px]">
            <div className={bloc}><small className="text-[12px] text-muted">Forfait Chambre</small><b className="tabular-nums">{fmtDollars(f.forfait)}</b></div>
            <span className="text-muted font-bold">+</span>
            <div className={bloc}><small className="text-[12px] text-muted">{n} utilisateur{n > 1 ? "s" : ""} × {fmtDollars(c.parUtilisateur)}</small><b className="tabular-nums">{fmtDollars(f.equipe)}</b></div>
            <span className="text-muted font-bold">=</span>
            <div className={`${bloc} border-accent`}><small className="text-[12px] text-muted">par mois, avant taxes</small><b className="tabular-nums">{fmtDollars(f.sousTotal)}</b></div>
          </div>
          <p className="m-0 text-[13px] text-muted">
            Tout est inclus : membres et annuaire avec suggestions de mises en relation, événements, agenda, rendez-vous, ressources, messagerie, newsletter, factures et règlements. Membres et abonnés illimités.
          </p>
        </Card>

        <Panneau titre="Prochaine facture" teinte="rouge">
          <div className="flex flex-col gap-1.5 text-[14px]">
            <div className={ligne}><span>Forfait</span><span>{fmtDollars(f.forfait)}</span></div>
            <div className={ligne}><span>{n} utilisateur{n > 1 ? "s" : ""}</span><span>{fmtDollars(f.equipe)}</span></div>
            <div className={ligne}><span>TPS ({fmtPourcent(c.tps)})</span><span>{fmtDollars(f.tps)}</span></div>
            <div className={ligne}><span>TVQ ({fmtPourcent(c.tvq)})</span><span>{fmtDollars(f.tvq)}</span></div>
            <div className={`${ligne} border-t-2 border-ink pt-2 mt-1 font-bold text-[16px]`}><span>Total le {fmtDate(echeance)}</span><span>{fmtDollars(f.total)}</span></div>
            <p className="m-0 mt-2 text-[12px] text-faint">Estimation à partir des comptes actifs aujourd’hui : elle suit les ajouts et retraits de l’équipe.</p>
          </div>
        </Panneau>
      </div>

      <section id="equipe" className="scroll-mt-6 mt-10">
        <h2 className="text-[18px] m-0 mb-4">Équipe &amp; accès</h2>
        <OngletEquipe q={sp.q} />
      </section>

      <section id="factures" className="scroll-mt-6 mt-10">
        <h2 className="text-[18px] m-0 mb-4">Factures</h2>
        <Panneau titre="Factures de l’abonnement" sousTitre={`Émises le ${c.jourFacturation === 1 ? "1er" : c.jourFacturation} du mois`} teinte="degrade" corpsClassName="px-0 pb-0">
          {factures.length ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13.4px]">
                <thead>
                  <tr className="bg-surface-2">
                    {["N°", "Date", "Détail", "Total TTC", "Statut", "Facture"].map((t, i) => (
                      <th key={t} className={`surtitre text-faint font-semibold px-5 py-3 border-b border-line ${i === 3 || i === 5 ? "text-right" : "text-left"}`}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {factures.map((x) => (
                    <tr key={x.id} className="border-b border-line last:border-b-0 hover:bg-surface-2">
                      <td className="px-5 py-3.5 font-semibold text-ink tabular-nums">{x.numero}</td>
                      <td className="px-5 py-3.5 tabular-nums">{fmtDate(x.date.toISOString().slice(0, 10), { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="px-5 py-3.5 text-muted">{fmtDollars(x.forfait)} + {x.utilisateurs} utilisateur{x.utilisateurs > 1 ? "s" : ""}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-ink tabular-nums">{fmtDollars(x.total)}</td>
                      <td className="px-5 py-3.5">{x.payeeLe ? <Pill tone="ok">✓ Payée</Pill> : <Pill tone="warn">À régler</Pill>}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/abonnement/factures/${x.numero}`} className="btn-contour btn-contour-sm text-ink no-underline"><Eye size={14} /> Afficher</Link>
                          <Link href={`/admin/abonnement/factures/${x.numero}?pdf=1`} className="btn-contour btn-contour-sm text-ink no-underline"><Download size={14} /> PDF</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 pb-6"><Vide icone={<FileText size={24} />}>La première facture sera émise le {fmtDate(echeance)}.</Vide></div>
          )}
        </Panneau>
      </section>
    </>
  );
}
