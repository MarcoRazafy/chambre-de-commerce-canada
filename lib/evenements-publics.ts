import "server-only";

import { adresseOuSite } from "@/lib/adresse-chambre";
import { avecChambre, chambreDuSlug } from "@/lib/chambre-courante";
import { prisma, prismaSysteme } from "@/lib/db";
import { EVENT_FORMAT_LABEL } from "@/lib/enums";
import { getProfilChambre } from "@/lib/profil-chambre";
import { estTermine } from "@/lib/presences";
import { compteStripeActif } from "@/lib/encaissement-stripe";
import type { ProfilChambre } from "@/lib/profil-chambre-defauts";
import type { CouleursPage } from "@/lib/couleurs-evenement";
import { cadreVisible, type CadreLogo } from "@/lib/cadre-logo";
import { couleur } from "@/lib/couleurs";

const CHAMPS = { id: true, titre: true, date: true, lieu: true, format: true, desc: true, photo: true, debut: true, fin: true, payant: true, prixPublic: true, pourQui: true, couleurHaut: true, couleurPied: true, couleurPied2: true } as const;

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
  couleurHaut: string | null;
  couleurPied: string | null;
  couleurPied2: string | null;
};

export const couleursEvenement = (e: Pick<EvenementPublic, "couleurHaut" | "couleurPied" | "couleurPied2">): CouleursPage => ({ haut: e.couleurHaut, pied: e.couleurPied, pied2: e.couleurPied2 });

export async function couleursChambre(): Promise<CouleursPage> {
  const p = await prisma.profilChambre.findFirst({ select: { couleurHaut: true, couleurLaterale: true, couleurLaterale2: true } });
  return { haut: couleur(p?.couleurHaut), pied: couleur(p?.couleurLaterale), pied2: couleur(p?.couleurLaterale2) };
}

const versPublic = (e: { format: keyof typeof EVENT_FORMAT_LABEL } & Omit<EvenementPublic, "format">): EvenementPublic => ({ ...e, format: EVENT_FORMAT_LABEL[e.format] });

export async function pagePublique(slug: string): Promise<{ chambreId: string; slug: string; profil: ProfilChambre; cadreLogo: CadreLogo | null; couleurs: CouleursPage; aVenir: EvenementPublic[]; passes: EvenementPublic[] } | null> {
  const s = slug.trim().toLowerCase();
  if (!/^[a-z0-9-]{1,63}$/.test(s)) return null;
  const chambreId = await chambreDuSlug(s);
  if (!chambreId) return null;
  return avecChambre(chambreId, async () => {
    const debutJour = new Date(new Date().toISOString().slice(0, 10));
    const [profil, couleurs, aVenir, passes] = await Promise.all([
      getProfilChambre(),
      couleursChambre(),
      prisma.event.findMany({ where: { public: true, date: { gte: debutJour } }, orderBy: { date: "asc" }, select: CHAMPS }),
      prisma.event.findMany({ where: { public: true, date: { lt: debutJour } }, orderBy: { date: "desc" }, take: 9, select: CHAMPS }),
    ]);
    return { chambreId, slug: s, profil, cadreLogo: await cadreVisible(profil.logo), couleurs, aVenir: aVenir.map(versPublic), passes: passes.map(versPublic) };
  });
}

export async function evenementPublic(chambreId: string, id: string): Promise<EvenementPublic | null> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
  const e = await avecChambre(chambreId, () => prisma.event.findFirst({ where: { id, public: true }, select: CHAMPS }));
  return e ? versPublic(e) : null;
}

export async function lienPagePublique(chambreId: string): Promise<string | null> {
  const c = await prismaSysteme.chambre.findUnique({ where: { id: chambreId }, select: { slug: true } });
  const base = c ? await adresseOuSite(chambreId, "client") : null;
  return base && c ? `${base}/c/${c.slug}/evenements` : null;
}

export async function ouvertureInscription(chambreId: string, id: string): Promise<{ restantes: number; termine: boolean; enLigne: boolean }> {
  return avecChambre(chambreId, async () => {
    const e = await prisma.event.findFirst({
      where: { id, public: true },
      select: { cap: true, date: true, fin: true, prixPublic: true, _count: { select: { participants: true } } },
    });
    if (!e) return { restantes: 0, termine: true, enLigne: false };
    return {
      restantes: Math.max(0, e.cap - e._count.participants),
      termine: estTermine(e),
      enLigne: e.prixPublic > 0 && Boolean(await compteStripeActif()),
    };
  });
}

export const dateLongue = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
