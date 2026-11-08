import { Onglets } from "@/components/admin/ui";

// « Agenda & rendez-vous » : une seule entrée de menu, deux onglets en haut des deux pages
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
