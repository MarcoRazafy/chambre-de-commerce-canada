import type { Metadata } from "next";
import { Headset, MessageSquare } from "lucide-react";
import { Vide } from "@/components/admin/ui";
import { FilSupportGM, MarquerLu, RedactionSupportGM, RelectureAuto } from "@/components/gm/SupportGM";
import { Card, Saillant, ViewHead } from "@/components/ui";
import { ecrireSupportIT, marquerLuSupportITMembre } from "@/lib/actions/support-it-membre";
import { getCurrentUser } from "@/lib/session";
import { supportITMembre } from "@/lib/support-it";

export const metadata: Metadata = { title: "Support IT" };

export default async function SupportIT() {
  const user = await getCurrentUser("membre");
  const { conversation } = await supportITMembre(user.id);
  const messages = conversation?.messages ?? [];

  return (
    <>
      <ViewHead
        title={
          <>
            Support <Saillant>IT</Saillant>
          </>
        }
      />
      <RelectureAuto />

      <Card className="p-0 overflow-hidden flex flex-col h-[calc(100vh-260px)] min-h-[460px] max-w-[880px]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line shrink-0">
          <span className="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center shrink-0">
            <Headset size={19} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold truncate">Support IT</div>
            <div className="text-[12px] text-muted truncate">L’Alliée Virtuelle · problème technique, connexion, paiement en ligne</div>
          </div>
        </div>
        {messages.length ? (
          <FilSupportGM messages={messages} cote="membre" />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#f7f9fc] px-6 text-center">
            <Vide icone={<MessageSquare size={26} />}>Décrivez le problème : l’équipe technique vous répond ici.</Vide>
          </div>
        )}
        <RedactionSupportGM action={ecrireSupportIT} placeholder="Écrire au Support IT…" />
        {conversation?.nonLus ? <MarquerLu repere={messages.at(-1)?.id ?? ""} marquer={marquerLuSupportITMembre} /> : null}
      </Card>
    </>
  );
}
