import "server-only";

// Page publique des événements d'une Chambre, générée automatiquement : /c/<identifiant>/evenements (sur l'espace des
// membres, client.…). Seulement les événements ouverts au public ; en tête le logo de « Mon entreprise », en pied son
// nom et ses coordonnées. Sans session : chaque lecture se fait dans la Chambre de l'adresse (avecChambre).
import { adresseOuSite } from "@/lib/adresse-chambre";
import { avecChambre, chambreDuSlug } from "@/lib/chambre-courante";
import { prisma, prismaSysteme } from "@/lib/db";
import { EVENT_FORMAT_LABEL } from "@/lib/enums";
import { getProfilChambre } from "@/lib/profil-chambre";
import type { ProfilChambre } from "@/lib/profil-chambre-defauts";

const CHAMPS = { id: true, titre: true, date: true, lieu: true, format: true, desc: true, photo: true, debut: true, fin: true, payant: true, prixPublic: true, pourQui: true } as const;

export type EvenementPublic = {
  id: string;
  titre: string;
  date: Date;
  lieu: string;
  format: string;
  desc: string;
  photo: string | null;
  debut: string | null;
  fin: string | null;
  payant: boolean;
  prixPublic: number;
  pourQui: string | null;
};

const versPublic = (e: { format: keyof typeof EVENT_FORMAT_LABEL } & Omit<EvenementPublic, "format">): EvenementPublic => ({ ...e, format: EVENT_FORMAT_LABEL[e.format] });

// La Chambre d'un identifiant (active), son profil et ses événements publics, à venir puis passés
export async function pagePublique(slug: string): Promise<{ chambreId: string; slug: string; profil: ProfilChambre; aVenir: EvenementPublic[]; passes: EvenementPublic[] } | null> {
  const s = slug.trim().toLowerCase();
  if (!/^[a-z0-9-]{1,63}$/.test(s)) return null;
  const chambreId = await chambreDuSlug(s);
  if (!chambreId) return null;
  return avecChambre(chambreId, async () => {
    const debutJour = new Date(new Date().toISOString().slice(0, 10));
    const [profil, aVenir, passes] = await Promise.all([
      getProfilChambre(),
      prisma.event.findMany({ where: { public: true, date: { gte: debutJour } }, orderBy: { date: "asc" }, select: CHAMPS }),
      prisma.event.findMany({ where: { public: true, date: { lt: debutJour } }, orderBy: { date: "desc" }, take: 9, select: CHAMPS }),
    ]);
    return { chambreId, slug: s, profil, aVenir: aVenir.map(versPublic), passes: passes.map(versPublic) };
  });
}

// Un événement public de cette Chambre (null s'il n'existe pas, ou n'est pas ouvert au public)
export async function evenementPublic(chambreId: string, id: string): Promise<EvenementPublic | null> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
  const e = await avecChambre(chambreId, () => prisma.event.findFirst({ where: { id, public: true }, select: CHAMPS }));
  return e ? versPublic(e) : null;
}

// L'adresse de la page publique des événements d'une Chambre (à partager)
export async function lienPagePublique(chambreId: string): Promise<string | null> {
  const c = await prismaSysteme.chambre.findUnique({ where: { id: chambreId }, select: { slug: true } });
  const base = c ? await adresseOuSite(chambreId, "client") : null;
  return base && c ? `${base}/c/${c.slug}/evenements` : null;
}

// « 26 octobre 2026 »
export const dateLongue = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
