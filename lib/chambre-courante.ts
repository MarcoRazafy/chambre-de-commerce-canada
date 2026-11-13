// La Chambre de la requête en cours : chaque lecture et écriture de la base s'y limite (lib/db.ts).
//  1. celle fixée par avecChambre() : tâches régulières, webhooks, scripts, tests ;
//  2. sur les espaces partagés (dev. pour les équipes, client. pour les membres) : celle du compte connecté (session
//     signée) ; avant d'avoir un compte, celle choisie pour la demande d'adhésion (cookie signé posé par proxy.ts) ;
//  3. sinon celle de l'adresse du site (domaine propre d'une Chambre, ou sous-domaine) ; une autre adresse (domaine
//     principal, adresse IP…) : la Chambre n° 1. Le domaine de la plateforme (et localhost en développement) affiche
//     le site public, sans Chambre.
// Hors d'une requête et sans avecChambre(), ou sur un espace partagé sans session ni Chambre choisie : erreur,
// plutôt qu'une Chambre devinée.
// Pas de « server-only » ici : les scripts (tsx) importent lib/db.
import { AsyncLocalStorage } from "node:async_hooks";
import { lireHote, type EspacePartage } from "@/lib/hote-chambre";
import { compteDeLaSession, lireChambreChoisie, NOM_COOKIE_CHAMBRE_CHOISIE, NOM_COOKIE_SESSION } from "@/lib/signature";

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
type Recherche = { slug: string } | { domaine: string } | { id: string };
// restriction : retard de paiement de l'abonnement au-delà du délai (lecture seule, ou blocage)
// accesDev : la Chambre autorise en ce moment l'Admin GM à entrer (mode développeur)
// fonctions : celles de l'offre de la Chambre (null : toutes)
type Trouvee = { id: string; suspendue: boolean; restriction: "lecture" | "blocage" | null; accesDev: boolean; fonctions: string[] | null } | null;
let chercherChambre: ((r: Recherche) => Promise<Trouvee>) | null = null;
export function brancherRechercheChambre(f: (r: Recherche) => Promise<Trouvee>) {
  chercherChambre = f;
}

// La Chambre d'un compte, sans limite de Chambre (branchée par lib/db.ts)
let chercherCompte: ((userId: string) => Promise<string | null>) | null = null;
export function brancherRechercheCompte(f: (userId: string) => Promise<string | null>) {
  chercherCompte = f;
}

// Adresse → Chambre, gardé 10 secondes (une page fait des dizaines de lectures). Court : le contrôle d'accès
// (proxy.ts) a sa propre mémoire, qu'une action ne peut pas vider ; une suspension, un paiement ou une adresse
// changée y comptent donc au plus 10 secondes après
// partage : l'adresse est un espace partagé (dev. ou client.), la Chambre vient alors du compte connecté
type Resolue = { id: string | null; propre: boolean; partage: EspacePartage | null; suspendue: boolean; restriction: "lecture" | "blocage" | null; accesDev: boolean; fonctions: string[] | null };
const parHote = new Map<string, Resolue & { jusqua: number }>();
export function oublierAdresses() {
  parHote.clear();
}

// La Chambre d'une adresse ; « propre » : l'adresse est celle de la Chambre (sous-domaine ou domaine propre),
// pas l'adresse générale du site ; « suspendue » : l'Admin GM a suspendu son espace. id null : sous-domaine sans
// Chambre (ou l'espace Admin GM).
export async function resoudreHote(brut: string | null | undefined): Promise<Resolue> {
  const h = lireHote(brut, process.env.DOMAINE_PLATEFORME ?? null, process.env.NODE_ENV !== "production");
  const cle = h.type === "gm" || h.type === "plateforme" ? h.type : h.type === "partage" ? `p:${h.espace}` : h.type === "sous-domaine" ? `s:${h.slug}` : `d:${h.hote}`;
  const m = parHote.get(cle);
  if (m && m.jusqua > Date.now()) return m;
  if (!chercherChambre) throw new Error("Recherche des Chambres non branchée (lib/db.ts)");
  let r: Resolue;
  // Espace Admin GM, site public de la plateforme : aucune Chambre
  const etat = (c: Trouvee) => ({ suspendue: c?.suspendue ?? false, restriction: c?.restriction ?? null, accesDev: c?.accesDev ?? false, fonctions: c?.fonctions ?? null });
  const aucune = { suspendue: false, restriction: null, accesDev: false, fonctions: null };
  if (h.type === "gm" || h.type === "plateforme") r = { id: null, propre: true, partage: null, ...aucune };
  else if (h.type === "partage") r = { id: null, propre: true, partage: h.espace, ...aucune };
  else if (h.type === "sous-domaine") {
    const c = await chercherChambre({ slug: h.slug });
    r = { id: c?.id ?? null, propre: true, partage: null, ...etat(c) };
  } else {
    const c = h.hote ? await chercherChambre({ domaine: h.hote }) : null;
    if (c) r = { id: c.id, propre: true, partage: null, ...etat(c) };
    else r = { id: CHAMBRE_PRINCIPALE, propre: false, partage: null, ...etat(await chercherChambre({ id: CHAMBRE_PRINCIPALE })) };
  }
  if (parHote.size > 1_000) parHote.clear();
  parHote.set(cle, { ...r, jusqua: Date.now() + 10_000 });
  return r;
}

// L'état d'une Chambre (suspension, retard, offre, accès de l'administrateur), gardé 10 secondes : pour proxy.ts sur
// les espaces partagés, où la Chambre vient du compte connecté
const parId = new Map<string, Exclude<Trouvee, null> & { jusqua: number }>();
export async function etatChambre(id: string): Promise<Trouvee> {
  const m = parId.get(id);
  if (m && m.jusqua > Date.now()) return m;
  if (!chercherChambre) throw new Error("Recherche des Chambres non branchée (lib/db.ts)");
  const c = await chercherChambre({ id });
  if (c) {
    if (parId.size > 1_000) parId.clear();
    parId.set(id, { ...c, jusqua: Date.now() + 10_000 });
  }
  return c;
}

// Une Chambre ouverte par son identifiant court (slug), sans limite de Chambre : la demande d'adhésion sur client.
export async function chambreDuSlug(slug: string): Promise<string | null> {
  if (!chercherChambre) throw new Error("Recherche des Chambres non branchée (lib/db.ts)");
  const c = await chercherChambre({ slug });
  return c && !c.suspendue ? c.id : null;
}

// La Chambre du compte d'une session signée, gardée 10 secondes (une page fait des dizaines de lectures)
const parCompte = new Map<string, { chambreId: string | null; jusqua: number }>();
async function chambreDuCompte(userId: string): Promise<string | null> {
  const m = parCompte.get(userId);
  if (m && m.jusqua > Date.now()) return m.chambreId;
  if (!chercherCompte) throw new Error("Recherche des comptes non branchée (lib/db.ts)");
  const chambreId = await chercherCompte(userId);
  if (parCompte.size > 5_000) parCompte.clear();
  parCompte.set(userId, { chambreId, jusqua: Date.now() + 10_000 });
  return chambreId;
}

async function lireRequete() {
  const { cookies, headers } = await import("next/headers");
  try {
    return { entetes: await headers(), biscuits: await cookies() };
  } catch (e) {
    // Signal interne de Next (page rendue dynamique, etc.) : on le laisse passer
    const { unstable_rethrow } = await import("next/navigation");
    unstable_rethrow(e);
    throw new Error("Base de données utilisée hors d'une requête : indiquez la Chambre avec avecChambre().", { cause: e });
  }
}

// L'adresse de la requête : espace partagé (dev., client.) ou Chambre de l'adresse ; pour les pages et actions qui
// doivent savoir où elles sont (connexion, entrée par jeton)
export async function hoteActuel(): Promise<{ partage: EspacePartage | null; chambreId: string | null }> {
  const { entetes } = await lireRequete();
  const r = await resoudreHote(entetes.get("x-forwarded-host") ?? entetes.get("host"));
  return { partage: r.partage, chambreId: r.id };
}

export async function chambreCourante(): Promise<string> {
  const f = fixee.getStore();
  if (f) return f;

  const { entetes, biscuits } = await lireRequete();
  const hote = entetes.get("x-forwarded-host") ?? entetes.get("host");
  const r = await resoudreHote(hote);
  if (r.id) return r.id;
  if (r.partage) {
    // Le compte connecté (session signée) ; sinon la Chambre choisie pour une demande d'adhésion (cookie signé)
    const compte = compteDeLaSession(biscuits.get(NOM_COOKIE_SESSION)?.value);
    const parSession = compte ? await chambreDuCompte(compte) : null;
    if (parSession) return parSession;
    if (!compte) {
      const choisie = lireChambreChoisie(biscuits.get(NOM_COOKIE_CHAMBRE_CHOISIE)?.value);
      if (choisie) return choisie;
    }
  }
  throw new EspaceIntrouvable(hote ?? "");
}

// Comme chambreCourante, mais null quand l'adresse n'en donne aucune (espace partagé sans session : page de connexion)
export async function chambreCouranteOuRien(): Promise<string | null> {
  try {
    return await chambreCourante();
  } catch (e) {
    if (e instanceof EspaceIntrouvable) return null;
    throw e;
  }
}
