import { AsyncLocalStorage } from "node:async_hooks";
import { lireHote, type EspacePartage } from "@/lib/hote-chambre";
import { compteDeLaSession, lireChambreChoisie, NOM_COOKIE_CHAMBRE_CHOISIE, NOM_COOKIE_SESSION } from "@/lib/signature";

export const CHAMBRE_PRINCIPALE = "principale";

const fixee = new AsyncLocalStorage<string>();

export function avecChambre<T>(chambreId: string, fn: () => T | Promise<T>): Promise<T> {
  if (!chambreId) return Promise.reject(new Error("avecChambre : Chambre vide"));
  return fixee.run(chambreId, async () => await fn());
}

export class EspaceIntrouvable extends Error {
  constructor(hote: string) {
    super(`Aucun espace à l'adresse ${hote}`);
  }
}

type Recherche = { slug: string } | { domaine: string } | { id: string };
type Trouvee = { id: string; suspendue: boolean; restriction: "lecture" | "blocage" | null; accesDev: boolean; fonctions: string[] | null; paiementAttendu: boolean } | null;
let chercherChambre: ((r: Recherche) => Promise<Trouvee>) | null = null;
export function brancherRechercheChambre(f: (r: Recherche) => Promise<Trouvee>) {
  chercherChambre = f;
}

let chercherCompte: ((userId: string) => Promise<string | null>) | null = null;
export function brancherRechercheCompte(f: (userId: string) => Promise<string | null>) {
  chercherCompte = f;
}

type Resolue = { id: string | null; propre: boolean; partage: EspacePartage | null; suspendue: boolean; restriction: "lecture" | "blocage" | null; accesDev: boolean; fonctions: string[] | null; paiementAttendu: boolean };
const parHote = new Map<string, Resolue & { jusqua: number }>();
export function oublierAdresses() {
  parHote.clear();
}

export async function resoudreHote(brut: string | null | undefined): Promise<Resolue> {
  const h = lireHote(brut, process.env.DOMAINE_PLATEFORME ?? null, process.env.NODE_ENV !== "production");
  const cle = h.type === "gm" || h.type === "plateforme" ? h.type : h.type === "partage" ? `p:${h.espace}` : h.type === "sous-domaine" ? `s:${h.slug}` : `d:${h.hote}`;
  const m = parHote.get(cle);
  if (m && m.jusqua > Date.now()) return m;
  if (!chercherChambre) throw new Error("Recherche des Chambres non branchée (lib/db.ts)");
  let r: Resolue;
  const etat = (c: Trouvee) => ({ suspendue: c?.suspendue ?? false, restriction: c?.restriction ?? null, accesDev: c?.accesDev ?? false, fonctions: c?.fonctions ?? null, paiementAttendu: c?.paiementAttendu ?? false });
  const aucune = { suspendue: false, restriction: null, accesDev: false, fonctions: null, paiementAttendu: false };
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

export async function chambreDuSlug(slug: string): Promise<string | null> {
  if (!chercherChambre) throw new Error("Recherche des Chambres non branchée (lib/db.ts)");
  const c = await chercherChambre({ slug });
  return c && !c.suspendue ? c.id : null;
}

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
    const { unstable_rethrow } = await import("next/navigation");
    unstable_rethrow(e);
    throw new Error("Base de données utilisée hors d'une requête : indiquez la Chambre avec avecChambre().", { cause: e });
  }
}

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

export async function chambreCouranteOuRien(): Promise<string | null> {
  try {
    return await chambreCourante();
  } catch (e) {
    if (e instanceof EspaceIntrouvable) return null;
    throw e;
  }
}
