import { notFound } from "next/navigation";

// Agenda et Actualités sont retirés de la plateforme (back-office et espace membre) pour l'instant.
// Pour remettre cette page : supprimer ces lignes jusqu'à « CODE D'ORIGINE », puis retirer les « // »
// au début de chaque ligne du code d'origine (et décommenter les entrées « Agenda » / « Actualités » de lib/nav.ts).
export default function PageRetiree() {
  notFound();
}

// ===== CODE D'ORIGINE =====
// import { notFound } from "next/navigation";
// import { EnTeteAdmin } from "@/components/admin/ui";
// import { FormulaireActualite } from "@/components/forms/AdminContenuForms";
// import { Saillant } from "@/components/ui";
// import { getNewsItem } from "@/lib/queries";
//
// export default async function ModifierActualite({
//   params,
// }: {
//   params: Promise<{ id: string }>;
// }) {
//   const { id } = await params;
//   const n = await getNewsItem(id);
//   if (!n) notFound();
//
//   return (
//     <>
//       <EnTeteAdmin
//         surtitre="Programme"
//         titre={
//           <>
//             Modifier <Saillant>l’actualité</Saillant>
//           </>
//         }
//       >
//         {n.titre}
//       </EnTeteAdmin>
//       <FormulaireActualite news={n} />
//     </>
//   );
// }
