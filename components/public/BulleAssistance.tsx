"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Headset, Send, X } from "lucide-react";
import { envoyerAuSupportPublic } from "@/lib/actions/support-public";
import type { FilVisiteur } from "@/lib/support-visiteur";

const RELECTURE_MS = 15_000;

const CHAMP =
  "w-full rounded-[var(--radius-s)] border border-line bg-surface-2 text-ink px-3 py-2 text-[13.5px] outline-none focus:border-accent placeholder:text-faint";

export function BulleAssistance() {
  const [ouvert, setOuvert] = useState(false);
  const [fil, setFil] = useState<FilVisiteur | null>(null);
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [champFautif, setChampFautif] = useState<string | null>(null);
  const [envoi, demarrer] = useTransition();
  const finDuFil = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivant = true;
    const relire = async () => {
      try {
        const r = await fetch("/api/support/visiteur", { cache: "no-store" });
        if (!r.ok) return;
        const { fil } = (await r.json()) as { fil: FilVisiteur | null };
        if (vivant && fil) setFil(fil);
      } catch {}
    };
    relire();
    if (!ouvert)
      return () => {
        vivant = false;
      };
    const minuterie = setInterval(relire, RELECTURE_MS);
    return () => {
      vivant = false;
      clearInterval(minuterie);
    };
  }, [ouvert]);

  useEffect(() => {
    finDuFil.current?.scrollIntoView({ block: "end" });
  }, [fil?.messages.length, ouvert]);

  const envoyer = (formData: FormData) => {
    const message = String(formData.get("texte") ?? "").trim();
    if (!message) return;
    setErreur(null);
    setChampFautif(null);
    demarrer(async () => {
      const r = await envoyerAuSupportPublic({
        nom: String(formData.get("nom") ?? ""),
        email: String(formData.get("email") ?? ""),
        telephone: String(formData.get("telephone") ?? ""),
        texte: message,
      });
      if (r.ok) {
        setFil(r.fil);
        setTexte("");
      } else {
        setErreur(r.erreur);
        setChampFautif(r.champ ?? null);
      }
    });
  };

  const bordure = (nom: string) =>
    champFautif === nom ? `${CHAMP} border-bad` : CHAMP;

  return (
    <>
      {ouvert ? (
        <section
          role="dialog"
          aria-label="Assistance"
          className="fixed z-50 bottom-[90px] right-4 sm:right-6 w-[min(360px,calc(100vw-2rem))] max-h-[min(560px,calc(100vh-130px))] flex flex-col rounded-[var(--radius-l)] border border-line bg-surface shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)] overflow-hidden"
        >
          <header className="flex items-start gap-3 px-4 py-3 border-b border-line bg-surface-2">
            <span className="w-9 h-9 shrink-0 rounded-full bg-accent text-white flex items-center justify-center">
              <Headset size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-ink">
                Équipe de la Chambre
              </span>
              <span className="block text-[12px] text-muted">
                {fil
                  ? "Nous vous répondons par ici et par e-mail"
                  : "Une question ? Écrivez-nous"}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setOuvert(false)}
              aria-label="Fermer l’assistance"
              className="w-8 h-8 shrink-0 rounded-[var(--radius-s)] border border-transparent bg-transparent text-muted flex items-center justify-center cursor-pointer hover:text-ink hover:border-line"
            >
              <X size={16} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-3.5">
            {fil ? (
              <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
                {fil.messages.map((m) => (
                  <li
                    key={m.id}
                    className={`max-w-[85%] rounded-[var(--radius-m)] px-3 py-2 text-[13.4px] leading-relaxed ${
                      m.equipe
                        ? "self-start bg-surface-2 text-ink"
                        : "self-end bg-accent text-white"
                    }`}
                  >
                    {m.equipe ? (
                      <span className="block text-[11px] font-semibold text-muted mb-0.5">
                        {m.de}
                      </span>
                    ) : null}
                    {m.supprime ? (
                      <i className="text-muted">Message supprimé</i>
                    ) : (
                      <span className="whitespace-pre-line">{m.texte}</span>
                    )}
                  </li>
                ))}
                <div ref={finDuFil} />
              </ul>
            ) : (
              <p className="m-0 text-[13.4px] text-muted leading-relaxed">
                Adhésion, événements, partenariats : posez votre question à
                l’équipe de la chambre. Laissez vos coordonnées, c’est par là
                que la réponse vous reviendra.
              </p>
            )}
          </div>

          <form
            action={envoyer}
            className="border-t border-line px-4 py-3 flex flex-col gap-2 bg-surface-2"
          >
            {fil ? null : (
              <>
                <input
                  name="nom"
                  required
                  autoComplete="name"
                  placeholder="Votre nom"
                  className={bordure("nom")}
                />
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="Votre e-mail"
                  className={bordure("email")}
                />
                <input
                  type="tel"
                  name="telephone"
                  required
                  autoComplete="tel"
                  placeholder="Votre téléphone"
                  className={bordure("telephone")}
                />
              </>
            )}
            <div className="flex items-end gap-2">
              <textarea
                name="texte"
                required
                rows={2}
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                placeholder={fil ? "Votre message…" : "Votre question…"}
                className={`${CHAMP} resize-none`}
              />
              <button
                type="submit"
                disabled={envoi || !texte.trim()}
                aria-label="Envoyer"
                className="w-10 h-10 shrink-0 rounded-[var(--radius-s)] bg-accent text-white flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-default"
              >
                <Send size={16} />
              </button>
            </div>
            {erreur ? (
              <p role="alert" className="m-0 text-[12.5px] text-bad">
                {erreur}
              </p>
            ) : null}
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-label={ouvert ? "Fermer l’assistance" : "Ouvrir l’assistance"}
        className="fixed z-50 bottom-5 right-4 sm:right-6 w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center cursor-pointer shadow-[0_16px_34px_-14px_rgba(0,0,0,0.75)] transition-transform hover:scale-105"
      >
        {ouvert ? <X size={22} /> : <Headset size={22} />}
      </button>
    </>
  );
}
