"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from "react";
import {
  Headset,
  Maximize2,
  MessageCircle,
  SendHorizontal,
  X,
} from "lucide-react";
import { Pastille } from "@/components/messagerie/outils";
import { PiecesJointes } from "@/components/messagerie/PiecesJointes";
import {
  ajouterPieces,
  BoutonJoindre,
  PiecesChoisies,
} from "@/components/support/ChoixPieces";
import { TexteLie } from "@/components/TexteLie";
import { ecrireAuSupport, markThreadRead } from "@/lib/actions/messages";
import { LOGO_EQUIPE } from "@/lib/avatars";
import { heureExacte, jourLisible } from "@/lib/enums";
import type { ConversationSupport, MessageSupport } from "@/lib/support";

const TAILLE = 56;
const MARGE = 16;
const HAUT_MIN = 80;
const SEUIL_GLISSE = 6;

const RELECTURE_OUVERTE = 4_000;
const RELECTURE_FERMEE = 30_000;

const SUGGESTIONS = [
  "Je souhaite régler ma cotisation.",
  "J’ai une question sur un événement.",
  "Je voudrais réserver un service CanCham.",
  "Je rencontre un problème sur la plateforme.",
];

// Espace admin : le Support IT (l'Admin GM de la plateforme)
const SUGGESTIONS_IT = [
  "Je rencontre un problème sur la plateforme.",
  "J’ai une question sur notre abonnement.",
  "Je voudrais une nouvelle fonction.",
];

// « admin » : Support IT (l'équipe de la Chambre écrit à l'Admin GM) ; « membre » : le membre écrit à son équipe
type Espace = "membre" | "admin";

const urlPieceIT = (id: string, telecharger = false) =>
  `/api/support-it/pieces/${id}${telecharger ? "?telecharger=1" : ""}`;

interface Position {
  cote: "gauche" | "droite";
  haut: number;
}

const DEFAUT: Position = { cote: "droite", haut: 0.82 };
const CLE = "cancham:bulle-support";

const abonnes = new Set<() => void>();

function sAbonner(rappel: () => void) {
  abonnes.add(rappel);
  window.addEventListener("storage", rappel);
  window.addEventListener("resize", rappel);
  return () => {
    abonnes.delete(rappel);
    window.removeEventListener("storage", rappel);
    window.removeEventListener("resize", rappel);
  };
}

function lirePosition(): string {
  try {
    return localStorage.getItem(CLE) ?? "";
  } catch {
    return "";
  }
}

const lireFenetre = () => `${window.innerWidth}x${window.innerHeight}`;

function enregistrerPosition(p: Position) {
  try {
    localStorage.setItem(CLE, JSON.stringify(p));
  } catch {}
  abonnes.forEach((rappel) => rappel());
}

function versPosition(brut: string): Position {
  try {
    const p = JSON.parse(brut);
    if ((p.cote === "gauche" || p.cote === "droite") && Number.isFinite(p.haut))
      return { cote: p.cote, haut: borne(p.haut, 0, 1) };
  } catch {}
  return DEFAUT;
}

const borne = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

interface EtatPanneau {
  ouvert: boolean;
  nonLus: number;
  brouillons: Record<string, string>;
}

const ETAT_INITIAL: EtatPanneau = {
  ouvert: false,
  nonLus: 0,
  brouillons: {},
};
let etatPanneau = ETAT_INITIAL;
const abonnesPanneau = new Set<() => void>();

function sAbonnerPanneau(rappel: () => void) {
  abonnesPanneau.add(rappel);
  return () => {
    abonnesPanneau.delete(rappel);
  };
}

function modifierPanneau(maj: Partial<EtatPanneau>) {
  etatPanneau = { ...etatPanneau, ...maj };
  abonnesPanneau.forEach((rappel) => rappel());
}

interface Donnees {
  conversation: ConversationSupport | null;
}

export function BulleSupport({
  espace,
  prenom,
}: {
  espace: Espace;
  prenom: string;
}) {
  const pathname = usePathname();

  const brut = useSyncExternalStore(sAbonner, lirePosition, () => "");
  const fenetre = useSyncExternalStore(sAbonner, lireFenetre, () => "");
  const position = useMemo(() => versPosition(brut), [brut]);

  const panneauEtat = useSyncExternalStore(
    sAbonnerPanneau,
    () => etatPanneau,
    () => ETAT_INITIAL,
  );
  const { ouvert, nonLus } = panneauEtat;
  const setOuvert = (o: boolean) => modifierPanneau({ ouvert: o });

  const [glisse, setGlisse] = useState<{ x: number; y: number } | null>(null);
  const depart = useRef<{ px: number; py: number; x: number; y: number }>(null);
  const aGlisse = useRef(false);
  const bulle = useRef<HTMLButtonElement>(null);
  const panneau = useRef<HTMLDivElement>(null);
  const saisie = useRef<HTMLTextAreaElement>(null);
  const defilement = useRef<HTMLDivElement>(null);

  // Le membre retrouve cette conversation dans sa messagerie : pas de bulle par-dessus
  const masquee =
    espace === "membre" && pathname.startsWith("/membre/messagerie");

  const url =
    espace === "admin" ? "/api/support-it" : "/api/support?espace=membre";
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState(false);
  const derniereDemande = useRef(0);

  const charger = useCallback(async () => {
    const numero = ++derniereDemande.current;
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const d = (await r.json()) as {
        conversation: ConversationSupport | null;
        nonLus: number;
      };
      if (numero !== derniereDemande.current) return;
      setDonnees({ conversation: d.conversation });
      setErreur(false);
      modifierPanneau({ nonLus: d.nonLus });
    } catch {
      if (numero === derniereDemande.current) setErreur(true);
    }
  }, [url]);

  useEffect(() => {
    if (masquee) return;
    const lire = () => {
      if (!document.hidden) charger();
    };
    lire();
    const minuterie = setInterval(
      lire,
      ouvert ? RELECTURE_OUVERTE : RELECTURE_FERMEE,
    );
    document.addEventListener("visibilitychange", lire);
    return () => {
      clearInterval(minuterie);
      document.removeEventListener("visibilitychange", lire);
    };
  }, [charger, ouvert, masquee, pathname]);

  const conversation = donnees?.conversation ?? null;
  const chargement = !donnees;

  // Lien d'un courriel du Support IT (« ?support=it ») : la bulle s'ouvre
  useEffect(() => {
    if (espace !== "admin") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("support") !== "it") return;
    modifierPanneau({ ouvert: true });
    p.delete("support");
    const reste = p.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${reste ? `?${reste}` : ""}`,
    );
  }, [espace]);

  const marque = useRef<string | null>(null);
  useEffect(() => {
    if (!ouvert || !conversation?.nonLus) return;
    const repere = `${conversation.id}:${conversation.messages.at(-1)?.id}`;
    if (marque.current === repere) return;
    marque.current = repere;
    const lire =
      espace === "admin"
        ? fetch("/api/support-it", { method: "PATCH" }).then(() => undefined)
        : markThreadRead(conversation.id, espace);
    lire.then(charger).catch(() => {});
  }, [ouvert, conversation, espace, charger]);

  const cleBrouillon = espace;
  const brouillon = panneauEtat.brouillons[cleBrouillon] ?? "";
  const setBrouillon = (texte: string) =>
    modifierPanneau({
      brouillons: { ...etatPanneau.brouillons, [cleBrouillon]: texte },
    });
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  // Photos, vidéos, PDF joints (Support IT)
  const [pieces, setPieces] = useState<File[]>([]);
  const joindre = (nouveaux: File[]) => {
    const r = ajouterPieces(pieces, nouveaux);
    setPieces(r.fichiers);
    setErreurEnvoi(r.erreur);
  };

  const envoyer = async () => {
    const texte = brouillon.trim();
    if ((!texte && !pieces.length) || envoi) return;
    const joints = pieces;
    const PERDU = "Le message n’est pas parti. Réessayez dans un instant.";
    setEnvoi(
      texte ||
        `Envoi de ${joints.length} pièce${joints.length > 1 ? "s" : ""} jointe${joints.length > 1 ? "s" : ""}`,
    );
    setErreurEnvoi(null);
    setBrouillon("");
    setPieces([]);
    if (saisie.current) saisie.current.style.height = "auto";
    try {
      let r: { ok: true } | { ok: false; erreur: string };
      if (espace === "admin") {
        const corps = new FormData();
        corps.set("texte", texte);
        for (const f of joints) corps.append("pieces", f);
        const reponse = await fetch("/api/support-it", {
          method: "POST",
          body: corps,
        });
        r = await reponse
          .json()
          .catch(() => ({ ok: false as const, erreur: PERDU }));
      } else {
        r = await ecrireAuSupport(espace, conversation?.id ?? null, texte);
      }
      if (!r.ok) {
        setErreurEnvoi(r.erreur);
        setBrouillon(texte);
        setPieces(joints);
      }
      await charger();
    } catch {
      setErreurEnvoi(PERDU);
      setBrouillon(texte);
      setPieces(joints);
    } finally {
      setEnvoi(null);
      saisie.current?.focus();
    }
  };

  const dernier = conversation?.messages.at(-1)?.id;
  useEffect(() => {
    const zone = defilement.current;
    if (zone) zone.scrollTop = zone.scrollHeight;
  }, [ouvert, conversation?.id, dernier, envoi]);

  // Une photo ou une vidéo qui se charge agrandit le fil : on reste en bas si on y était
  const contenu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const zone = defilement.current;
    const bloc = contenu.current;
    if (!ouvert || !zone || !bloc) return;
    let enBas = true;
    const surDefilement = () => {
      enBas = zone.scrollHeight - zone.scrollTop - zone.clientHeight < 48;
    };
    const suivi = new ResizeObserver(() => {
      if (enBas) zone.scrollTop = zone.scrollHeight;
    });
    zone.addEventListener("scroll", surDefilement, { passive: true });
    suivi.observe(bloc);
    return () => {
      suivi.disconnect();
      zone.removeEventListener("scroll", surDefilement);
    };
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert) return;
    const dialogueOuvert = () => !!document.querySelector("dialog[open]");
    const clic = (e: globalThis.PointerEvent) => {
      const cible = e.target as Node;
      if (
        dialogueOuvert() ||
        panneau.current?.contains(cible) ||
        bulle.current?.contains(cible)
      )
        return;
      setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !dialogueOuvert()) setOuvert(false);
    };
    document.addEventListener("pointerdown", clic);
    document.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("pointerdown", clic);
      document.removeEventListener("keydown", touche);
    };
  }, [ouvert]);

  if (!fenetre || masquee) return null;

  const [L, H] = fenetre.split("x").map(Number);
  const yMax = Math.max(HAUT_MIN, H - TAILLE - MARGE);
  const repos = {
    x: position.cote === "droite" ? L - TAILLE - MARGE : MARGE,
    y: HAUT_MIN + position.haut * (yMax - HAUT_MIN),
  };
  const { x, y } = glisse ?? repos;

  const versPoint = (e: PointerEvent) => {
    const d = depart.current!;
    return {
      x: borne(d.x + e.clientX - d.px, 0, L - TAILLE),
      y: borne(d.y + e.clientY - d.py, 0, H - TAILLE),
    };
  };

  const auPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    depart.current = { px: e.clientX, py: e.clientY, x, y };
    aGlisse.current = false;
  };

  const auPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = depart.current;
    if (!d) return;
    if (
      !aGlisse.current &&
      Math.hypot(e.clientX - d.px, e.clientY - d.py) < SEUIL_GLISSE
    )
      return;
    if (!aGlisse.current) {
      aGlisse.current = true;
      setOuvert(false);
    }
    setGlisse(versPoint(e));
  };

  const telephone = L < 640;

  const basculer = () => {
    const ouvrir = !ouvert;
    setOuvert(ouvrir);
    if (ouvrir && !telephone) setTimeout(() => saisie.current?.focus(), 50);
  };

  const auPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!depart.current) return;
    const fin = versPoint(e);
    depart.current = null;
    if (!aGlisse.current) {
      if (e.type === "pointerup") basculer();
      return;
    }
    enregistrerPosition({
      cote: fin.x + TAILLE / 2 < L / 2 ? "gauche" : "droite",
      haut: borne((fin.y - HAUT_MIN) / (yMax - HAUT_MIN || 1), 0, 1),
    });
    setGlisse(null);
  };

  const auClic = (e: MouseEvent<HTMLButtonElement>) => {
    if (e.detail === 0) basculer();
  };

  const hauteurPanneau = Math.min(620, H - 24);
  const stylePanneau: CSSProperties = telephone
    ? {
        left: 8,
        right: 8,
        bottom: 8,
        height: Math.min(Math.round(H * 0.85), 640),
      }
    : {
        width: Math.min(400, L - 2 * (MARGE + TAILLE + 12)),
        [position.cote === "droite" ? "right" : "left"]: MARGE + TAILLE + 12,
        top: borne(
          y + TAILLE / 2 - hauteurPanneau / 2,
          12,
          H - hauteurPanneau - 12,
        ),
        height: hauteurPanneau,
      };

  const fermer = () => setOuvert(false);
  const Icone = espace === "admin" ? Headset : MessageCircle;
  const libelle =
    espace === "admin" ? "Support IT" : "Écrire à l’équipe CanCham";

  const versMessagerie = `/membre/messagerie${
    conversation ? `?t=${conversation.id}` : ""
  }`;

  return (
    <>
      <button
        ref={bulle}
        type="button"
        aria-label={`${libelle}${nonLus ? ` — ${nonLus} message${nonLus > 1 ? "s" : ""} non lu${nonLus > 1 ? "s" : ""}` : ""}`}
        aria-expanded={ouvert}
        title={`${libelle} · glissez la bulle pour la déplacer`}
        onPointerDown={auPointerDown}
        onPointerMove={auPointerMove}
        onPointerUp={auPointerUp}
        onPointerCancel={auPointerUp}
        onClick={auClic}
        className={`print:hidden fixed z-[60] rounded-full flex items-center justify-center text-white border-2 border-white/90 select-none touch-none shadow-[0_10px_28px_-6px_rgba(15,29,44,0.6)] ${
          glisse
            ? "cursor-grabbing scale-110"
            : "cursor-pointer transition-[left,top,transform] duration-200 hover:scale-105"
        }`}
        style={{
          left: x,
          top: y,
          width: TAILLE,
          height: TAILLE,
          background: "var(--laterale)",
        }}
      >
        {ouvert ? <X size={24} aria-hidden /> : <Icone size={25} aria-hidden />}
        {nonLus && !ouvert ? (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px]">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-accent opacity-60 motion-safe:animate-ping"
            />
            <span className="relative min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center border-2 border-white tabular-nums">
              {nonLus}
            </span>
          </span>
        ) : null}
      </button>

      {ouvert ? (
        <div
          ref={panneau}
          role="dialog"
          aria-label={libelle}
          className={`anim-echelle print:hidden fixed z-[61] flex flex-col bg-surface text-ink border border-line rounded-[var(--radius-l)] shadow-[0_22px_60px_-14px_rgba(15,29,44,0.5)] overflow-hidden ${
            telephone
              ? "origin-bottom"
              : position.cote === "droite"
                ? "origin-right"
                : "origin-left"
          }`}
          style={stylePanneau}
        >
          <div
            className="flex items-center gap-3 px-3.5 py-3 text-white shrink-0"
            style={{ background: "var(--superieure)" }}
          >
            {espace === "admin" ? (
              <span className="w-10 h-10 rounded-full bg-white/12 flex items-center justify-center shrink-0">
                <Headset size={19} aria-hidden />
              </span>
            ) : (
              <span className="relative shrink-0">
                <Pastille
                  src={LOGO_EQUIPE}
                  alt=""
                  initiales={conversation?.init ?? "…"}
                  taille={40}
                  className="bg-white/15 text-white"
                />
                <span
                  aria-hidden
                  className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#2fbf71] border-2 border-[#12243a]"
                />
              </span>
            )}

            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold leading-tight truncate">
                {espace === "admin"
                  ? "Support IT"
                  : (conversation?.nom ?? "Équipe CanCham")}
              </div>
              <div className="text-[12px] text-white/65 truncate">
                {espace === "admin"
                  ? "L’Alliée Virtuelle · réponse ici même"
                  : "Support membres · réponse ici même"}
              </div>
            </div>

            {espace === "membre" ? (
              <Link
                href={versMessagerie}
                onClick={fermer}
                aria-label="Ouvrir dans la messagerie"
                title="Ouvrir dans la messagerie"
                className="w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0"
              >
                <Maximize2 size={15} />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={fermer}
              aria-label="Fermer"
              className="w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer border-0 shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          <>
            <div
              ref={defilement}
              aria-live="polite"
              className="flex-1 min-h-0 overflow-y-auto px-3.5 py-4 bg-[#f7f9fc]"
            >
              <div ref={contenu} className="min-h-full flex flex-col gap-1.5">
                {erreur && !conversation ? (
                  <p className="m-auto text-[13px] text-bad text-center">
                    Le support ne répond pas pour le moment.
                  </p>
                ) : chargement ? (
                  <p className="m-auto text-[13px] text-faint">Chargement…</p>
                ) : conversation?.messages.length ? (
                  <FilMessages
                    messages={conversation.messages}
                    espace={espace}
                  />
                ) : (
                  <Accueil
                    espace={espace}
                    prenom={prenom}
                    choisir={(texte) => {
                      setBrouillon(texte);
                      saisie.current?.focus();
                    }}
                  />
                )}

                {envoi ? (
                  <div className="self-end max-w-[82%] px-3 py-2 text-[13.3px] leading-relaxed whitespace-pre-line bg-accent text-white rounded-[14px] rounded-br-[4px] opacity-60">
                    {envoi}
                    <span className="block text-right text-[10.5px] mt-1 text-white/80">
                      Envoi…
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                envoyer();
              }}
              className="shrink-0 border-t border-line bg-surface px-3 pt-2.5 pb-3"
            >
              {erreurEnvoi ? (
                <p role="alert" className="m-0 mb-2 text-[12.5px] text-bad">
                  {erreurEnvoi}
                </p>
              ) : null}
              {espace === "admin" ? (
                <PiecesChoisies
                  fichiers={pieces}
                  retirer={(i) => setPieces((p) => p.filter((_, k) => k !== i))}
                />
              ) : null}
              <div className="flex items-end gap-2">
                {espace === "admin" ? (
                  <BoutonJoindre choisir={joindre} desactive={envoi !== null} />
                ) : null}
                <textarea
                  ref={saisie}
                  value={brouillon}
                  onChange={(e) => {
                    setBrouillon(e.target.value);
                    const t = e.currentTarget;
                    t.style.height = "auto";
                    t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      envoyer();
                    }
                  }}
                  rows={1}
                  aria-label="Votre message"
                  placeholder={
                    espace === "membre"
                      ? "Écrivez votre message…"
                      : "Décrivez votre demande…"
                  }
                  className="flex-1 min-w-0 resize-none rounded-[20px] border border-line bg-surface-2 text-ink px-3.5 py-2.5 text-[13.5px] leading-[1.4] outline-none focus:border-navy focus:bg-surface max-h-[120px]"
                />
                <button
                  type="submit"
                  disabled={
                    (!brouillon.trim() && !pieces.length) || envoi !== null
                  }
                  aria-label="Envoyer"
                  className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center shrink-0 border-0 cursor-pointer transition-opacity disabled:opacity-40 disabled:cursor-default"
                >
                  <SendHorizontal size={17} />
                </button>
              </div>
              <p className="m-0 mt-1.5 text-[11px] text-faint pointer-coarse:hidden">
                Entrée pour envoyer · Maj + Entrée pour aller à la ligne
              </p>
            </form>
          </>
        </div>
      ) : null}
    </>
  );
}

function FilMessages({
  messages,
  espace,
}: {
  messages: MessageSupport[];
  espace: Espace;
}) {
  return (
    <>
      {messages.map((m, i) => {
        const precedent = messages[i - 1];
        const jour = jourLisible(m.envoyeLe);
        const nouveauJour =
          !precedent || jourLisible(precedent.envoyeLe) !== jour;
        // Support IT (admin) : à droite, ce qu'écrit l'équipe de la Chambre ; à gauche, l'Admin GM.
        // Signés : les messages de l'autre côté, et ceux d'un collègue
        const aDroite = espace === "admin" ? !m.equipe : m.moi;
        const signe =
          !m.supprime &&
          (m.equipe || (espace === "admin" && !m.moi)) &&
          (nouveauJour || precedent?.de !== m.de || precedent?.moi !== m.moi);
        const cote = aDroite ? "self-end" : "self-start";
        return (
          <Fragment key={m.id}>
            {nouveauJour ? (
              <div className="self-center my-1.5 text-[11px] font-semibold text-muted bg-surface border border-line rounded-full px-3 py-1">
                {jour}
              </div>
            ) : null}
            {signe ? (
              <div
                className={`${aDroite ? "self-end mr-1" : "self-start ml-1"} mt-1 -mb-0.5 text-[11px] font-semibold text-muted`}
              >
                {espace === "membre"
                  ? "Équipe CanCham"
                  : m.equipe
                    ? `${m.de} · Support IT`
                    : m.de}
              </div>
            ) : null}
            {m.supprime ? (
              <div
                className={`${cote} max-w-[82%] px-3 py-2 rounded-[14px] border border-dashed border-line text-[12.5px] italic text-faint`}
              >
                {m.moi
                  ? "Vous avez supprimé ce message"
                  : "Ce message a été supprimé"}
              </div>
            ) : (
              <div
                className={`${cote} max-w-[82%] min-w-0 px-3 py-2 text-[13.3px] leading-relaxed whitespace-pre-line [overflow-wrap:anywhere] rounded-[14px] ${
                  aDroite
                    ? "bg-accent text-white"
                    : "bg-surface border border-line"
                } ${aDroite ? "rounded-br-[4px]" : "rounded-bl-[4px]"} ${
                  m.pieces.length ? "min-w-[200px]" : ""
                }`}
              >
                <PiecesJointes
                  pieces={m.pieces}
                  moi={aDroite}
                  space={espace}
                  url={espace === "admin" ? urlPieceIT : undefined}
                />
                <TexteLie
                  texte={m.texte}
                  classeLien={
                    aDroite
                      ? "text-white underline underline-offset-2 decoration-white/60 hover:decoration-white [overflow-wrap:anywhere]"
                      : undefined
                  }
                />
                <span
                  className={`block text-right text-[10.5px] mt-1 tabular-nums ${
                    aDroite ? "text-white/70" : "text-faint"
                  }`}
                >
                  {heureExacte(m.envoyeLe)}
                </span>
              </div>
            )}
          </Fragment>
        );
      })}
    </>
  );
}

function Accueil({
  espace,
  prenom,
  choisir,
}: {
  espace: Espace;
  prenom: string;
  choisir: (texte: string) => void;
}) {
  return (
    <div className="my-auto flex flex-col gap-3">
      <div className="self-start max-w-[88%] px-3.5 py-3 bg-surface border border-line rounded-[14px] rounded-bl-[4px] text-[13.5px] leading-relaxed">
        <strong className="block mb-1">Bonjour {prenom},</strong>
        {espace === "admin"
          ? "Un problème, une question sur la plateforme ? Écrivez au Support IT, avec une capture ou une vidéo si besoin."
          : "Une question sur votre adhésion, un paiement, un événement ou un service ? Écrivez-nous : l’équipe CanCham vous répond ici même, et la conversation reste dans votre messagerie."}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(espace === "admin" ? SUGGESTIONS_IT : SUGGESTIONS).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => choisir(s)}
            className="text-left text-[12.5px] font-medium px-3 py-1.5 rounded-full border border-accent/30 bg-accent-soft text-accent-strong cursor-pointer hover:border-accent/60"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
