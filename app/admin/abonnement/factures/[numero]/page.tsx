import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ImpressionAuto } from "@/components/forms/ImpressionAuto";
import { PrintButton } from "@/components/forms/PrintButton";
import { Pill } from "@/components/ui";
import { getFacturePlateforme } from "@/lib/factures-plateforme";
import { fmtDate } from "@/lib/format";
import { identitePlateforme, numerosPlateforme } from "@/lib/identite-plateforme";
import { fmtDollars, fmtPourcent, payantsFacture } from "@/lib/plateforme";
import { getProfilChambreBrut } from "@/lib/profil-chambre";
import { completerProfil } from "@/lib/profil-chambre-defauts";

// Une facture de l'abonnement à la plateforme, prête à imprimer ou à enregistrer en PDF (?pdf=1).
// Émetteur : la plateforme (Paramètres de l'Admin GM) ; facturé à : la Chambre (Mon entreprise).
export default async function FactureAbonnement({
  params,
  searchParams,
}: {
  params: Promise<{ numero: string }>;
  searchParams: Promise<{ pdf?: string }>;
}) {
  const [{ numero }, { pdf }] = await Promise.all([params, searchParams]);
  const [f, plateforme, brut] = await Promise.all([getFacturePlateforme(decodeURIComponent(numero)), identitePlateforme(), getProfilChambreBrut()]);
  if (!f) notFound();
  const chambre = completerProfil(brut);
  const payants = payantsFacture(f);
  const date = f.date.toISOString().slice(0, 10);
  const numeros = numerosPlateforme(plateforme);
  const ligne = "flex justify-between gap-4 py-1.5 tabular-nums";
  const gris = "text-[#5b6b7a]";

  return (
    <>
      {pdf ? <ImpressionAuto /> : null}
      <div className="flex justify-between items-center gap-3 flex-wrap mb-4 print:hidden">
        <Link href="/admin/abonnement?onglet=factures#onglets" className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted no-underline hover:text-accent">
          <ChevronLeft size={15} /> Factures
        </Link>
        <PrintButton />
      </div>

      <article className="bg-white text-[#16202b] border border-line rounded-[var(--radius-m)] shadow-[var(--shadow)] max-w-[820px] mx-auto print:border-0 print:shadow-none print:max-w-none print:rounded-none">
        <div className="h-1.5 rounded-t-[var(--radius-m)] print:rounded-none" style={{ background: "var(--marque-degrade)" }} />
        <div className="px-8 sm:px-12 py-10 print:px-[16mm] print:py-[14mm] flex flex-col gap-8">
          <header className="flex justify-between items-start gap-8 flex-wrap">
            <div>
              <div className={`text-[13px] uppercase tracking-[0.12em] font-semibold ${gris}`}>Facture</div>
              <div className="text-[26px] font-bold tabular-nums">{f.numero}</div>
              <div className={`text-[13.5px] ${gris}`}>Émise le {fmtDate(date)}</div>
              <div className="mt-2">{f.payeeLe ? <Pill tone="ok">✓ Payée</Pill> : <Pill tone="warn">À régler</Pill>}</div>
            </div>
            <div className="text-right text-[13.5px] leading-relaxed">
              <div className="font-bold text-[15px]">{plateforme.nom}</div>
              {plateforme.raisonSociale && plateforme.raisonSociale !== plateforme.nom ? <div className={gris}>{plateforme.raisonSociale}</div> : null}
              {plateforme.adresse.split("\n").filter(Boolean).map((l, i) => <div key={i} className={gris}>{l}</div>)}
              {plateforme.courriel ? <div className={gris}>{plateforme.courriel}</div> : null}
              {plateforme.telephone ? <div className={gris}>{plateforme.telephone}</div> : null}
            </div>
          </header>

          <section className="grid gap-6 sm:grid-cols-2 text-[13.5px] leading-relaxed">
            <div>
              <div className={`text-[11.5px] uppercase tracking-[0.12em] font-semibold ${gris} mb-1`}>Facturé à</div>
              {brut?.logo ? <Image src={brut.logo} alt="" width={600} height={600} className="w-auto h-[48px] max-w-[180px] object-contain mb-2" unoptimized /> : null}
              <div className="font-semibold">{chambre.nom}</div>
              {chambre.adresse ? <div className={gris}>{chambre.adresse}</div> : null}
              {chambre.email ? <div className={gris}>{chambre.email}</div> : null}
              {chambre.telephone ? <div className={gris}>{chambre.telephone}</div> : null}
            </div>
            <div className="sm:text-right">
              <div className={`text-[11.5px] uppercase tracking-[0.12em] font-semibold ${gris} mb-1`}>Période</div>
              <div>Abonnement du mois, à partir du {fmtDate(date)}</div>
            </div>
          </section>

          <section>
            <div className={`grid grid-cols-[1fr_auto] gap-4 border-b-2 border-[#16202b] pb-2 text-[11.5px] uppercase tracking-[0.12em] font-semibold ${gris}`}>
              <span>Désignation</span><span>Montant</span>
            </div>
            <div className="text-[14px]">
              <div className={ligne}><span>Forfait Chambre</span><span>{fmtDollars(f.forfait)}</span></div>
              {f.utilisateurs > payants ? <div className={ligne}><span>Super admin</span><span>Offert</span></div> : null}
              <div className={ligne}><span>{payants} utilisateur{payants > 1 ? "s" : ""} × {fmtDollars(f.parUtilisateur)}</span><span>{fmtDollars(f.sousTotal - f.forfait)}</span></div>
              <div className={`${ligne} border-t border-[#e5eaf0] mt-1`}><span>Sous-total</span><span>{fmtDollars(f.sousTotal)}</span></div>
              <div className={ligne}><span>TPS ({fmtPourcent(f.tauxTps)})</span><span>{fmtDollars(f.tps)}</span></div>
              <div className={ligne}><span>TVQ ({fmtPourcent(f.tauxTvq)})</span><span>{fmtDollars(f.tvq)}</span></div>
              <div className={`${ligne} border-t-2 border-[#16202b] mt-1 pt-2.5 text-[17px] font-bold`}><span>Total TTC</span><span>{fmtDollars(f.total)}</span></div>
            </div>
          </section>

          <footer className={`text-[12px] ${gris} border-t border-[#e5eaf0] pt-4 flex flex-col gap-1`}>
            <div>{f.payeeLe ? `Réglée le ${fmtDate(f.payeeLe.toISOString().slice(0, 10))}. Merci.` : "Montants en dollars canadiens."}</div>
            {numeros.length ? <div>{plateforme.nom} · {numeros.join(" · ")}</div> : null}
          </footer>
        </div>
      </article>
    </>
  );
}
