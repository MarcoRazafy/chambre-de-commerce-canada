import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ImpressionAuto } from "@/components/forms/ImpressionAuto";
import { PrintButton } from "@/components/forms/PrintButton";
import { Pill } from "@/components/ui";
import { COORDONNEES } from "@/lib/coordonnees";
import { getFacturePlateforme } from "@/lib/factures-plateforme";
import { fmtDate } from "@/lib/format";
import { configPlateforme, fmtDollars, fmtPourcent } from "@/lib/plateforme";

// Une facture de l'abonnement à la plateforme, prête à imprimer ou à enregistrer en PDF (?pdf=1)
export default async function FactureAbonnement({
  params,
  searchParams,
}: {
  params: Promise<{ numero: string }>;
  searchParams: Promise<{ pdf?: string }>;
}) {
  const [{ numero }, { pdf }] = await Promise.all([params, searchParams]);
  const f = await getFacturePlateforme(decodeURIComponent(numero));
  if (!f) notFound();
  const c = configPlateforme();
  const fournisseur = process.env.PLATEFORME_FOURNISSEUR?.trim() || "L’Alliée Virtuelle";
  const date = f.date.toISOString().slice(0, 10);
  const ligne = "flex justify-between gap-4 py-1.5 tabular-nums";

  return (
    <>
      {pdf ? <ImpressionAuto /> : null}
      <div className="flex justify-between items-center gap-3 flex-wrap mb-4 print:hidden">
        <Link href="/admin/abonnement?onglet=factures" className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted no-underline hover:text-accent">
          <ChevronLeft size={15} /> Factures
        </Link>
        <PrintButton />
      </div>

      <article className="bg-white text-[#16202b] border border-line rounded-[var(--radius-m)] shadow-[var(--shadow)] max-w-[820px] mx-auto print:border-0 print:shadow-none print:max-w-none print:rounded-none">
        <div className="h-1.5 rounded-t-[var(--radius-m)] print:rounded-none" style={{ background: "var(--marque-degrade)" }} />
        <div className="px-8 sm:px-12 py-10 print:px-[16mm] print:py-[14mm] flex flex-col gap-8">
          <header className="flex justify-between items-start gap-8 flex-wrap">
            <div>
              <div className="text-[13px] uppercase tracking-[0.12em] font-semibold text-[#5b6b7a]">Facture</div>
              <div className="text-[26px] font-bold tabular-nums">{f.numero}</div>
              <div className="text-[13.5px] text-[#5b6b7a]">Émise le {fmtDate(date)}</div>
              <div className="mt-2">{f.payeeLe ? <Pill tone="ok">✓ Payée</Pill> : <Pill tone="warn">À régler</Pill>}</div>
            </div>
            <div className="text-right text-[13.5px] leading-relaxed">
              <div className="font-bold text-[15px]">{fournisseur}</div>
              <div className="text-[#5b6b7a]">{c.nom}</div>
            </div>
          </header>

          <section className="grid gap-6 sm:grid-cols-2 text-[13.5px] leading-relaxed">
            <div>
              <div className="text-[11.5px] uppercase tracking-[0.12em] font-semibold text-[#5b6b7a] mb-1">Facturé à</div>
              <Image src="/marque/logo-couleur.png" alt="IMPACT 261" width={1600} height={647} className="w-[150px] h-auto mb-2" />
              <div className="font-semibold">Chambre de Commerce et de Coopération Canada–Madagascar</div>
              <div className="text-[#5b6b7a]">{COORDONNEES.adresse}</div>
              <div className="text-[#5b6b7a]">{COORDONNEES.email} · {COORDONNEES.telephone}</div>
            </div>
            <div className="sm:text-right">
              <div className="text-[11.5px] uppercase tracking-[0.12em] font-semibold text-[#5b6b7a] mb-1">Période</div>
              <div>Abonnement du mois, à partir du {fmtDate(date)}</div>
            </div>
          </section>

          <section>
            <div className="grid grid-cols-[1fr_auto] gap-4 border-b-2 border-[#16202b] pb-2 text-[11.5px] uppercase tracking-[0.12em] font-semibold text-[#5b6b7a]">
              <span>Désignation</span><span>Montant</span>
            </div>
            <div className="text-[14px]">
              <div className={ligne}><span>Forfait Chambre</span><span>{fmtDollars(f.forfait)}</span></div>
              <div className={ligne}><span>{f.utilisateurs} utilisateur{f.utilisateurs > 1 ? "s" : ""} × {fmtDollars(f.parUtilisateur)}</span><span>{fmtDollars(f.sousTotal - f.forfait)}</span></div>
              <div className={`${ligne} border-t border-[#e5eaf0] mt-1`}><span>Sous-total</span><span>{fmtDollars(f.sousTotal)}</span></div>
              <div className={ligne}><span>TPS ({fmtPourcent(f.tauxTps)})</span><span>{fmtDollars(f.tps)}</span></div>
              <div className={ligne}><span>TVQ ({fmtPourcent(f.tauxTvq)})</span><span>{fmtDollars(f.tvq)}</span></div>
              <div className={`${ligne} border-t-2 border-[#16202b] mt-1 pt-2.5 text-[17px] font-bold`}><span>Total TTC</span><span>{fmtDollars(f.total)}</span></div>
            </div>
          </section>

          <footer className="text-[12px] text-[#5b6b7a] border-t border-[#e5eaf0] pt-4">
            {f.payeeLe ? `Réglée le ${fmtDate(f.payeeLe.toISOString().slice(0, 10))}. Merci.` : "Montants en dollars canadiens."}
          </footer>
        </div>
      </article>
    </>
  );
}
