import { AlertTriangle, CalendarClock, Clock } from "lucide-react";
import { CarteRendezvous } from "@/components/rendezvous/CarteRendezvous";
import {
  LienRendezvous,
  ModifierType,
  NouveauType,
} from "@/components/rendezvous/Reglages";
import {
  Banner,
  Card,
  EmptyState,
  Pill,
  SectionTitle,
  ViewHead,
} from "@/components/ui";
import { fmtHeure } from "@/lib/agenda";
import { aujourdhuiISO } from "@/lib/format";
import { JOURS_SEMAINE } from "@/lib/rendezvous";
import {
  getRendezvousEquipe,
  getTypesRendezvous,
} from "@/lib/rendezvous-donnees";
import { getCurrentUser } from "@/lib/session";
import { urlPublique } from "@/lib/courriel";
import { cheminRendezvous } from "@/lib/liens";

export default async function RendezvousEquipePage() {
  await getCurrentUser("admin");

  const [rendezvous, types] = await Promise.all([
    getRendezvousEquipe(),
    getTypesRendezvous(true),
  ]);

  const liens = new Map(
    await Promise.all(
      types.map(
        async (t) => [t.id, await urlPublique(cheminRendezvous(t.id))] as const,
      ),
    ),
  );

  const proposes = types.filter((t) => t.actif && t.plages.length);
  const manque = !proposes.length;

  return (
    <>
      <ViewHead title="Rendez-vous" action={<NouveauType />} />

      {manque ? (
        <div className="mb-5">
          <Banner
            tone="warn"
            icon={<AlertTriangle size={17} />}
            title="Aucun rendez-vous ne peut être pris pour l’instant"
          >
            {types.some((t) => t.actif)
              ? "Les types proposés n’ont aucune heure d’accueil : ils n’ont donc aucun créneau à offrir."
              : "Aucun type de rendez-vous n’est proposé aux membres."}
          </Banner>
        </div>
      ) : null}

      <div className="grid gap-6 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        <section>
          <SectionTitle>
            À venir
            {rendezvous.length ? ` (${rendezvous.length})` : ""}
          </SectionTitle>
          {rendezvous.length ? (
            <div className="flex flex-col gap-2.5">
              {rendezvous.map((rdv) => (
                <CarteRendezvous
                  key={rdv.id}
                  rdv={rdv}
                  aujourdhui={aujourdhuiISO()}
                  retour="/admin/rendez-vous"
                  cote="equipe"
                />
              ))}
            </div>
          ) : (
            <EmptyState>
              <CalendarClock size={22} className="mx-auto mb-2 text-faint" />
              Aucun rendez-vous réservé pour le moment.
            </EmptyState>
          )}
        </section>

        <aside>
          <SectionTitle>Ce que vous proposez</SectionTitle>
          <Card className="p-3.5 flex flex-col gap-3.5">
            {types.length ? (
              types.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-2.5 [&+div]:border-t [&+div]:border-line [&+div]:pt-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13.6px] font-semibold text-ink">
                        {t.titre}
                      </span>
                      {t.actif ? null : <Pill tone="muted">Masqué</Pill>}
                    </div>
                    <div className="text-[12.3px] text-muted mt-0.5 flex items-center gap-1">
                      <Clock size={12} /> {t.duree} minutes
                    </div>
                    {t.detail ? (
                      <div className="text-[12.3px] text-faint mt-0.5">
                        {t.detail}
                      </div>
                    ) : null}

                    {t.plages.length ? (
                      <ul className="list-none p-0 m-0 mt-2 flex flex-col gap-0.5">
                        {t.plages.map((p) => (
                          <li
                            key={p.id}
                            className="text-[12.5px] text-ink tabular-nums"
                          >
                            <span className="font-semibold">
                              {JOURS_SEMAINE.find((j) => j.cle === p.jour)
                                ?.libelle ?? ""}
                            </span>{" "}
                            {fmtHeure(p.debut)} – {fmtHeure(p.fin)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="m-0 mt-2 text-[12.3px] text-warn">
                        Aucune heure d’accueil : ce rendez-vous n’apparaît pas
                        aux membres.
                      </p>
                    )}

                    {t.actif && t.plages.length ? (
                      <LienRendezvous
                        lien={liens.get(t.id) ?? ""}
                        titre={t.titre}
                      />
                    ) : null}
                  </div>
                  <ModifierType type={t} />
                </div>
              ))
            ) : (
              <p className="m-0 text-[13px] text-muted">
                Aucun type pour l’instant. « Nouveau type » en crée un — «
                Entretien d’accompagnement », par exemple —, avec les heures où
                vous recevez.
              </p>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
