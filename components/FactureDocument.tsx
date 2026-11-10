import Image from "next/image";
import { fmtDate } from "@/lib/format";
import { numerosFiscaux, type ProfilChambre } from "@/lib/profil-chambre-defauts";
import { fmtMontant } from "@/lib/membership";
import type { FactureDetaillee } from "@/lib/factures";

// Facture d'un membre ; l'émetteur (logo, raison sociale, adresse, numéros fiscaux, mention) vient de « Mon entreprise »
export function FactureDocument({ facture: f, emetteur: e }: { facture: FactureDetaillee; emetteur: ProfilChambre }) {
  const fiscaux = numerosFiscaux(e);
  const payee = f.statut === "payee";
  const devise = f.devise === "CAD" ? "dollars canadiens" : "ariary";

  return (
    <article className="bg-white text-[#16202b] border border-line rounded-[var(--radius-m)] shadow-[var(--shadow)] max-w-[820px] mx-auto print:border-0 print:shadow-none print:max-w-none print:rounded-none print:min-h-[296mm] print:flex print:flex-col">
      <div
        className="h-1.5 rounded-t-[var(--radius-m)] print:rounded-none"
        style={{ background: "var(--marque-degrade)" }}
      />

      <div className="px-8 sm:px-12 py-10 print:px-[16mm] print:py-[14mm] print:flex-1 print:flex print:flex-col">
        <header className="flex justify-between items-start gap-8 flex-wrap">
          <Image
            src={e.logoFacture}
            alt={e.raisonSociale}
            width={1600}
            height={647}
            className="w-[220px] max-h-[110px] h-auto object-contain object-left"
            priority
          />
          <div className="text-right">
            <div className="surtitre text-[#ad0707]">Facture</div>
            <div className="font-[family-name:var(--font-mono)] text-[22px] font-bold mt-1">
              {f.numero}
            </div>
            <div className="text-[13px] text-[#5b6b7a] mt-1">
              Émise le {fmtDate(f.date)}
            </div>
          </div>
        </header>

        <div className="grid gap-8 sm:grid-cols-2 mt-10">
          <div>
            <div className="surtitre text-[#8797a6] mb-2">Émetteur</div>
            <div className="font-bold text-[14.5px]">{e.raisonSociale}</div>
            <div className="text-[13px] text-[#5b6b7a] mt-1 leading-relaxed">
              <span className="whitespace-pre-line">{e.adresseFacturation}</span>
              <br />
              {e.email} · {e.telephone}
              {e.site ? (
                <>
                  <br />
                  {e.site}
                </>
              ) : null}
              {fiscaux.length ? (
                <>
                  <br />
                  {fiscaux.map((n, i) => (
                    <span key={n} className="whitespace-nowrap">{i ? " · " : ""}{n}</span>
                  ))}
                </>
              ) : null}
            </div>
          </div>
          <div>
            <div className="surtitre text-[#8797a6] mb-2">Facturé à</div>
            <div className="font-bold text-[14.5px]">{f.membre}</div>
            <div className="text-[13px] text-[#5b6b7a] mt-1 leading-relaxed">
              {f.membreDetail.statutJuridique
                ? `${f.membreDetail.statutJuridique} · `
                : ""}
              {f.membreDetail.ville}
              {f.membreDetail.pays ? `, ${f.membreDetail.pays}` : ""}
              {f.contact ? (
                <>
                  <br />À l’attention de {f.contact.nom}
                  <br />
                  {f.contact.email}
                  {f.contact.tel ? ` · ${f.contact.tel}` : ""}
                </>
              ) : null}
            </div>
          </div>
        </div>

        <table className="w-full border-collapse mt-10 text-[13.5px]">
          <thead>
            <tr className="bg-[#0f1d2c] text-white">
              <th className="text-left font-semibold px-4 py-2.5">
                Désignation
              </th>
              <th className="text-right font-semibold px-4 py-2.5 w-[180px]">
                Montant
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#dfe5ec]">
              <td className="px-4 py-4">{f.objet}</td>
              <td className="px-4 py-4 text-right tabular-nums">
                {fmtMontant(f.montant, f.devise)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="px-4 pt-4 text-right font-semibold">Total</td>
              <td className="px-4 pt-4 text-right font-semibold tabular-nums">
                {fmtMontant(f.montant, f.devise)}
              </td>
            </tr>
            {payee ? (
              <tr className="text-[#5b6b7a]">
                <td className="px-4 pt-1.5 pb-3 text-right">
                  Paiement reçu
                  {f.payeeLe ? ` le ${fmtDate(f.payeeLe)}` : ""}
                </td>
                <td className="px-4 pt-1.5 pb-3 text-right tabular-nums">
                  {fmtMontant(f.montant, f.devise)}
                </td>
              </tr>
            ) : null}
            <tr className={payee ? "border-t border-[#dfe5ec]" : ""}>
              <td className="px-4 pt-3 text-right font-semibold">
                Reste à payer
              </td>
              <td className="px-4 pt-3 text-right text-[18px] font-bold tabular-nums">
                {fmtMontant(payee ? 0 : f.montant, f.devise)}
              </td>
            </tr>
          </tfoot>
        </table>
        <p className="text-[11.5px] text-[#8797a6] text-right m-0 mt-1 px-4">
          Montant en {devise}.
        </p>

        <div className="mt-10 flex items-start gap-5 flex-wrap">
          <span
            className={`inline-block border-2 rounded-md px-4 py-2 font-bold tracking-[0.12em] uppercase text-[14px] -rotate-3 ${
              payee
                ? "border-[#007140] text-[#007140]"
                : "border-[#ad0707] text-[#ad0707]"
            }`}
          >
            {payee ? "Payée" : "À régler"}
          </span>
          <div className="text-[13px] text-[#5b6b7a] leading-relaxed min-w-0 flex-1">
            {payee
              ? f.reglement
                ? `Règlement reçu : ${f.reglement}`
                : "Règlement reçu par la chambre."
              : `Règlement à l’ordre de la chambre, en espèces, par virement ou par Mobile Money. Rappelez le numéro ${f.numero} avec votre paiement.`}
          </div>
        </div>

        <footer className="mt-12 print:mt-auto pt-5 border-t border-[#dfe5ec] text-[11px] text-[#8797a6] leading-relaxed flex justify-between items-end gap-4 flex-wrap">
          <span>
            {e.mentionFacture ? (
              <>
                <span className="whitespace-pre-line">{e.mentionFacture}</span>
                <br />
              </>
            ) : null}
            {e.raisonSociale} · {e.email} · {e.telephone}
            {fiscaux.length ? (
              <>
                <br />
                {fiscaux.join(" · ")}
              </>
            ) : null}
          </span>
          <span className="font-semibold text-[#5b6b7a]">{e.site}</span>
        </footer>
      </div>
    </article>
  );
}
