import { notFound } from "next/navigation";

// Agenda et Actualités sont retirés de la plateforme (back-office et espace membre) pour l'instant.
// Pour remettre cette page : supprimer ces lignes jusqu'à « CODE D'ORIGINE », puis retirer les « // »
// au début de chaque ligne du code d'origine (et décommenter les entrées « Agenda » / « Actualités » de lib/nav.ts).
export default function PageRetiree() {
  notFound();
}

// ===== CODE D'ORIGINE =====
// import Link from "next/link";
// import { ArrowLeft } from "lucide-react";
// import { EnTeteAdmin } from "@/components/admin/ui";
// import { FormulaireActualite } from "@/components/forms/AdminContenuForms";
// import { Saillant } from "@/components/ui";
//
// export default function NouvelleActualite() {
//   return (
//     <>
//       <Link
//         href="/admin/actualites"
//         className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted no-underline hover:text-accent mb-4"
//       >
//         <ArrowLeft size={14} /> Toutes les actualités
//       </Link>
//       <EnTeteAdmin
//         surtitre="Programme"
//         titre={
//           <>
//             Nouvelle <Saillant>actualité</Saillant>
//           </>
//         }
//       />
//       <FormulaireActualite />
//     </>
//   );
// }
