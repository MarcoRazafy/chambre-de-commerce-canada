// La Chambre de la requête en cours : chaque lecture et écriture de la base s'y limite (lib/db.ts).
//  1. celle fixée par avecChambre() : tâches régulières, webhooks, scripts, tests ;
//  2. sinon celle de l'adresse du site (sous-domaine de la plateforme, ou domaine propre d'une Chambre) ;
//     une autre adresse (domaine principal, localhost…) : la Chambre n° 1.
// Un compte n'est reconnu que sur l'adresse de sa Chambre (proxy.ts, lib/session.ts).
// Hors d'une requête et sans avecChambre() : erreur, plutôt qu'une Chambre devinée.
// Pas de « server-only » ici : les scripts (tsx) importent lib/db.
import { AsyncLocalStorage } from "node:async_hooks";
import { lireHote } from "@/lib/hote-chambre";

export const CHAMBRE_PRINCIPALE = "principale";

const fixee = new AsyncLocalStorage<string>();

// Exécute fn dans une Chambre donnée (tout ce qu'elle lance, y compris en différé, y reste).
// Attendu à l'intérieur : une requête Prisma ne part qu'au moment où on l'attend.
export function avecChambre<T>(chambreId: string, fn: () => T | Promise<T>): Promise<T> {
  if (!chambreId) return Promise.reject(new Error("avecChambre : Chambre vide"));
  return fixee.run(chambreId, async () => await fn());
}

// Sous-domaine de la plateforme qui ne correspond à aucune Chambre
export class EspaceIntrouvable extends Error {
  constructor(hote: string) {
    super(`Aucun espace à l'adresse ${hote}`);
  }
}

// Recherche d'une Chambre par son sous-domaine ou son domaine propre, sans limite de Chambre
// (branchée par lib/db.ts, pour éviter un import circulaire)
type Recherche = { slug: string } | { domaine: string };
let chercherChambre: ((r: Recherche) => Promise<string | null>) | null = null;
export function brancherRechercheChambre(f: (r: Recherche) => Promise<string | null>) {
  chercherChambre = f;
}

// Adresse → Chambre, gardé une minute (une page fait des dizaines de lectures)
const parHote = new Map<string, { id: string | null; propre: boolean; jusqua: number }>();
export function oublierAdresses() {
  parHote.clear();
}

// La Chambre d'une adresse ; « propre » : l'adresse est celle de la Chambre (sous-domaine ou domaine propre),
// pas l'adresse générale du site. id null : sous-domaine sans Chambre.
export async function resoudreHote(brut: string | null | undefined): Promise<{ id: string | null; propre: boolean }> {
  const h = lireHote(brut, process.env.DOMAINE_PLATEFORME ?? null, process.env.NODE_ENV !== "production");
  const cle = h.type === "sous-domaine" ? `s:${h.slug}` : `d:${h.hote}`;
  const m = parHote.get(cle);
  if (m && m.jusqua > Date.now()) return m;
  if (!chercherChambre) throw new Error("Recherche des Chambres non branchée (lib/db.ts)");
  let r: { id: string | null; propre: boolean };
  if (h.type === "sous-domaine") r = { id: await chercherChambre({ slug: h.slug }), propre: true };
  else {
    const id = h.hote ? await chercherChambre({ domaine: h.hote }) : null;
    r = id ? { id, propre: true } : { id: CHAMBRE_PRINCIPALE, propre: false };
  }
  if (parHote.size > 1_000) parHote.clear();
  parHote.set(cle, { ...r, jusqua: Date.now() + 60_000 });
  return r;
}

export async function chambreCourante(): Promise<string> {
  const f = fixee.getStore();
  if (f) return f;

  const { headers } = await import("next/headers");
  let entetes: Awaited<ReturnType<typeof headers>>;
  try {
    entetes = await headers();
  } catch (e) {
    // Signal interne de Next (page rendue dynamique, etc.) : on le laisse passer
    const { unstable_rethrow } = await import("next/navigation");
    unstable_rethrow(e);
    throw new Error("Base de données utilisée hors d'une requête : indiquez la Chambre avec avecChambre().", { cause: e });
  }
  const hote = entetes.get("x-forwarded-host") ?? entetes.get("host");
  const { id } = await resoudreHote(hote);
  if (!id) throw new EspaceIntrouvable(hote ?? "");
  return id;
}
