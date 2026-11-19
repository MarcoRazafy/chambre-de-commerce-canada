import "server-only";

import { randomUUID, timingSafeEqual } from "node:crypto";
import { prismaSysteme } from "@/lib/db";
import { verifier } from "@/lib/mots-de-passe";
import { signer } from "@/lib/signature";

export type CompteChambre = {
  id: string;
  chambreId: string;
  role: "visiteur" | "membre" | "admin";
  chambre: string;
  logo: string | null;
  logoFond: string | null;
};

const CHOIX = "choix-compte";
const DUREE_CHOIX = 10 * 60 * 1000;

const ouvert = (c: { role: string; member: { statut: string } | null }) =>
  c.role !== "visiteur" && !(c.role === "membre" && (c.member?.statut === "candidature" || c.member?.statut === "refusee"));

const CHAMPS = {
  id: true,
  role: true,
  chambreId: true,
  motDePasse: true,
  personne: true,
  member: { select: { statut: true } },
  chambre: { select: { nom: true, statut: true, profil: { select: { nom: true, logo: true, logoFond: true } } } },
} as const;

type Ligne = {
  id: string;
  role: "visiteur" | "membre" | "admin";
  chambreId: string;
  motDePasse: string | null;
  personne: string | null;
  member: { statut: string } | null;
  chambre: { nom: string; statut: string; profil: { nom: string; logo: string | null; logoFond: string | null } | null };
};

function enCompte(l: Ligne): CompteChambre {
  return {
    id: l.id,
    chambreId: l.chambreId,
    role: l.role,
    chambre: l.chambre.profil?.nom?.trim() || l.chambre.nom,
    logo: l.chambre.profil?.logo?.trim() || null,
    logoFond: l.chambre.profil?.logoFond ?? null,
  };
}

export function comptesDeLAdresse(email: string): Promise<Ligne[]> {
  return prismaSysteme.user.findMany({ where: { email }, select: CHAMPS, orderBy: { createdAt: "asc" } }) as Promise<Ligne[]>;
}

export function comptesDuMotDePasse(comptes: Ligne[], motDePasse: string): Ligne[] {
  return comptes.filter((c) => verifier(motDePasse, c.motDePasse));
}

export const comptesOuverts = (comptes: Ligne[]) => comptes.filter((c) => ouvert(c) && c.chambre.statut === "active");

export async function lierComptes(ids: string[]): Promise<void> {
  if (ids.length < 2) return;
  const lignes = await prismaSysteme.user.findMany({ where: { id: { in: ids } }, select: { personne: true } });
  const anciennes = [...new Set(lignes.map((l) => l.personne).filter((p): p is string => !!p))];
  const personne = anciennes[0] ?? randomUUID();
  await prismaSysteme.user.updateMany({
    where: { OR: [{ id: { in: ids } }, ...(anciennes.length ? [{ personne: { in: anciennes } }] : [])] },
    data: { personne },
  });
}

export async function comptesLies(userId: string): Promise<{ actuelle: CompteChambre; autres: CompteChambre[] } | null> {
  const moi = (await prismaSysteme.user.findUnique({ where: { id: userId }, select: { ...CHAMPS, email: true } })) as (Ligne & { email: string }) | null;
  if (!moi) return null;
  const autres = moi.personne
    ? comptesOuverts(
        (await prismaSysteme.user.findMany({
          where: { personne: moi.personne, email: moi.email, id: { not: moi.id } },
          select: CHAMPS,
          orderBy: { createdAt: "asc" },
        })) as Ligne[],
      )
    : [];
  return { actuelle: enCompte(moi), autres: autres.map(enCompte) };
}

export function scellerChoix(ids: string[]): string {
  const charge = `${ids.join(",")}.${Date.now() + DUREE_CHOIX}`;
  return `${charge}.${signer(charge, CHOIX)}`;
}

export function lireChoix(jeton: string | null | undefined): string[] | null {
  if (!jeton || jeton.length > 2000) return null;
  const i = jeton.lastIndexOf(".");
  if (i < 0) return null;
  const charge = jeton.slice(0, i);
  const attendu = signer(charge, CHOIX);
  const recu = jeton.slice(i + 1);
  if (recu.length !== attendu.length || !timingSafeEqual(Buffer.from(recu), Buffer.from(attendu))) return null;
  const [liste, expire] = charge.split(".");
  if (!liste || !(Number(expire) > Date.now())) return null;
  return liste.split(",").filter(Boolean);
}

export async function comptesDuChoix(jeton: string | null | undefined): Promise<CompteChambre[]> {
  const ids = lireChoix(jeton);
  if (!ids?.length) return [];
  const lignes = (await prismaSysteme.user.findMany({ where: { id: { in: ids } }, select: CHAMPS, orderBy: { createdAt: "asc" } })) as Ligne[];
  return comptesOuverts(lignes).map(enCompte);
}

export async function lierParMotDePasse(email: string, motDePasse: string): Promise<void> {
  await lierComptes(comptesDuMotDePasse(await comptesDeLAdresse(email), motDePasse).map((c) => c.id));
}
