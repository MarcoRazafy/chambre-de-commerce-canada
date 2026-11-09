import Link from "next/link";
import { CalendarPlus, Check, Hourglass, Video } from "lucide-react";
import { Card } from "@/components/ui";
import { fmtHeure, fmtJour } from "@/lib/agenda";
import { libelleLieu, MENTION_FUSEAU } from "@/lib/rendezvous";
import type { RendezvousPris } from "@/lib/rendezvous-donnees";

// Après une réservation : ce qui est pris, où, et de quoi l'ajouter à son agenda
export function ConfirmationRendezvous({ rdv, base }: { rdv: RendezvousPris; base: string }) {
  const attente = rdv.statut === "a_confirmer";
  const lieu = libelleLieu(rdv.lieu);
  return (
    <Card className="p-5 flex flex-col gap-3 items-start mb-7 border-l-4" style={{ borderLeftColor: attente ? "var(--warn)" : "var(--success)" }}>
      <span className={`w-11 h-11 rounded-full grid place-items-center text-white ${attente ? "bg-warn" : "bg-success"}`}>
        {attente ? <Hourglass size={20} /> : <Check size={22} strokeWidth={3} />}
      </span>
      <h2 className="m-0 text-[19px]">{attente ? "Demande envoyée" : "Rendez-vous confirmé"}</h2>
      <p className="m-0 text-[14px] text-ink">
        <b>{rdv.type.titre}</b> · <span className="first-letter:uppercase">{fmtJour(rdv.jour, { weekday: "long", day: "numeric", month: "long" })}</span>,{" "}
        <span className="tabular-nums">{fmtHeure(rdv.debut)} – {fmtHeure(rdv.fin)}</span> ({MENTION_FUSEAU}) avec {rdv.hote?.nom ?? "l’équipe CanCham"}.
      </p>
      <div className="w-full rounded-[var(--radius-m)] border border-line bg-surface-2 px-3.5 py-3 text-[13px] text-ink">
        {rdv.lieu === "visio" ? (
          rdv.lienVisio ? (
            <span className="inline-flex items-center gap-1.5 flex-wrap"><Video size={14} /> Visio :{" "}
              <a href={rdv.lienVisio} target="_blank" rel="noopener noreferrer" className="text-accent font-semibold break-all">{rdv.lienVisio}</a>
            </span>
          ) : (
            "En visio : le lien vous sera envoyé avant la rencontre."
          )
        ) : (
          lieu.detail
        )}
      </div>
      <p className="m-0 text-[12.5px] text-muted">
        {attente
          ? "L’équipe confirme votre demande rapidement : vous recevrez un courriel avec l’invitation d’agenda."
          : "La confirmation est partie par courriel, avec l’invitation à ajouter à votre agenda."}
      </p>
      <div className="flex flex-wrap gap-2">
        {attente ? null : (
          <a href={`${base}/${rdv.id}/ics`} className="btn-action btn-action-sm no-underline">
            <CalendarPlus size={14} /> Ajouter à mon agenda
          </a>
        )}
        <Link href={base} className="btn-contour btn-contour-sm text-ink no-underline">Prendre un autre rendez-vous</Link>
      </div>
    </Card>
  );
}
