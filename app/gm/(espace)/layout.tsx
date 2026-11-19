import type { Metadata } from "next";
import { CoquilleGM } from "@/components/gm/CoquilleGM";
import { exigerGM } from "@/lib/gm";
import { NAV_GM } from "@/lib/nav";
import { nonLusSupportGM } from "@/lib/support-it";

export const metadata: Metadata = { title: { default: "Administrateur", template: "%s · Administrateur" } };

export default async function EspaceGM({ children }: { children: React.ReactNode }) {
  const gm = await exigerGM();
  const nonLus = await nonLusSupportGM();
  return (
    <CoquilleGM gm={{ nom: gm.nom, email: gm.email }} nav={NAV_GM} badges={{ "/gm/messages": nonLus }}>
      {children}
    </CoquilleGM>
  );
}
