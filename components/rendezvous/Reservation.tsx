import Link from "next/link";
import { CalendarCheck2, ChevronLeft, ChevronRight, Clock, Info } from "lucide-react";
import { INPUT } from "@/components/champ-style";
import { Field, SubmitButton } from "@/components/form-bits";
import { CarteType, ICONE_LIEU, QuiRecoit } from "@/components/rendezvous/CarteType";
import { Card, EmptyState, Pill } from "@/components/ui";
import { reserverRendezvous } from "@/lib/actions/rendezvous";
import { fmtHeure, fmtJour } from "@/lib/agenda";
import {
  finCreneau,
  grilleMois,
  HORIZON_JOURS,
  libelleLieu,
  MENTION_FUSEAU,
  moisDe,
  moisVoisin,
} from "@/lib/rendezvous";
import type { JourProposable, TypeRendezvous } from "@/lib/rendezvous-donnees";

const JOURS = ["L", "M", "M", "J", "V", "S", "D"];

// Réservation en ligne : choisir un type, puis un jour dans le calendrier, une heure, et confirmer.
// « base » : la page qui l'affiche (espace membre, ou aperçu de l'équipe, où rien ne se réserve).
export function Reservation({
  types,
  type,
  jours,
  jour,
  heure,
  mois: moisDemande,
  aujourdhui,
  base,
  apercu = false,
}: {
  types: TypeRendezvous[];
  type: TypeRendezvous | null;
  jours: JourProposable[];
  jour: string | null;
  heure: string | null;
  mois: string | null;
  aujourdhui: string;
  base: string;
  apercu?: boolean;
}) {
  const lien = (c: { type?: string; mois?: string; jour?: string; h?: string }) => {
    const q = new URLSearchParams(Object.entries(c).filter(([, v]) => v) as [string, string][]);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };

  if (!types.length) {
    return (
      <EmptyState>
        L’équipe n’a pas encore ouvert de rendez-vous. Écrivez-lui depuis la page « Contacter l’équipe » : elle vous
        répondra directement.
      </EmptyState>
    );
  }

  if (!type) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {types.map((t) => (
          <CarteType
            key={t.id}
            type={t}
            actions={
              <Link href={lien({ type: t.id })} scroll={false} className="btn-action btn-action-sm no-underline">
                <CalendarCheck2 size={14} /> Choisir un créneau
              </Link>
            }
          />
        ))}
      </div>
    );
  }

  const disponibles = new Map(jours.map((j) => [j.jour, j.creneaux]));
  const premierMois = moisDe(aujourdhui);
  const dernierMois = moisDe(jours.at(-1)?.jour ?? aujourdhui);
  const mois =
    moisDemande && moisDemande >= premierMois && moisDemande <= dernierMois
      ? moisDemande
      : moisDe(jour ?? jours[0]?.jour ?? aujourdhui);
  const duJour = (jour && disponibles.get(jour)) || [];
  const choisi = !!(jour && heure && duJour.includes(heure));
  const lieu = libelleLieu(type.lieu);

  return (
    <Card className="p-0 overflow-hidden grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]">
      <div className="p-5 flex flex-col gap-2.5 border-b md:border-b-0 md:border-r border-line border-t-4 md:border-t-0 md:border-l-4" style={{ borderTopColor: type.couleur, borderLeftColor: type.couleur }}>
        <QuiRecoit hote={type.hote} taille={44} />
        <h2 className="m-0 mt-1 text-[18px]">{type.titre}</h2>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-ink"><Clock size={14} /> {type.duree} minutes</span>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-ink">{ICONE_LIEU[type.lieu]} {lieu.libelle}</span>
        <span className="text-[12.5px] text-muted">{lieu.detail}</span>
        {type.detail ? <p className="m-0 text-[13px] text-muted">{type.detail}</p> : null}
        <div className="flex flex-wrap gap-1.5">
          {type.prix ? <Pill tone="ok">{type.prix}</Pill> : null}
          {type.aConfirmer ? <Pill tone="warn">Confirmé par l’équipe</Pill> : null}
        </div>
        <Link href={base} scroll={false} className="mt-auto pt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-accent no-underline hover:underline">
          <ChevronLeft size={15} /> Changer de rendez-vous
        </Link>
      </div>

      <div className="p-5 flex flex-col gap-4 min-w-0">
        {choisi ? (
          <form action={reserverRendezvous} className="flex flex-col gap-3 max-w-[520px]">
            <input type="hidden" name="typeId" value={type.id} />
            <input type="hidden" name="jour" value={jour!} />
            <input type="hidden" name="debut" value={heure!} />
            <div>
              <div className="text-[15px] font-semibold text-ink first-letter:uppercase">
                {fmtJour(jour!, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
              <div className="text-[13.5px] text-muted tabular-nums">
                {fmtHeure(heure!)} – {fmtHeure(finCreneau(heure!, type.duree))} · {MENTION_FUSEAU}
              </div>
            </div>
            <Field label="Ce dont vous souhaitez parler" hint="Facultatif, mais la personne prépare mieux la rencontre.">
              <textarea name="motif" rows={3} maxLength={500} placeholder="Ex. Participer à la prochaine mission au Canada" className={INPUT} />
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={lien({ type: type.id, mois, jour: jour! })} scroll={false} className="btn-contour btn-contour-sm text-ink no-underline">
                <ChevronLeft size={14} /> Retour
              </Link>
              {apercu ? (
                <span className="text-[12.5px] text-muted">Aperçu : les membres confirment ici leur rendez-vous.</span>
              ) : (
                <SubmitButton pendingLabel="Réservation…">
                  <CalendarCheck2 size={15} /> {type.aConfirmer ? "Envoyer la demande" : "Confirmer le rendez-vous"}
                </SubmitButton>
              )}
            </div>
            <p className="m-0 text-[12px] text-faint">
              {type.aConfirmer
                ? "L’équipe confirme votre demande rapidement ; vous recevez alors l’invitation à ajouter à votre agenda."
                : "Une confirmation part par courriel, avec l’invitation à ajouter à votre agenda."}{" "}
              Un empêchement s’annule depuis cette page : le créneau repart aussitôt à quelqu’un d’autre.
            </p>
          </form>
        ) : (
          <>
            <b className="text-[14px] text-ink">Choisissez une date et une heure</b>
            {jours.length ? (
              <div className="grid gap-5 grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    {mois > premierMois ? (
                      <Link href={lien({ type: type.id, mois: moisVoisin(mois, -1) })} scroll={false} aria-label="Mois précédent" className="w-8 h-8 grid place-items-center rounded-full border border-line text-ink no-underline hover:bg-surface-2"><ChevronLeft size={15} /></Link>
                    ) : <span className="w-8" />}
                    <span className="text-[14px] font-semibold text-ink first-letter:uppercase">{fmtJour(`${mois}-01`, { month: "long", year: "numeric" })}</span>
                    {mois < dernierMois ? (
                      <Link href={lien({ type: type.id, mois: moisVoisin(mois, 1) })} scroll={false} aria-label="Mois suivant" className="w-8 h-8 grid place-items-center rounded-full border border-line text-ink no-underline hover:bg-surface-2"><ChevronRight size={15} /></Link>
                    ) : <span className="w-8" />}
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {JOURS.map((j, i) => <span key={i} className="text-[11px] font-bold text-faint py-1">{j}</span>)}
                    {grilleMois(mois).map((d, i) =>
                      !d ? (
                        <span key={`v${i}`} />
                      ) : disponibles.has(d) ? (
                        <Link
                          key={d}
                          href={lien({ type: type.id, mois, jour: d })}
                          scroll={false}
                          aria-current={d === jour ? "date" : undefined}
                          aria-label={fmtJour(d, { weekday: "long", day: "numeric", month: "long" })}
                          className={`h-9 grid place-items-center rounded-full text-[13px] font-semibold no-underline tabular-nums ${
                            d === jour ? "bg-accent text-white" : "bg-accent-soft text-accent-strong hover:bg-accent hover:text-white"
                          }`}
                        >
                          {Number(d.slice(8))}
                        </Link>
                      ) : (
                        <span key={d} className={`h-9 grid place-items-center text-[13px] tabular-nums ${d === aujourdhui ? "font-bold text-ink" : "text-faint"}`}>
                          {Number(d.slice(8))}
                        </span>
                      ),
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  {jour && duJour.length ? (
                    <>
                      <div className="text-[12.5px] text-muted mb-2 first-letter:uppercase">
                        {fmtJour(jour, { weekday: "long", day: "numeric", month: "long" })} · {MENTION_FUSEAU}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {duJour.map((c) => (
                          <Link
                            key={c}
                            href={lien({ type: type.id, mois, jour, h: c })}
                            scroll={false}
                            className="no-underline text-center py-2 rounded-[var(--radius-s)] border border-accent text-accent-strong text-[13.2px] font-semibold tabular-nums hover:bg-accent hover:text-white"
                          >
                            {fmtHeure(c)}
                          </Link>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="m-0 text-[13px] text-muted">Les jours en couleur ont des créneaux libres : choisissez-en un.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="m-0 text-[13px] text-muted flex items-start gap-2">
                <Info size={15} className="shrink-0 mt-[1px] text-accent" />
                Aucun créneau libre pour ce rendez-vous dans les {HORIZON_JOURS} prochains jours. Essayez un autre type, ou écrivez à l’équipe.
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
