import type { ReactNode } from "react";
import { CalendarDays, Clock, MapPin, Phone, Video } from "lucide-react";
import { Pastille } from "@/components/messagerie/outils";
import { Card, Pill } from "@/components/ui";
import { initialesDe } from "@/lib/avatars";
import { libelleLieu, resumePlages, type Lieu } from "@/lib/rendezvous";
import type { TypeRendezvous } from "@/lib/rendezvous-donnees";

export const ICONE_LIEU: Record<Lieu, ReactNode> = {
  visio: <Video size={14} className="shrink-0" />,
  bureau: <MapPin size={14} className="shrink-0" />,
  telephone: <Phone size={14} className="shrink-0" />,
};

// La personne qui reçoit (ou l'équipe), en petit
export function QuiRecoit({ hote, taille = 28 }: { hote: TypeRendezvous["hote"]; taille?: number }) {
  const nom = hote?.nom ?? "L’équipe CanCham";
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <Pastille src={hote?.photo} alt="" initiales={hote ? initialesDe(hote.nom) : "CC"} taille={taille} />
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-ink truncate">{nom}</div>
        <div className="text-[12px] text-muted truncate">{hote?.specialite || hote?.fonction || "Toute l’équipe de la Chambre"}</div>
      </div>
    </div>
  );
}

// Un type de rendez-vous en carte, avec sa couleur de repère en haut (membres : « Choisir un créneau » ; équipe : ses actions)
export function CarteType({ type, actions, masque }: { type: TypeRendezvous; actions: ReactNode; masque?: ReactNode }) {
  const lieu = libelleLieu(type.lieu);
  return (
    <Card className="p-5 flex flex-col gap-3 min-w-0 border-t-4" style={{ borderTopColor: type.couleur }}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="m-0 text-[15px] font-semibold text-ink">{type.titre}</h3>
        <Pill className="shrink-0" icon={<Clock size={11} />}>{type.duree} min</Pill>
      </div>
      <QuiRecoit hote={type.hote} />
      {type.detail ? <p className="m-0 text-[13px] text-muted">{type.detail}</p> : null}
      <div className="flex flex-col gap-1 text-[12.8px] text-ink">
        <span className="inline-flex items-center gap-1.5">{ICONE_LIEU[type.lieu]} {lieu.libelle}</span>
        {type.plages.length ? (
          <span className="inline-flex items-start gap-1.5 text-muted"><CalendarDays size={14} className="shrink-0 mt-0.5" /> {resumePlages(type.plages)}</span>
        ) : (
          <span className="text-warn">Aucune heure d’accueil : pas de créneau à proposer.</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {type.prix ? <Pill tone="ok">{type.prix}</Pill> : null}
        {type.aConfirmer ? <Pill tone="warn">Confirmé par l’équipe</Pill> : null}
        {masque}
      </div>
      <div className="mt-auto pt-1 flex flex-wrap gap-2">{actions}</div>
    </Card>
  );
}
