import Link from "next/link";
import { FiltresAuto } from "@/components/FiltresAuto";
import { ChevronRight, Download, Search, Users } from "lucide-react";
import { EtatAcces } from "@/components/admin/EtatAcces";
import { EnTeteAdmin, Onglets, Vide } from "@/components/admin/ui";
import { LogoMark } from "@/components/domain";
import { AddMemberButton } from "@/components/forms/MemberForms";
import { Card, Saillant, StatusPill } from "@/components/ui";
import {
  STATUTS_FILTRE,
  dansOnglet,
  filtrerHorsStatut,
  lireFiltres,
  parametresFiltres,
} from "@/lib/filtres-membres";
import {
  ORDRE_FORMULES,
  cotisationAnnuelle,
  libelleFormule,
} from "@/lib/membership";
import { getAccesMembres } from "@/lib/acces-membres";
import { getMembers } from "@/lib/queries";
import { situation } from "@/lib/situation";

export default async function AdminMembres({
  searchParams,
}: {
  searchParams: Promise<{
    statut?: string;
    tab?: string;
    q?: string;
    formule?: string;
  }>;
}) {
  const filtres = lireFiltres(await searchParams);
  const { statut, recherche, formule } = filtres;

  const membres = await getMembers();
  const retenus = filtrerHorsStatut(membres, filtres);
  const liste = retenus.filter((m) => dansOnglet(m.statut, statut));
  const acces = await getAccesMembres(liste.map((m) => m.id));
  const retourListe = `/admin/membres${parametresFiltres(filtres)}`;

  const lien = (changes: Parameters<typeof parametresFiltres>[1]) =>
    `/admin/membres${parametresFiltres(filtres, changes)}`;
  const exportCsv = `/admin/membres/export${parametresFiltres(filtres)}`;

  return (
    <>
      <EnTeteAdmin
        surtitre="Adhérents"
        titre={
          <>
            Gestion des <Saillant>membres</Saillant>
          </>
        }
        actions={
          <>
            <a
              href={exportCsv}
              className="btn-contour btn-contour-sm text-ink no-underline hover:bg-surface-2"
            >
              <Download size={14} /> Exporter
            </a>
            <AddMemberButton />
          </>
        }
      />

      <Onglets
        actif={statut}
        onglets={STATUTS_FILTRE.map((s) => ({
          cle: s.cle,
          libelle: s.libelle,
          href: lien({ statut: s.cle === "tous" ? null : s.cle }),
          compte: retenus.filter((m) => dansOnglet(m.statut, s.cle)).length,
        }))}
      />

      <FiltresAuto
        action="/admin/membres"
        className="flex gap-2.5 flex-wrap items-center mb-4"
      >
        {statut !== "tous" ? (
          <input type="hidden" name="statut" value={statut} />
        ) : null}
        <div className="relative flex-1 min-w-[220px] max-w-[420px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
          />
          <input
            type="search"
            name="q"
            defaultValue={recherche}
            placeholder="Nom, secteur, ville…"
            aria-label="Rechercher un membre"
            className="w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink pl-9 pr-3 py-2.5 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
        <select
          name="formule"
          defaultValue={formule ?? ""}
          aria-label="Formule"
          className="rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.5px] outline-none focus:border-accent"
        >
          <option value="">Toutes les formules</option>
          {ORDRE_FORMULES.map((f) => (
            <option key={f} value={f}>
              {libelleFormule(f)}
            </option>
          ))}
        </select>
        {recherche || formule ? (
          <Link
            href={lien({ q: null, formule: null })}
            className="text-[13px] font-semibold text-muted no-underline hover:text-accent"
          >
            Effacer les filtres
          </Link>
        ) : null}
      </FiltresAuto>

      {liste.length === 0 ? (
        <Card>
          <Vide icone={<Users size={26} />}>
            Aucun membre ne correspond à ces critères.
          </Vide>
        </Card>
      ) : (
        <>
          <Card className="hidden md:block p-0 overflow-hidden">
            <table className="w-full border-collapse text-[13.4px]">
              <thead>
                <tr className="bg-surface-2">
                  {["Membre", "Formule", "Situation", "Accès", ""].map((t) => (
                    <th
                      key={t}
                      className="text-left surtitre text-faint font-semibold px-5 py-3 border-b border-line"
                    >
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {liste.map((m) => {
                  const s = situation(m);
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-line last:border-b-0 hover:bg-surface-2"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/membres/${m.id}`}
                          className="flex items-center gap-3.5 no-underline"
                        >
                          <span className="w-[74px] flex justify-center shrink-0">
                            <LogoMark member={m} size={40} />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-[14px] text-ink hover:text-accent">
                              {m.nom}
                            </span>
                            <span className="block text-[12.5px] text-muted">
                              {m.secteur} · {m.ville}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="block text-ink">
                          {libelleFormule(m.formule)}
                        </span>
                        <span className="block text-[12.5px] text-muted tabular-nums">
                          {cotisationAnnuelle(m.formule)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusPill status={m.statut} />
                        <span
                          className={`block text-[12.5px] mt-1 ${s.urgent ? "text-accent font-semibold" : "text-muted"}`}
                        >
                          {s.detail}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <EtatAcces
                          acces={acces[m.id]}
                          memberId={m.id}
                          nom={m.nom}
                          candidature={m.statut === "candidature"}
                          retour={retourListe}
                        />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/admin/membres/${m.id}`}
                          className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent no-underline hover:underline whitespace-nowrap"
                        >
                          {s.action ?? "Ouvrir"} <ChevronRight size={15} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <ul className="md:hidden list-none m-0 p-0 flex flex-col gap-3">
            {liste.map((m) => {
              const s = situation(m);
              return (
                <li key={m.id}>
                  <Card className="carte-filet filet-degrade p-4">
                    <Link
                      href={`/admin/membres/${m.id}`}
                      className="block no-underline"
                    >
                      <div className="flex items-center gap-3">
                        <LogoMark member={m} size={40} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-[14.5px] text-ink truncate">
                            {m.nom}
                          </span>
                          <span className="block text-[12.5px] text-muted truncate">
                            {m.secteur}
                          </span>
                        </span>
                        <ChevronRight size={17} className="text-faint" />
                      </div>
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <StatusPill status={m.statut} />
                        <span className="text-[12px] text-muted">
                          {libelleFormule(m.formule)}
                        </span>
                      </div>
                      <p
                        className={`m-0 mt-1.5 text-[12.5px] ${s.urgent ? "text-accent font-semibold" : "text-muted"}`}
                      >
                        {s.detail}
                      </p>
                    </Link>
                    <div className="mt-3 pt-3 border-t border-line flex items-center justify-between gap-3 flex-wrap">
                      <span className="text-[12px] font-semibold text-muted">
                        Accès
                      </span>
                      <EtatAcces
                        acces={acces[m.id]}
                        memberId={m.id}
                        nom={m.nom}
                        candidature={m.statut === "candidature"}
                        retour={retourListe}
                      />
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="text-[12px] text-faint mt-4">
        {liste.length} membre{liste.length > 1 ? "s" : ""} affiché
        {liste.length > 1 ? "s" : ""}. L’export reprend la liste filtrée, au
        format tableur.
      </p>
    </>
  );
}
