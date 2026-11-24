import { NextResponse } from "next/server";
import { compteGM } from "@/lib/gm";
import { DecalageImport, EnvoiImportRefuse, MORCEAU_MAX, recevoirMorceau } from "@/lib/import-envois";

export async function POST(requete: Request) {
  const gm = await compteGM();
  if (!gm) return NextResponse.json({ erreur: "Connexion requise." }, { status: 401 });

  const parametres = new URL(requete.url).searchParams;
  const jeton = parametres.get("jeton") || null;
  const decalage = Number(parametres.get("decalage") ?? "0");
  if (!Number.isSafeInteger(decalage) || decalage < 0) {
    return NextResponse.json({ erreur: "Envoi invalide." }, { status: 400 });
  }
  if (Number(requete.headers.get("content-length") ?? 0) > MORCEAU_MAX) {
    return NextResponse.json({ erreur: "Morceau trop gros." }, { status: 413 });
  }
  if (!requete.body) return NextResponse.json({ erreur: "Morceau vide." }, { status: 400 });

  try {
    return NextResponse.json(await recevoirMorceau(gm.id, jeton, decalage, requete.body));
  } catch (e) {
    if (e instanceof DecalageImport) return NextResponse.json({ erreur: e.message, recu: e.recu }, { status: 409 });
    if (e instanceof EnvoiImportRefuse) return NextResponse.json({ erreur: e.message }, { status: 400 });
    throw e;
  }
}
