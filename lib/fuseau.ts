export const FUSEAUX = [
  { cle: "America/St_Johns", libelle: "Terre-Neuve (St. John’s)", heure: "heure de Terre-Neuve" },
  { cle: "America/Halifax", libelle: "Atlantique (Halifax, Moncton)", heure: "heure de l’Atlantique" },
  { cle: "America/Toronto", libelle: "Est (Montréal, Québec, Toronto)", heure: "heure de l’Est (Montréal)" },
  { cle: "America/Winnipeg", libelle: "Centre (Winnipeg, Regina)", heure: "heure du Centre" },
  { cle: "America/Edmonton", libelle: "Rocheuses (Edmonton, Calgary)", heure: "heure des Rocheuses" },
  { cle: "America/Vancouver", libelle: "Pacifique (Vancouver)", heure: "heure du Pacifique" },
  { cle: "Indian/Antananarivo", libelle: "Madagascar (Antananarivo)", heure: "heure de Madagascar" },
  { cle: "Europe/Paris", libelle: "Europe centrale (Paris)", heure: "heure de Paris" },
] as const;

export const FUSEAU_CANCHAM = "Indian/Antananarivo";
export const FUSEAU_PAR_DEFAUT = "America/Toronto";

export const fuseauConnu = (v: string) => FUSEAUX.some((f) => f.cle === v);

export function jourDans(date: Date, fuseau: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuseau, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export const mentionFuseau = (fuseau: string) => FUSEAUX.find((f) => f.cle === fuseau)?.heure ?? "heure locale";

function partiesDans(t: number, fuseau: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: fuseau, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(new Date(t))
      .map((x) => [x.type, x.value]),
  );
  return p as Record<"year" | "month" | "day" | "hour" | "minute" | "second", string>;
}

const decalage = (t: number, fuseau: string) => {
  const p = partiesDans(t, fuseau);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(t / 1000) * 1000;
};

export function instantDans(jour: string, heure: string, fuseau: string): number {
  const [a, m, j] = jour.split("-").map(Number);
  const [h, mi] = heure.split(":").map(Number);
  const naif = Date.UTC(a, m - 1, j, h, mi);
  if ([a, m, j, h, mi].some((n) => Number.isNaN(n))) return Number.NaN;
  const premier = naif - decalage(naif, fuseau);
  return naif - decalage(premier, fuseau);
}

export function saisieDans(t: number, fuseau: string): string {
  const p = partiesDans(t, fuseau);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
