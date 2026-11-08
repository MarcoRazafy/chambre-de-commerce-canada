import { Onglets } from "@/components/admin/ui";

// Espace membre : « Agenda & rendez-vous » est une seule entrée de menu, avec deux onglets en haut des deux pages
// (dans le back-office, Agenda et Rendez-vous ont chacun leur entrée)
export function OngletsAgenda({ espace, actif }: { espace: "admin" | "membre"; actif: "agenda" | "rdv" }) {
  return (
    <Onglets
      actif={actif}
      onglets={[
        { cle: "agenda", libelle: "Agenda", href: `/${espace}/agenda` },
        { cle: "rdv", libelle: "Rendez-vous", href: `/${espace}/rendez-vous` },
      ]}
    />
  );
}
