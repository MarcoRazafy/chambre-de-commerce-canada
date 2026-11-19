import { Onglets } from "@/components/admin/ui";

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
