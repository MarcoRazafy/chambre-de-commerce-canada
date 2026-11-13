"use client";

// Page Messages de l'Admin GM (Support IT) : la conversation avec une Chambre, la réponse (texte, photos, vidéos,
// PDF), la relecture régulière et la lecture des messages reçus.
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SendHorizontal } from "lucide-react";
import { PiecesJointes } from "@/components/messagerie/PiecesJointes";
import { ajouterPieces, BoutonJoindre, PiecesChoisies } from "@/components/support/ChoixPieces";
import { TexteLie } from "@/components/TexteLie";
import { marquerLuSupportIT, repondreSupportIT } from "@/lib/actions/gm-support";
import { heureExacte, jourLisible } from "@/lib/enums";
import type { MessageSupport } from "@/lib/support";

const urlPiece = (id: string, telecharger = false) => `/gm/pieces/${id}${telecharger ? "?telecharger=1" : ""}`;

// Les messages : à droite ceux de l'Admin GM, à gauche ceux de l'équipe de la Chambre (signés)
export function FilSupportGM({ messages }: { messages: MessageSupport[] }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col-reverse bg-[#f7f9fc] px-4 py-4" aria-live="polite">
      <div className="flex flex-col gap-1.5">
        {messages.map((m, i) => {
          const precedent = messages[i - 1];
          const jour = jourLisible(m.envoyeLe);
          const nouveauJour = !precedent || jourLisible(precedent.envoyeLe) !== jour;
          const aDroite = m.moi;
          const signe = nouveauJour || precedent?.de !== m.de || precedent?.moi !== m.moi;
          return (
            <Fragment key={m.id}>
              {nouveauJour ? (
                <div className="self-center my-1.5 text-[11px] font-semibold text-muted bg-surface border border-line rounded-full px-3 py-1">
                  {jour}
                </div>
              ) : null}
              {signe ? (
                <div className={`${aDroite ? "self-end mr-1" : "self-start ml-1"} mt-1 -mb-0.5 text-[11px] font-semibold text-muted`}>
                  {aDroite ? `${m.de} · Support IT` : m.de}
                </div>
              ) : null}
              <div
                className={`${aDroite ? "self-end rounded-br-[4px] bg-accent text-white" : "self-start rounded-bl-[4px] bg-surface border border-line"} max-w-[78%] min-w-0 px-3 py-2 text-[13.5px] leading-relaxed whitespace-pre-line [overflow-wrap:anywhere] rounded-[14px] ${
                  m.pieces.length ? "min-w-[220px]" : ""
                }`}
              >
                <PiecesJointes pieces={m.pieces} moi={aDroite} space="admin" url={urlPiece} />
                <TexteLie
                  texte={m.texte}
                  classeLien={aDroite ? "text-white underline underline-offset-2 decoration-white/60 hover:decoration-white [overflow-wrap:anywhere]" : undefined}
                />
                <span className={`block text-right text-[10.5px] mt-1 tabular-nums ${aDroite ? "text-white/70" : "text-faint"}`}>
                  {heureExacte(m.envoyeLe)}
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export function RedactionSupportGM({ chambreId }: { chambreId: string }) {
  const [texte, setTexte] = useState("");
  const [pieces, setPieces] = useState<File[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const saisie = useRef<HTMLTextAreaElement>(null);

  const envoyer = () => {
    const contenu = texte.trim();
    if ((!contenu && !pieces.length) || enCours) return;
    const corps = new FormData();
    corps.set("chambreId", chambreId);
    corps.set("texte", contenu);
    for (const f of pieces) corps.append("pieces", f);
    setErreur(null);
    demarrer(async () => {
      try {
        const r = await repondreSupportIT(null, corps);
        if (r.ok) {
          setTexte("");
          setPieces([]);
          if (saisie.current) saisie.current.style.height = "auto";
        } else setErreur(r.erreur);
      } catch {
        setErreur("Le message n’est pas parti. Réessayez dans un instant.");
      }
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        envoyer();
      }}
      className="shrink-0 border-t border-line bg-surface px-4 pt-3 pb-3.5"
    >
      {erreur ? (
        <p role="alert" className="m-0 mb-2 text-[12.5px] text-bad">
          {erreur}
        </p>
      ) : null}
      <PiecesChoisies fichiers={pieces} retirer={(i) => setPieces((p) => p.filter((_, k) => k !== i))} />
      <div className="flex items-end gap-2">
        <BoutonJoindre
          desactive={enCours}
          choisir={(nouveaux) => {
            const r = ajouterPieces(pieces, nouveaux);
            setPieces(r.fichiers);
            setErreur(r.erreur);
          }}
        />
        <textarea
          ref={saisie}
          value={texte}
          onChange={(e) => {
            setTexte(e.target.value);
            const t = e.currentTarget;
            t.style.height = "auto";
            t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              envoyer();
            }
          }}
          rows={1}
          aria-label="Votre réponse"
          placeholder="Écrire une réponse…"
          className="flex-1 min-w-0 resize-none rounded-[20px] border border-line bg-surface-2 text-ink px-3.5 py-2.5 text-[13.5px] leading-[1.4] outline-none focus:border-navy focus:bg-surface max-h-[160px]"
        />
        <button
          type="submit"
          disabled={(!texte.trim() && !pieces.length) || enCours}
          aria-label={enCours ? "Envoi en cours" : "Envoyer"}
          className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center shrink-0 border-0 cursor-pointer transition-opacity disabled:opacity-40 disabled:cursor-default focus-visible:outline-2 focus-visible:outline-navy"
        >
          <SendHorizontal size={17} aria-hidden />
        </button>
      </div>
      {enCours ? <p className="m-0 mt-1.5 text-[11.5px] text-muted">Envoi…</p> : null}
    </form>
  );
}

// Relit la page régulièrement (nouveaux messages), quand elle est visible
export function RelectureAuto({ intervalle = 8_000 }: { intervalle?: number }) {
  const router = useRouter();
  useEffect(() => {
    const minuterie = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, intervalle);
    return () => clearInterval(minuterie);
  }, [router, intervalle]);
  return null;
}

// Conversation ouverte avec des messages non lus : lue
export function MarquerLu({ chambreId, repere }: { chambreId: string; repere: string }) {
  useEffect(() => {
    marquerLuSupportIT(chambreId).catch(() => {});
  }, [chambreId, repere]);
  return null;
}
