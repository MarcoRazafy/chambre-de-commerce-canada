import { fmtDate } from "@/lib/format";
import {
  blocageDe,
  fmtCotisation,
  joursDeRetard,
  libelleFormule,
  retardBloque,
} from "@/lib/membership";
import type { Member } from "@/lib/types";

export interface Situation {
  detail: string;
  action: string | null;
  urgent: boolean;
}

export function situation(m: Member): Situation {
  switch (m.statut) {
    case "candidature":
      return {
        detail: `Demande déposée le ${fmtDate(m.adhesion, { day: "numeric", month: "long" })} · ${libelleFormule(m.formule)}`,
        action: "Examiner",
        urgent: false,
      };
    case "refusee":
      return {
        detail: `Demande refusée · déposée le ${fmtDate(m.adhesion, { day: "numeric", month: "long" })}`,
        action: null,
        urgent: false,
      };
    case "en_attente":
      return {
        detail: m.formule
          ? `Approuvée · cotisation attendue : ${fmtCotisation(m.formule)}`
          : "Approuvée · formule à choisir avant toute cotisation",
        action: "Encaisser",
        urgent: false,
      };
    case "en_retard": {
      const jours = joursDeRetard(m);
      const bloque = retardBloque(m);
      return {
        detail: bloque
          ? `${jours} jours de retard · accès bloqué`
          : `${jours} jour${jours > 1 ? "s" : ""} de retard · blocage dans ${blocageDe(m) - jours + 1} j`,
        action: "Relancer",
        urgent: bloque,
      };
    }
    default:
      return {
        detail: `Membre depuis ${fmtDate(m.adhesion, { month: "long", year: "numeric" })}`,
        action: null,
        urgent: false,
      };
  }
}
