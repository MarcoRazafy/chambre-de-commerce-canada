import type { FormuleId } from "@/lib/membership";
import type { Member, MemberStatus } from "@/lib/types";
import { plat } from "@/lib/texte";

export const STATUTS_FILTRE: { cle: MemberStatus | "tous"; libelle: string }[] =
  [
    { cle: "tous", libelle: "Tous" },
    { cle: "a_jour", libelle: "À jour" },
    { cle: "en_retard", libelle: "En retard" },
    { cle: "en_attente", libelle: "Paiement attendu" },
    { cle: "candidature", libelle: "Demandes" },
    { cle: "refusee", libelle: "Refusées" },
  ];

// Les demandes (et celles refusées) ne sont pas encore des membres : « Tous » ne les compte pas
const PAS_ENCORE_MEMBRE: MemberStatus[] = ["candidature", "refusee"];

export function dansOnglet(
  statut: MemberStatus,
  onglet: MemberStatus | "tous",
): boolean {
  return onglet === "tous"
    ? !PAS_ENCORE_MEMBRE.includes(statut)
    : statut === onglet;
}

export interface FiltresMembres {
  statut: MemberStatus | "tous";
  recherche: string;
  formule: FormuleId | null;
}

export function lireFiltres(params: {
  statut?: string;
  tab?: string;
  q?: string;
  formule?: string;
}): FiltresMembres {
  const demande = params.statut ?? params.tab ?? "tous";
  return {
    statut: (STATUTS_FILTRE.some((s) => s.cle === demande)
      ? demande
      : "tous") as FiltresMembres["statut"],
    recherche: params.q?.trim() ?? "",
    // Identifiant d'une formule de la Chambre (une valeur inconnue ne retient simplement aucun membre)
    formule: params.formule?.trim().slice(0, 64) || null,
  };
}

export function filtrerHorsStatut(membres: Member[], f: FiltresMembres) {
  return membres.filter(
    (m) =>
      (!f.formule || m.formule?.id === f.formule) &&
      (!f.recherche ||
        plat(`${m.nom} ${m.secteur} ${m.ville} ${m.pays ?? ""}`).includes(
          plat(f.recherche),
        )),
  );
}

export function filtrerMembres(membres: Member[], f: FiltresMembres) {
  return filtrerHorsStatut(membres, f).filter((m) =>
    dansOnglet(m.statut, f.statut),
  );
}

export function parametresFiltres(
  f: FiltresMembres,
  changes: Partial<Record<"statut" | "q" | "formule", string | null>> = {},
): string {
  const p = new URLSearchParams();
  const tout = {
    statut: f.statut === "tous" ? null : f.statut,
    q: f.recherche || null,
    formule: f.formule,
    ...changes,
  };
  for (const [k, v] of Object.entries(tout)) if (v && v !== "tous") p.set(k, v);
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}
