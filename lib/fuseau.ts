export const FUSEAUX = [
  { cle: "America/St_Johns", libelle: "Terre-Neuve (St. John’s)" },
  { cle: "America/Halifax", libelle: "Atlantique (Halifax, Moncton)" },
  { cle: "America/Toronto", libelle: "Est (Montréal, Québec, Toronto)" },
  { cle: "America/Winnipeg", libelle: "Centre (Winnipeg, Regina)" },
  { cle: "America/Edmonton", libelle: "Rocheuses (Edmonton, Calgary)" },
  { cle: "America/Vancouver", libelle: "Pacifique (Vancouver)" },
  { cle: "Indian/Antananarivo", libelle: "Madagascar (Antananarivo)" },
  { cle: "Europe/Paris", libelle: "Europe centrale (Paris)" },
] as const;

export const FUSEAU_CANCHAM = "Indian/Antananarivo";
export const FUSEAU_PAR_DEFAUT = "America/Toronto";

export const fuseauConnu = (v: string) => FUSEAUX.some((f) => f.cle === v);

export function jourDans(date: Date, fuseau: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuseau, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
