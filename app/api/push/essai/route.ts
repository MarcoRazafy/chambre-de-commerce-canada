import { NextResponse } from "next/server";
import { minutes, tentative } from "@/lib/limite";
import { notifier, pushActif } from "@/lib/push";
import { utilisateurConnecte } from "@/lib/session";

export async function POST() {
  const personne = await utilisateurConnecte();
  if (!personne) {
    return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });
  }
  if (!pushActif()) {
    return NextResponse.json(
      { erreur: "Les notifications ne sont pas configurées sur le serveur." },
      { status: 503 },
    );
  }
  const attente = tentative(`push-essai:${personne.id}`, 5, 60 * 1000);
  if (attente) {
    return NextResponse.json(
      { erreur: `Trop d’essais : réessayez dans ${minutes(attente)} minute.` },
      { status: 429 },
    );
  }

  await notifier([personne.id], {
    titre: "L’Alliée Virtuelle",
    corps: `Les notifications fonctionnent sur cet appareil, ${personne.nom}.`,
    url: personne.role === "admin" ? "/admin" : "/membre",
    etiquette: "essai",
  });
  return NextResponse.json({ ok: true });
}
