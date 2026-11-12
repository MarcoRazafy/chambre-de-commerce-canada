// La Chambre de la requête en cours : chaque lecture et écriture de la base s'y limite (lib/db.ts).
//  1. celle fixée par avecChambre() : tâches régulières, webhooks, scripts, tests ;
//  2. sinon celle du compte connecté (cookie de session) ;
//  3. sans compte connecté : la Chambre n° 1 (l'étape « sous-domaines » la tirera de l'adresse du site).
// Hors d'une requête et sans avecChambre() : erreur, plutôt qu'une Chambre devinée.
// Pas de « server-only » ici : les scripts (tsx) importent lib/db.
import { AsyncLocalStorage } from "node:async_hooks";

export const CHAMBRE_PRINCIPALE = "principale";

const fixee = new AsyncLocalStorage<string>();

// Exécute fn dans une Chambre donnée (tout ce qu'elle lance, y compris en différé, y reste).
// Attendu à l'intérieur : une requête Prisma ne part qu'au moment où on l'attend.
export function avecChambre<T>(chambreId: string, fn: () => T | Promise<T>): Promise<T> {
  if (!chambreId) return Promise.reject(new Error("avecChambre : Chambre vide"));
  return fixee.run(chambreId, async () => await fn());
}

// La Chambre d'un compte, lue sans limite de Chambre (branchée par lib/db.ts, pour éviter un import circulaire)
let chambreDuCompte: ((userId: string) => Promise<string | null>) | null = null;
export function brancherChambreDuCompte(f: (userId: string) => Promise<string | null>) {
  chambreDuCompte = f;
}

// Jeton de session → Chambre, gardé une minute (une requête fait des dizaines de lectures)
const parJeton = new Map<string, { chambreId: string; jusqua: number }>();

export async function chambreCourante(): Promise<string> {
  const f = fixee.getStore();
  if (f) return f;

  const { cookies } = await import("next/headers");
  let magasin: Awaited<ReturnType<typeof cookies>>;
  try {
    magasin = await cookies();
  } catch (e) {
    // Signal interne de Next (page rendue dynamique, etc.) : on le laisse passer
    const { unstable_rethrow } = await import("next/navigation");
    unstable_rethrow(e);
    throw new Error("Base de données utilisée hors d'une requête : indiquez la Chambre avec avecChambre().", { cause: e });
  }

  const { lireSession, NOM_COOKIE } = await import("@/lib/auth");
  const jeton = magasin.get(NOM_COOKIE)?.value;
  if (!jeton) return CHAMBRE_PRINCIPALE;

  const m = parJeton.get(jeton);
  if (m && m.jusqua > Date.now()) return m.chambreId;

  const session = lireSession(jeton);
  if (!session || !chambreDuCompte) return CHAMBRE_PRINCIPALE;
  const chambreId = (await chambreDuCompte(session.userId)) ?? CHAMBRE_PRINCIPALE;
  if (parJeton.size > 5_000) parJeton.clear();
  parJeton.set(jeton, { chambreId, jusqua: Date.now() + 60_000 });
  return chambreId;
}
