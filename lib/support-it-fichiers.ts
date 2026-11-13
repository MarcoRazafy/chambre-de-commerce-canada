import "server-only";

import { servirFichier } from "@/lib/flux";
import { cheminPiece, mimePiece } from "@/lib/stockage-messagerie";
import { existe } from "@/lib/stockage-ressources";

// Envoie une pièce jointe du Support IT (affichée, ou enregistrée avec ?telecharger)
export async function servirPieceSupportIT(requete: Request, piece: { nom: string; fichier: string } | null): Promise<Response> {
  if (!piece) return new Response("Pièce jointe introuvable.", { status: 404 });
  const chemin = cheminPiece(piece.fichier);
  if (!(await existe(chemin))) return new Response("Pièce jointe introuvable.", { status: 404 });
  const telecharger = new URL(requete.url).searchParams.has("telecharger");
  return servirFichier(requete, chemin, {
    "Content-Type": mimePiece(piece.fichier),
    "Content-Disposition": `${telecharger ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(piece.nom)}`,
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
  });
}
