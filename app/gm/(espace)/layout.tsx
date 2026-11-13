import type { Metadata } from "next";
import { CoquilleGM } from "@/components/gm/CoquilleGM";
import { exigerGM } from "@/lib/gm";
import { NAV_GM } from "@/lib/nav";

export const metadata: Metadata = { title: { default: "Admin GM", template: "%s · Admin GM" } };

// Espace de l'Admin GM : les Chambres clientes de la plateforme et les offres
export default async function EspaceGM({ children }: { children: React.ReactNode }) {
  const gm = await exigerGM();
  return (
    <CoquilleGM gm={{ nom: gm.nom, email: gm.email }} nav={NAV_GM}>
      {children}
    </CoquilleGM>
  );
}
