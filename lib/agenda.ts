import { DELAI_REGLEMENT_JOURS, RETARD_BLOCAGE_JOURS } from "@/lib/membership";

export type VueAgenda = "mois" | "semaine" | "liste";

export const VUES_AGENDA: { cle: VueAgenda; libelle: string }[] = [
  { cle: "mois", libelle: "Mois" },
  { cle: "semaine", libelle: "Semaine" },
  { cle: "liste", libelle: "À venir" },
];

export type TypeElement =
  "evenement" | "inscription" | "rendezvous" | "echeance" | "rappel";

export const TYPES_ELEMENT: { cle: TypeElement; libelle: string }[] = [
  { cle: "evenement", libelle: "Événements" },
  { cle: "inscription", libelle: "Mes inscriptions" },
  { cle: "rendezvous", libelle: "Rendez-vous" },
  { cle: "echeance", libelle: "Échéances" },
  { cle: "rappel", libelle: "Rappels" },
];

export type EspaceAgenda = "membre" | "admin";

export const typesElement = (espace: EspaceAgenda) =>
  espace === "admin"
    ? TYPES_ELEMENT.filter((t) => t.cle !== "inscription")
    : TYPES_ELEMENT;

export const espaceDe = (chemin: string): EspaceAgenda =>
  chemin === "/admin" ||
  chemin.startsWith("/admin/") ||
  chemin.startsWith("/admin?")
    ? "admin"
    : "membre";

export interface ElementAgenda {
  id: string;
  type: TypeElement;
  titre: string;
  jour: string;
  debut: string | null;
  fin: string | null;
  lieu?: string | null;
  detail?: string | null;
  href: string | null;
  urgent?: boolean;
  fait?: boolean;
  rappel?: { id: string; note: string | null };
}

export const JOURS_LISTE = 60;

const versDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const versISO = (d: Date) => d.toISOString().slice(0, 10);

export function estJourISO(v: string | null | undefined): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && versISO(versDate(v)) === v;
}

export function ajouterJours(iso: string, n: number): string {
  const d = versDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return versISO(d);
}

export function ecartJours(a: string, b: string): number {
  return Math.round(
    (versDate(b).getTime() - versDate(a).getTime()) / 86_400_000,
  );
}

export const debutMois = (iso: string) => `${iso.slice(0, 7)}-01`;

export function ajouterMois(iso: string, n: number): string {
  const d = versDate(debutMois(iso));
  d.setUTCMonth(d.getUTCMonth() + n);
  return versISO(d);
}

export const finMois = (iso: string) => ajouterJours(ajouterMois(iso, 1), -1);

export const rangSemaine = (iso: string) => (versDate(iso).getUTCDay() + 6) % 7;

export const debutSemaine = (iso: string) =>
  ajouterJours(iso, -rangSemaine(iso));

export function joursSemaine(iso: string): string[] {
  const lundi = debutSemaine(iso);
  return Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i));
}

export function grilleMois(iso: string): string[][] {
  const fin = finMois(iso);
  const semaines: string[][] = [];
  for (let l = debutSemaine(debutMois(iso)); l <= fin; l = ajouterJours(l, 7)) {
    semaines.push(joursSemaine(l));
  }
  return semaines;
}

export function periodeVue(
  vue: VueAgenda,
  iso: string,
): { du: string; au: string } {
  if (vue === "semaine") {
    const lundi = debutSemaine(iso);
    return { du: lundi, au: ajouterJours(lundi, 6) };
  }
  if (vue === "liste")
    return { du: iso, au: ajouterJours(iso, JOURS_LISTE - 1) };
  const grille = grilleMois(iso);
  return { du: grille[0][0], au: grille.at(-1)![6] };
}

export function periodeVoisine(
  vue: VueAgenda,
  iso: string,
  sens: 1 | -1,
): string {
  if (vue === "mois") return ajouterMois(iso, sens);
  if (vue === "semaine") return ajouterJours(debutSemaine(iso), 7 * sens);
  return ajouterJours(iso, JOURS_LISTE * sens);
}

export function fmtJour(
  iso: string,
  opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  },
): string {
  const texte = versDate(iso).toLocaleDateString("fr-FR", {
    ...opts,
    timeZone: "UTC",
  });
  return opts.day && iso.endsWith("-01") && opts.month
    ? texte.replace(/(^|\s)1(?=\s)/, "$11er")
    : texte;
}

const majuscule = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

export function libellePeriode(vue: VueAgenda, iso: string): string {
  if (vue === "mois") {
    return majuscule(fmtJour(iso, { month: "long", year: "numeric" }));
  }
  const { du, au } = periodeVue(vue, iso);
  const memeAnnee = du.slice(0, 4) === au.slice(0, 4);
  const memeMois = du.slice(0, 7) === au.slice(0, 7);
  const debut = memeMois
    ? fmtJour(du, { day: "numeric" })
    : fmtJour(du, {
        day: "numeric",
        month: "short",
        ...(memeAnnee ? {} : { year: "numeric" }),
      });
  const fin = fmtJour(au, { day: "numeric", month: "short", year: "numeric" });
  return vue === "semaine" ? `${debut} – ${fin}` : `Du ${debut} au ${fin}`;
}

export function jourRelatif(iso: string, aujourdhui: string): string {
  const ecart = ecartJours(aujourdhui, iso);
  if (ecart === 0) return "Aujourd’hui";
  if (ecart === 1) return "Demain";
  if (ecart === -1) return "Hier";
  return majuscule(
    fmtJour(iso, {
      weekday: "long",
      day: "numeric",
      month: "long",
      ...(iso.slice(0, 4) === aujourdhui.slice(0, 4)
        ? {}
        : { year: "numeric" }),
    }),
  );
}

export function estHeure(v: string | null | undefined): v is string {
  return !!v && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

export function enMinutes(heure: string): number {
  const [h, m] = heure.split(":").map(Number);
  return h * 60 + m;
}

export const fmtHeure = (heure: string) => heure.replace(":", " h ");

export function plageHoraire(
  debut: string | null | undefined,
  fin: string | null | undefined,
): string | null {
  if (!debut) return null;
  return fin ? `${fmtHeure(debut)} – ${fmtHeure(fin)}` : fmtHeure(debut);
}

export const echeanceFacture = (dateISO: string, delai = DELAI_REGLEMENT_JOURS) =>
  ajouterJours(dateISO, delai);

export function ajouterAns(iso: string, n: number): string {
  const [annee, mois, jour] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(annee + n, mois - 1, jour));
  if (d.getUTCMonth() !== mois - 1) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

export const estFactureCotisation = (objet: string) =>
  /^cotisation/i.test(objet);

export function dernierReglementCotisation(
  factures: { date: string; objet: string; statut: string }[],
): string | null {
  const dates = factures
    .filter((f) => f.statut === "payee" && estFactureCotisation(f.objet))
    .map((f) => f.date)
    .sort();
  return dates.at(-1) ?? null;
}

export function renouvellementCotisation({
  factures,
  adhesion,
  aJour,
}: {
  factures: { date: string; objet: string; statut: string }[];
  adhesion?: string | null;
  aJour: boolean;
}): string | null {
  const dernier = dernierReglementCotisation(factures);
  if (dernier) return ajouterAns(dernier, 1);
  return aJour && adhesion ? ajouterAns(adhesion, 1) : null;
}

export const dateRestriction = (retardDepuis: string, blocage = RETARD_BLOCAGE_JOURS) =>
  ajouterJours(retardDepuis, blocage + 1);

const ORDRE_TYPES: Record<TypeElement, number> = {
  echeance: 0,
  rendezvous: 1,
  inscription: 2,
  evenement: 3,
  rappel: 4,
};

export function trierElements(elements: ElementAgenda[]): ElementAgenda[] {
  return [...elements].sort(
    (a, b) =>
      a.jour.localeCompare(b.jour) ||
      (a.debut ?? "").localeCompare(b.debut ?? "") ||
      ORDRE_TYPES[a.type] - ORDRE_TYPES[b.type] ||
      a.titre.localeCompare(b.titre, "fr"),
  );
}

export function parJour(
  elements: ElementAgenda[],
): Map<string, ElementAgenda[]> {
  const jours = new Map<string, ElementAgenda[]>();
  for (const e of trierElements(elements)) {
    jours.set(e.jour, [...(jours.get(e.jour) ?? []), e]);
  }
  return jours;
}
