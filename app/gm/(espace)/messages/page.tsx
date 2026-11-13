import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, ExternalLink, MessageSquare } from "lucide-react";
import { EnTeteAdmin, Vide } from "@/components/admin/ui";
import { INPUT } from "@/components/champ-style";
import { FilSupportGM, MarquerLu, RedactionSupportGM, RelectureAuto } from "@/components/gm/SupportGM";
import { Card, Saillant } from "@/components/ui";
import { chambresSupportGM, conversationGM, filsSupportGM } from "@/lib/support-it";

export const metadata: Metadata = { title: "Messages" };

const initiales = (nom: string) =>
  nom.split(/\s+/).filter(Boolean).map((m) => m[0]).slice(0, 2).join("").toUpperCase() || "?";

const quand = (iso: string) => {
  const d = new Date(iso);
  const aujourdhui = new Date().toDateString() === d.toDateString();
  return aujourdhui
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

// Support IT : les conversations avec les Chambres (leurs équipes écrivent depuis la bulle de l'espace admin)
export default async function MessagesGM({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const [fils, chambres, conversation] = await Promise.all([filsSupportGM(), chambresSupportGM(), c ? conversationGM(c) : null]);
  const sansConversation = chambres.filter((ch) => !fils.some((f) => f.chambreId === ch.id));

  return (
    <>
      <EnTeteAdmin surtitre="Admin GM" titre={<Saillant>Messages</Saillant>} />
      <RelectureAuto />

      <div className="grid lg:grid-cols-[340px_minmax(0,1fr)] gap-5 items-start">
        <Card className={`p-0 overflow-hidden ${conversation ? "hidden lg:block" : ""}`}>
          <div className="px-4 pt-4 pb-3 border-b border-line">
            <h2 className="text-[16px] m-0 mb-3">Conversations</h2>
            {sansConversation.length ? (
              <form action="/gm/messages" className="flex gap-2">
                <select name="c" required defaultValue="" aria-label="Nouvelle conversation avec une Chambre" className={`${INPUT} min-w-0 flex-1`}>
                  <option value="" disabled>
                    Nouvelle conversation…
                  </option>
                  {sansConversation.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.nom}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn-contour btn-contour-sm text-ink hover:bg-surface-2 shrink-0">
                  Ouvrir
                </button>
              </form>
            ) : null}
          </div>

          {fils.length ? (
            <ul className="m-0 p-0 list-none max-h-[calc(100vh-300px)] overflow-y-auto">
              {fils.map((f) => {
                const actif = f.chambreId === conversation?.id;
                return (
                  <li key={f.chambreId} className="border-b border-line last:border-b-0">
                    <Link
                      href={`/gm/messages?c=${encodeURIComponent(f.chambreId)}`}
                      aria-current={actif ? "page" : undefined}
                      className={`flex gap-3 px-4 py-3 no-underline text-ink transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy ${
                        actif ? "bg-accent-soft" : "hover:bg-surface-2"
                      }`}
                    >
                      <span
                        aria-hidden
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold bg-navy-soft text-navy"
                      >
                        {initiales(f.nom)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-baseline gap-2">
                          <span className={`flex-1 min-w-0 truncate text-[14px] ${f.nonLus ? "font-bold" : "font-semibold"}`}>{f.nom}</span>
                          <span className="text-[11px] text-faint shrink-0 tabular-nums">{quand(f.le)}</span>
                        </span>
                        <span className="flex items-center gap-2 mt-0.5">
                          <span className={`flex-1 min-w-0 truncate text-[12.5px] ${f.nonLus ? "text-ink font-medium" : "text-muted"}`}>
                            {f.apercu}
                          </span>
                          {f.nonLus ? (
                            <span
                              aria-label={`${f.nonLus} non lu${f.nonLus > 1 ? "s" : ""}`}
                              className="text-[10.5px] font-bold min-w-[20px] h-[20px] px-1.5 rounded-full bg-accent text-white flex items-center justify-center shrink-0"
                            >
                              {f.nonLus}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Vide icone={<MessageSquare size={26} />}>Aucune conversation pour l’instant.</Vide>
          )}
        </Card>

        {conversation ? (
          <Card className="p-0 overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[480px]">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-line shrink-0">
              <Link
                href="/gm/messages"
                aria-label="Retour aux conversations"
                className="lg:hidden w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface-2"
              >
                <ArrowLeft size={18} aria-hidden />
              </Link>
              <span aria-hidden className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold bg-navy-soft text-navy">
                {initiales(conversation.nom)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold truncate">{conversation.nom}</div>
                <div className="text-[12px] text-muted truncate">{conversation.slug}</div>
              </div>
              <Link
                href={`/gm/chambres/${encodeURIComponent(conversation.id)}`}
                className="btn-contour btn-contour-sm text-ink hover:bg-surface-2 shrink-0 inline-flex items-center gap-1.5 no-underline"
              >
                <Building2 size={14} aria-hidden /> Fiche
                <ExternalLink size={12} className="text-faint" aria-hidden />
              </Link>
            </div>
            {conversation.messages.length ? (
              <FilSupportGM messages={conversation.messages} />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-[#f7f9fc]">
                <Vide icone={<MessageSquare size={26} />}>Aucun message avec cette Chambre.</Vide>
              </div>
            )}
            <RedactionSupportGM key={conversation.id} chambreId={conversation.id} />
            {conversation.nonLus ? <MarquerLu chambreId={conversation.id} repere={conversation.messages.at(-1)?.id ?? ""} /> : null}
          </Card>
        ) : (
          <Card className="hidden lg:flex items-center justify-center h-[calc(100vh-200px)] min-h-[480px]">
            <Vide icone={<MessageSquare size={26} />}>Choisissez une conversation.</Vide>
          </Card>
        )}
      </div>
    </>
  );
}
