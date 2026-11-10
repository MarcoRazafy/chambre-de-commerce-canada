import { notFound } from "next/navigation";

// Agenda et Actualités sont retirés de la plateforme (back-office et espace membre) pour l'instant.
// Pour remettre cette page : supprimer ces lignes jusqu'à « CODE D'ORIGINE », puis retirer les « // »
// au début de chaque ligne du code d'origine (et décommenter les entrées « Agenda » / « Actualités » de lib/nav.ts).
export default function PageRetiree() {
  notFound();
}

// ===== CODE D'ORIGINE =====
// import { redirect } from "next/navigation";
//
// export default function NouvelleActualiteMembre() {
//   redirect("/membre/actualites");
// }
