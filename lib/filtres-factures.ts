import type { Devise } from "@/lib/membership";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { plat } from "@/lib/texte";

// Une facture à régler est en retard quand elle a été émise il y a plus de DELAI_REGLEMENT_JOURS
export const DELAI_REGLEMENT_JOURS = 30;
export function enRetard(f: Pick<Invoice, "statut" | "date">, aujourdhui = new Date()): boolean {
  if (f.statut !== "envoyee") return false;
  const limite = new Date(aujourdhui.getTime() - DELAI_REGLEMENT_JOURS * 86_400_000).toISOString().slice(0, 10);
  return f.date.slice(0, 10) < limite;
}

// « retard » : les factures à régler dont le délai est dépassé
const retient = (x: Invoice, statut: FiltresFactures["statut"]) =>
  statut === "toutes" || (statut === "retard" ? enRetard(x) : x.statut === statut);

export interface FiltresFactures {
  statut: InvoiceStatus | "toutes" | "retard";
  devise: Devise | null;
  annee: number | null;
  recherche: string;
}

export function lireFiltresFactures(params: {
  statut?: string;
  devise?: string;
  annee?: string;
  q?: string;
}): FiltresFactures {
  const annee = Number(params.annee);
  return {
    statut:
      params.statut === "payee" || params.statut === "envoyee" || params.statut === "retard"
        ? params.statut
        : "toutes",
    devise:
      params.devise === "MGA" || params.devise === "CAD" ? params.devise : null,
    annee: Number.isInteger(annee) && annee > 2000 ? annee : null,
    recherche: params.q?.trim() ?? "",
  };
}

export function filtrerFacturesHorsStatut(
  factures: Invoice[],
  f: FiltresFactures,
): Invoice[] {
  return factures.filter(
    (x) =>
      (!f.devise || x.devise === f.devise) &&
      (!f.annee || x.date.startsWith(String(f.annee))) &&
      (!f.recherche ||
        plat(`${x.numero} ${x.membre} ${x.objet}`).includes(plat(f.recherche))),
  );
}

export function filtrerFactures(
  factures: Invoice[],
  f: FiltresFactures,
): Invoice[] {
  return filtrerFacturesHorsStatut(factures, f).filter((x) => retient(x, f.statut));
}

export function parametresFactures(
  f: FiltresFactures,
  changes: Partial<
    Record<"statut" | "devise" | "annee" | "q", string | null>
  > = {},
): string {
  const p = new URLSearchParams();
  const tout = {
    statut: f.statut === "toutes" ? null : f.statut,
    devise: f.devise,
    annee: f.annee ? String(f.annee) : null,
    q: f.recherche || null,
    ...changes,
  };
  for (const [k, v] of Object.entries(tout))
    if (v && v !== "toutes") p.set(k, v);
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}
