import { prisma } from "@/lib/db";
import { servirFichier } from "@/lib/flux";
import { isAccessLocked } from "@/lib/membership";
import { utilisateurConnecte } from "@/lib/session";
import { typeVideo } from "@/lib/video-presentation";
import { cheminVideo } from "@/lib/videos";
import { getDelais } from "@/lib/delais-chambre";

const ENTETES = {
  "Cache-Control": "private, max-age=3600",
  "Content-Disposition": "inline",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

const MORCEAU = 4 * 1024 * 1024;

export async function GET(
  requete: Request,
  { params }: { params: Promise<{ fichier: string }> },
) {
  const { fichier } = await params;
  const chemin = cheminVideo(fichier);
  if (!chemin) return new Response("Vidéo introuvable.", { status: 404 });

  const user = await utilisateurConnecte();
  if (!user || (user.role !== "admin" && user.role !== "membre")) {
    return new Response("Connexion requise.", { status: 401 });
  }

  const [fiche, moi] = await Promise.all([
    prisma.member.findFirst({
      where: { video: fichier },
      select: { id: true },
    }),
    user.role === "membre" && user.memberId
      ? prisma.member.findUnique({
          where: { id: user.memberId },
          select: { id: true, statut: true, retardDepuis: true },
        })
      : null,
  ]);
  if (!fiche) return new Response("Vidéo introuvable.", { status: 404 });

  if (user.role === "membre") {
    const restreint =
      !moi ||
      isAccessLocked({
        blocageJours: (await getDelais()).blocage,
        statut: moi.statut,
        retardDepuis: moi.retardDepuis
          ? moi.retardDepuis.toISOString().slice(0, 10)
          : null,
      } as Parameters<typeof isAccessLocked>[0]);
    if (restreint && moi?.id !== fiche.id) {
      return new Response("Accès réservé aux membres à jour de cotisation.", {
        status: 403,
      });
    }
  }

  try {
    return await servirFichier(
      requete,
      chemin,
      { ...ENTETES, "Content-Type": typeVideo(fichier) },
      MORCEAU,
    );
  } catch {
    return new Response("Vidéo introuvable.", { status: 404 });
  }
}
