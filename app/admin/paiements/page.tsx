import Link from "next/link";
import { FiltresAuto } from "@/components/FiltresAuto";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Search,
  Wallet,
} from "lucide-react";
import { Compteur, EnTeteAdmin, Onglets, Vide } from "@/components/admin/ui";
import { NouvelleFactureButton } from "@/components/forms/FactureForms";
import { Card, Saillant, StatusPill, Pill } from "@/components/ui";
import {
  filtrerFacturesHorsStatut,
  enRetard,
  filtrerFactures,
  lireFiltresFactures,
  parametresFactures,
} from "@/lib/filtres-factures";
import { fmtDate } from "@/lib/format";
import { fmtMontant } from "@/lib/membership";
import { getInvoices, getMemberStats, getMembers } from "@/lib/queries";
import { getAnneesFactures, getFinancesAnnee } from "@/lib/queries-admin";

export default async function AdminPaiements({
  searchParams,
}: {
  searchParams: Promise<{
    statut?: string;
    devise?: string;
    annee?: string;
    q?: string;
  }>;
}) {
  const filtres = lireFiltresFactures(await searchParams);
  const [factures, annees, finances, stats, membres] = await Promise.all([
    getInvoices(),
    getAnneesFactures(),
    getFinancesAnnee(filtres.annee),
    getMemberStats(),
    getMembers(),
  ]);

  const retenues = filtrerFacturesHorsStatut(factures, filtres);
  const liste = filtrerFactures(factures, filtres);
  const lien = (changes: Parameters<typeof parametresFactures>[1]) =>
    `/admin/paiements${parametresFactures(filtres, changes)}`;
  const periode = filtres.annee ? `en ${filtres.annee}` : "au total";

  // Totaux en dollars canadiens ; les anciennes factures en Ariary s'ajoutent en dessous
  const montants = (m: { MGA: number; CAD: number }) =>
    m.MGA ? (
      <span className="flex flex-col leading-tight">
        <span className="text-[22px]">{fmtMontant(m.CAD, "CAD")}</span>
        <span className="text-[14px] text-muted">
          + {fmtMontant(m.MGA, "MGA")} (anciennes factures)
        </span>
      </span>
    ) : (
      <span className="text-[22px]">{fmtMontant(m.CAD, "CAD")}</span>
    );

  return (
    <>
      <EnTeteAdmin
        surtitre="Adhérents"
        titre={
          <>
            Paiements &amp; <Saillant>factures</Saillant>
          </>
        }
        actions={
          <>
            <a
              href={`/admin/paiements/export${parametresFactures(filtres)}`}
              className="btn-contour btn-contour-sm text-ink no-underline hover:bg-surface-2"
            >
              <Download size={14} /> Exporter
            </a>
            <NouvelleFactureButton
              membres={membres
                .filter((m) => m.statut !== "candidature")
                .map((m) => ({
                  id: m.id,
                  nom: m.nom,
                  devise: m.formule?.devise ?? "CAD",
                }))}
            />
          </>
        }
      />

      <div className="grid gap-4 mb-6 sm:grid-cols-2 xl:grid-cols-4">
        <Compteur
          icone={<CheckCircle2 size={22} />}
          teinte="vert"
          libelle={`Encaissé ${periode}`}
          valeur={montants(finances.encaisse)}
          href={lien({ statut: "payee" })}
        />
        <Compteur
          icone={<Clock size={22} />}
          teinte="rouge"
          libelle={`À encaisser ${periode}`}
          valeur={montants(finances.aEncaisser)}
          detail={`${finances.enAttente} facture${finances.enAttente > 1 ? "s" : ""} en attente`}
          href={lien({ statut: "envoyee" })}
        />
        <Compteur
          icone={<FileText size={22} />}
          teinte="bleu"
          libelle={`Factures émises ${periode}`}
          valeur={finances.factures}
        />
        <Compteur
          icone={<Wallet size={22} />}
          teinte="rouge"
          libelle="Cotisations en retard"
          valeur={stats.enRetard}
          detail={`${stats.enAttente} adhésion${stats.enAttente > 1 ? "s" : ""} en attente de paiement`}
          href="/admin/membres?statut=en_retard"
        />
      </div>

      <Onglets
        actif={filtres.statut}
        onglets={[
          {
            cle: "toutes",
            libelle: "Toutes",
            href: lien({ statut: null }),
            compte: retenues.length,
          },
          {
            cle: "envoyee",
            libelle: "À régler",
            href: lien({ statut: "envoyee" }),
            compte: retenues.filter((f) => f.statut === "envoyee").length,
          },
          {
            cle: "retard",
            libelle: "En retard",
            href: lien({ statut: "retard" }),
            compte: retenues.filter((f) => enRetard(f)).length,
          },
          {
            cle: "payee",
            libelle: "Payées",
            href: lien({ statut: "payee" }),
            compte: retenues.filter((f) => f.statut === "payee").length,
          },
        ]}
      />

      <FiltresAuto
        action="/admin/paiements"
        className="flex gap-2.5 flex-wrap items-center mb-4"
      >
        {filtres.statut !== "toutes" ? (
          <input type="hidden" name="statut" value={filtres.statut} />
        ) : null}
        <div className="relative flex-1 min-w-[220px] max-w-[380px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
          />
          <input
            type="search"
            name="q"
            defaultValue={filtres.recherche}
            placeholder="Numéro, membre, objet…"
            aria-label="Rechercher une facture"
            className="w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink pl-9 pr-3 py-2.5 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
        <select
          name="annee"
          defaultValue={filtres.annee ?? ""}
          aria-label="Année"
          className="rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.5px] outline-none focus:border-accent"
        >
          <option value="">Toutes les années</option>
          {annees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          name="devise"
          defaultValue={filtres.devise ?? ""}
          aria-label="Devise"
          className="rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.5px] outline-none focus:border-accent"
        >
          <option value="">Toutes devises</option>
          <option value="CAD">Dollars canadiens</option>
          <option value="MGA">Ariary (anciennes factures)</option>
        </select>
        {filtres.recherche || filtres.annee || filtres.devise ? (
          <Link
            href={lien({ q: null, annee: null, devise: null })}
            className="text-[13px] font-semibold text-muted no-underline hover:text-accent"
          >
            Effacer les filtres
          </Link>
        ) : null}
      </FiltresAuto>

      {liste.length === 0 ? (
        <Card>
          <Vide icone={<FileText size={26} />}>
            Aucune facture ne correspond à ces critères.
          </Vide>
        </Card>
      ) : (
        <>
          <Card className="hidden md:block p-0 overflow-hidden">
            <table className="w-full border-collapse text-[13.4px]">
              <thead>
                <tr className="bg-surface-2">
                  {["Facture", "Membre", "Objet", "Montant", "Statut", ""].map(
                    (t, i) => (
                      <th
                        key={t || i}
                        className={`surtitre text-faint font-semibold px-5 py-3 border-b border-line ${t === "Montant" ? "text-right" : "text-left"}`}
                      >
                        {t}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {liste.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-line last:border-b-0 hover:bg-surface-2"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/paiements/${f.id}`}
                        className="block font-[family-name:var(--font-mono)] font-semibold text-ink no-underline hover:text-accent"
                      >
                        {f.numero}
                      </Link>
                      <span className="block text-[12px] text-muted">
                        {fmtDate(f.date, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {f.membreId ? (
                        <Link
                          href={`/admin/membres/${f.membreId}`}
                          className="text-ink font-medium no-underline hover:text-accent"
                        >
                          {f.membre}
                        </Link>
                      ) : (
                        <span className="text-ink font-medium">
                          {f.membre}
                          <span className="font-normal text-faint">
                            {" "}
                            · supprimé
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-muted">{f.objet}</td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums whitespace-nowrap">
                      {fmtMontant(f.montant, f.devise)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex flex-wrap gap-1"><StatusPill status={f.statut} />{enRetard(f) ? <Pill tone="bad">En retard</Pill> : null}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/admin/paiements/${f.id}`}
                        className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent no-underline hover:underline whitespace-nowrap"
                      >
                        {f.statut === "envoyee" ? "Encaisser" : "Voir"}
                        <ChevronRight size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <ul className="md:hidden list-none m-0 p-0 flex flex-col gap-3">
            {liste.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/admin/paiements/${f.id}`}
                  className="block no-underline"
                >
                  <Card className="carte-filet filet-bleu p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block font-semibold text-[14.5px] text-ink truncate">
                          {f.membre}
                          {f.membreId ? null : (
                            <span className="font-normal text-faint">
                              {" "}
                              · supprimé
                            </span>
                          )}
                        </span>
                        <span className="block text-[12.5px] text-muted">
                          {f.objet}
                        </span>
                      </span>
                      <span className="text-[14.5px] font-bold tabular-nums text-ink whitespace-nowrap">
                        {fmtMontant(f.montant, f.devise)}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <span className="text-[12px] text-muted font-[family-name:var(--font-mono)]">
                        {f.numero} ·{" "}
                        {fmtDate(f.date, { day: "numeric", month: "short" })}
                      </span>
                      <span className="inline-flex flex-wrap gap-1"><StatusPill status={f.statut} />{enRetard(f) ? <Pill tone="bad">En retard</Pill> : null}</span>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="text-[12px] text-faint mt-4">
        Les totaux sont tenus par devise : additionner Ariary et dollars
        canadiens n’aurait pas de sens.
      </p>
    </>
  );
}
