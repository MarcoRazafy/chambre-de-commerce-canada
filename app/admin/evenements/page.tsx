import Image from "next/image";
import { Partage } from "@/components/Partage";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Globe,
  LockKeyhole,
  MapPin,
  Plus,
  Search,
} from "lucide-react";
import { EnTeteAdmin, Jauge, Onglets, Vide } from "@/components/admin/ui";
import { FiltresAuto } from "@/components/FiltresAuto";
import { Card, Pill, Saillant } from "@/components/ui";
import { lirePeriode, selection } from "@/lib/evenements-stats";
import { fmtMoney, parseISO } from "@/lib/format";
import { getEvents } from "@/lib/queries";

export default async function AdminEvenements({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; q?: string }>;
}) {
  const p = await searchParams;
  const periode = lirePeriode(p.periode);
  const q = (p.q ?? "").trim().slice(0, 100);

  const events = await getEvents();
  const aVenir = selection(events, "a_venir", q);
  const passes = selection(events, "passes", q);
  const liste = periode === "passes" ? passes : aVenir;
  const avec = (params: Record<string, string>) => {
    const u = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    return u.size ? `?${u}` : "";
  };

  return (
    <>
      <EnTeteAdmin
        surtitre="Programme"
        titre={
          <>
            Gestion des <Saillant>événements</Saillant>
          </>
        }
        actions={
          <>
            {/* Fichier CSV : les événements de l’onglet et de la recherche en cours */}
            <a
              href={`/admin/evenements/statistiques${avec({ periode: periode === "passes" ? "passes" : "", q })}`}
              download
              className="btn-contour btn-contour-sm text-ink no-underline"
              title="Inscrits, présents, absents, remplissage et taux de présence de chaque événement affiché"
            >
              <BarChart3 size={15} /> Statistiques
            </a>
            <Link
              href="/admin/evenements/nouveau"
              className="btn-action btn-action-sm no-underline"
            >
              <Plus size={15} /> Nouvel événement
            </Link>
          </>
        }
      />

      <Onglets
        actif={periode}
        onglets={[
          {
            cle: "a_venir",
            libelle: "À venir",
            href: `/admin/evenements${avec({ q })}`,
            compte: aVenir.length,
          },
          {
            cle: "passes",
            libelle: "Passés",
            href: `/admin/evenements${avec({ periode: "passes", q })}`,
            compte: passes.length,
          },
        ]}
        fin={
          <FiltresAuto action="/admin/evenements" className="relative w-full sm:w-[300px]">
            {periode === "passes" ? <input type="hidden" name="periode" value="passes" /> : null}
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
            />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Rechercher un événement, un lieu…"
              aria-label="Rechercher un événement"
              className="w-full border border-line bg-surface text-ink rounded-[var(--radius-s)] pl-[34px] pr-3 py-[8px] text-[13.6px]"
            />
          </FiltresAuto>
        }
      />

      {liste.length ? (
        <div className="cascade grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {liste.map((e) => {
            const d = parseISO(e.date);
            const complet = e.inscrits >= e.cap;
            return (
              <Link
                key={e.id}
                href={`/admin/evenements/${e.id}`}
                prefetch
                className="no-underline group block"
              >
                <Card className="carte-filet filet-bas filet-degrade p-0 h-full overflow-hidden flex flex-col">
                  <Partage nom={`evenement-${e.id}`}>
                    <div className="relative aspect-[16/9] bg-surface-2 overflow-hidden">
                      {e.photo ? (
                        <Image
                          src={e.photo}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 100vw, 400px"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-faint">
                          <CalendarDays size={30} />
                        </span>
                      )}
                      <span className="pastille absolute top-3 left-3 rounded-lg bg-accent text-white text-center px-3 py-1.5 leading-none">
                        <span className="titre block text-[20px]">
                          {d.getDate()}
                        </span>
                        <span className="block text-[10px] font-bold uppercase tracking-wider mt-0.5">
                          {d
                            .toLocaleDateString("fr-FR", { month: "short" })
                            .replace(".", "")}
                        </span>
                      </span>
                      <span className="absolute top-3 right-3 flex flex-col items-end gap-1">
                        <Pill tone={e.payant ? "warn" : "ok"}>
                          {e.payant ? fmtMoney(e.prix) : "Inclus"}
                        </Pill>
                        <Pill
                          icon={
                            e.public ? (
                              <Globe size={11} />
                            ) : (
                              <LockKeyhole size={11} />
                            )
                          }
                        >
                          {e.public ? "Public" : "Plateforme"}
                        </Pill>
                      </span>
                    </div>
                  </Partage>
                  <div className="p-5 flex-1 flex flex-col">
                    <h2 className="text-[16px] m-0 text-ink">{e.titre}</h2>
                    <div className="flex items-center gap-1.5 text-[12.8px] text-muted mt-1.5">
                      <MapPin size={13} className="shrink-0" />
                      <span className="truncate">
                        {e.lieu} · {e.format}
                      </span>
                    </div>
                    <div className="mt-auto pt-4">
                      <div className="flex items-baseline justify-between text-[12.5px] mb-1.5">
                        <span className="text-muted">Inscriptions</span>
                        <span
                          className={`tabular-nums font-semibold ${complet ? "text-accent" : "text-ink"}`}
                        >
                          {e.inscrits}/{e.cap}
                          {complet ? " · complet" : ""}
                        </span>
                      </div>
                      <Jauge
                        valeur={e.inscrits}
                        max={e.cap}
                        teinte={complet ? "rouge" : "vert"}
                      />
                      <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-accent group-hover:underline">
                        Gérer l’événement <ChevronRight size={15} />
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <Vide icone={<CalendarDays size={26} />}>
            {q
              ? `Aucun événement ${periode === "passes" ? "passé" : "à venir"} ne correspond à « ${q} ».`
              : periode === "passes"
                ? "Aucun événement passé."
                : "Aucun événement programmé."}
          </Vide>
        </Card>
      )}
    </>
  );
}
