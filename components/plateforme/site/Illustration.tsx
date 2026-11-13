"use client";

// Illustration du site (public/illustrations, SVG recolorés aux couleurs de la marque) : apparaît en fondu quand
// elle entre dans l'écran ; « flotte » : un lent va-et-vient vertical. Autour de chaque dessin, des ornements animés
// (pastilles qui flottent, icônes qui oscillent, anneaux qui tournent) arrivent l'un après l'autre ; tout est
// immobile si l'appareil demande moins de mouvements
import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  Check,
  CreditCard,
  Headset,
  KeyRound,
  Lock,
  Mail,
  MessageCircle,
  Network,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NomIllustration =
  | "poignee-de-main" | "evenements" | "reseau" | "paiement" | "questions" | "chambre" | "membres"
  | "acces" | "adhesion" | "oubli" | "courriel" | "mot-de-passe" | "bienvenue" | "admin";

// Proportions de chaque dessin (largeur / hauteur de son viewBox), pour réserver la place avant le chargement
const PROPORTIONS: Record<NomIllustration, [number, number]> = {
  "poignee-de-main": [759, 615],
  evenements: [801, 614],
  reseau: [807, 699],
  paiement: [904, 586],
  questions: [861, 632],
  chambre: [1010, 771],
  membres: [809, 630],
  acces: [793, 552],
  adhesion: [512, 532],
  oubli: [951, 632],
  courriel: [570, 512],
  "mot-de-passe": [493, 481],
  bienvenue: [943, 796],
  admin: [543, 634],
};

type Ton = "vert" | "bleu" | "rouge";

// Un ornement : « puce » (pastille blanche avec une icône ou des initiales et un mot), « tuile » (icône seule dans un
// rond blanc), « anneau » (icône sur fond de couleur, entourée d'un cercle pointillé qui tourne) ; « ou » : sa place
// par rapport au dessin ; « boucle » : son mouvement continu (va-et-vient par défaut)
type Ornement = { ou: string; boucle?: "bobine" | "balance" | "pulsation" } & (
  | { type: "puce"; texte: string; icone?: LucideIcon; ton?: Ton; initiales?: string[] }
  | { type: "tuile"; icone: LucideIcon; ton: Ton; point?: boolean }
  | { type: "anneau"; icone: LucideIcon; ton: Ton }
);

const ORNEMENTS: Record<NomIllustration, Ornement[]> = {
  "poignee-de-main": [
    { type: "puce", icone: Check, ton: "vert", texte: "Cotisation payée", ou: "-left-[6%] top-[10%]" },
    { type: "puce", initiales: ["BC"], texte: "Nouveau membre", ou: "-right-[4%] top-[6%]" },
    { type: "puce", icone: CalendarDays, ton: "bleu", texte: "12 déc. · 47 inscrits", ou: "-left-[6%] top-[52%]" },
    { type: "anneau", icone: Lock, ton: "rouge", ou: "-right-[2%] bottom-[10%]" },
  ],
  evenements: [
    { type: "tuile", icone: Bell, ton: "rouge", point: true, boucle: "balance", ou: "-right-[2%] top-0" },
    { type: "puce", icone: Check, ton: "vert", texte: "Inscription confirmée", ou: "-left-[6%] top-[66%]" },
  ],
  reseau: [
    { type: "anneau", icone: Network, ton: "bleu", ou: "-left-[4%] top-[2%]" },
    { type: "puce", initiales: ["BC", "MR"], texte: "Mise en relation", ou: "-left-[6%] bottom-[12%]" },
  ],
  paiement: [
    { type: "tuile", icone: Lock, ton: "vert", boucle: "pulsation", ou: "left-[4%] top-[6%]" },
    { type: "puce", icone: CreditCard, ton: "bleu", texte: "Payé par carte · 900 $", ou: "-right-[4%] bottom-[14%]" },
  ],
  questions: [
    { type: "tuile", icone: MessageCircle, ton: "bleu", boucle: "balance", ou: "left-0 top-[4%]" },
    { type: "puce", icone: Headset, ton: "vert", texte: "Réponse du Support IT", ou: "-right-[2%] bottom-[16%]" },
  ],
  chambre: [
    { type: "anneau", icone: Building2, ton: "bleu", ou: "-left-[4%] top-[4%]" },
    { type: "puce", icone: Check, ton: "vert", texte: "Espace prêt", ou: "-right-[4%] bottom-[14%]" },
  ],
  membres: [
    { type: "tuile", icone: Bell, ton: "rouge", point: true, boucle: "balance", ou: "-right-[2%] top-[14%]" },
    { type: "puce", initiales: ["BC", "MR", "AS"], texte: "3 nouveaux membres", ou: "-right-[4%] bottom-[2%]" },
  ],
  acces: [
    { type: "anneau", icone: Lock, ton: "bleu", ou: "-left-[4%] top-[4%]" },
    { type: "tuile", icone: KeyRound, ton: "vert", ou: "-right-[2%] bottom-[16%]" },
  ],
  adhesion: [
    { type: "tuile", icone: Users, ton: "bleu", ou: "-left-[4%] top-[4%]" },
    { type: "puce", icone: Check, ton: "vert", texte: "Demande envoyée", ou: "-right-[6%] bottom-[12%]" },
  ],
  oubli: [
    { type: "tuile", icone: KeyRound, ton: "rouge", boucle: "balance", ou: "-left-[2%] top-[4%]" },
    { type: "puce", icone: Mail, ton: "bleu", texte: "Lien valable une heure", ou: "-right-[4%] bottom-[14%]" },
  ],
  courriel: [
    { type: "tuile", icone: Mail, ton: "vert", ou: "-right-[4%] top-[4%]" },
    { type: "puce", icone: Check, ton: "vert", texte: "Courriel envoyé", ou: "-left-[6%] bottom-[12%]" },
  ],
  "mot-de-passe": [
    { type: "anneau", icone: Lock, ton: "vert", ou: "-left-[4%] top-[4%]" },
    { type: "tuile", icone: KeyRound, ton: "bleu", ou: "-right-[4%] bottom-[14%]" },
  ],
  bienvenue: [
    { type: "tuile", icone: Users, ton: "bleu", ou: "-left-[2%] top-[4%]" },
    { type: "puce", icone: Check, ton: "vert", texte: "Invitation reçue", ou: "-right-[4%] bottom-[12%]" },
  ],
  admin: [
    { type: "anneau", icone: ShieldCheck, ton: "rouge", ou: "-left-[6%] top-[4%]" },
    { type: "tuile", icone: Lock, ton: "bleu", ou: "-right-[6%] bottom-[14%]" },
  ],
};

const FOND: Record<Ton, string> = { vert: "bg-marque-vert", bleu: "bg-marque-nuit", rouge: "bg-marque-rouge" };
const ENCRE: Record<Ton, string> = { vert: "text-success", bleu: "text-marque-nuit", rouge: "text-accent" };
const BLANC = "bg-white border border-line shadow-[0_10px_24px_-12px_rgba(28,26,23,0.35)]";

function Contenu({ o }: { o: Ornement }) {
  if (o.type === "puce") {
    const Icone = o.icone;
    return (
      <span className={`flex items-center gap-2 h-9 pl-1 pr-3 rounded-[10px] text-[12.5px] font-medium text-ink whitespace-nowrap ${BLANC}`}>
        {Icone ? (
          <span className={`grid place-items-center size-7 rounded-[7px] text-white ${FOND[o.ton ?? "bleu"]}`}>
            <Icone size={15} strokeWidth={2} />
          </span>
        ) : (
          <span className="flex">
            {o.initiales?.map((s, k) => (
              <span key={s} className={`grid place-items-center size-7 rounded-full bg-marque-nuit text-white text-[10px] font-semibold ring-2 ring-white ${k ? "-ml-2" : ""}`}>
                {s}
              </span>
            ))}
          </span>
        )}
        {o.texte}
      </span>
    );
  }
  if (o.type === "tuile") {
    return (
      <span className={`relative grid place-items-center size-11 rounded-full ${BLANC} ${ENCRE[o.ton]} ${o.boucle === "pulsation" ? "ornement-pulsation" : ""}`}>
        <o.icone size={18} strokeWidth={1.75} />
        {o.point ? <span className="absolute top-1 right-1 size-2 rounded-full bg-accent ring-2 ring-white" /> : null}
      </span>
    );
  }
  return (
    <span className="relative block size-14">
      <span className="ornement-tourne absolute inset-0 rounded-full border-[1.5px] border-dashed border-line-champ" />
      <span className={`absolute inset-[9px] grid place-items-center rounded-full text-white ${FOND[o.ton]}`}>
        <o.icone size={16} strokeWidth={1.75} />
      </span>
    </span>
  );
}

export function Illustration({
  nom,
  className = "",
  flotte = false,
  priorite = false,
  contenir = false,
}: {
  nom: NomIllustration;
  className?: string;
  flotte?: boolean;
  /** Dans l'accroche : chargée et visible tout de suite */
  priorite?: boolean;
  /** Bornée à la moitié de la hauteur de l'écran (panneau d'une page d'authentification) */
  contenir?: boolean;
}) {
  const cadre = useRef<HTMLDivElement>(null);
  const [largeur, hauteur] = PROPORTIONS[nom];

  // Visible dès qu'elle entre dans l'écran (classe posée sur l'élément, sans nouveau rendu)
  useEffect(() => {
    const el = cadre.current;
    if (!el || priorite) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("illustration-visible");
      return;
    }
    const obs = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          el.classList.add("illustration-visible");
          obs.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [priorite]);

  return (
    <div ref={cadre} className={`illustration ${priorite ? "illustration-visible" : ""} ${flotte ? "illustration-flotte" : ""} ${className}`}>
      {/* Le corps : le dessin et ses ornements, placés par rapport à lui ; « contenir » : sa largeur est celle qui
          garde le dessin sous la moitié de la hauteur de l'écran */}
      <span className="illustration-corps relative block mx-auto" style={contenir ? { width: `min(100%, calc(48vh * ${(largeur / hauteur).toFixed(4)}))` } : undefined}>
        <Image
          src={`/illustrations/${nom}.svg`}
          alt=""
          aria-hidden
          width={largeur}
          height={hauteur}
          unoptimized
          priority={priorite}
          className="block w-full h-auto"
        />
        {ORNEMENTS[nom].map((o, i) => (
          <span key={i} aria-hidden className={`ornement ${o.ou}`} style={{ "--ordre": i } as CSSProperties}>
            <span
              className={`block ${o.boucle === "balance" ? "ornement-balance" : "ornement-bobine"}`}
              style={{ animationDelay: `${-i * 1300}ms`, animationDuration: `${5 + (i % 3)}s` }}
            >
              <Contenu o={o} />
            </span>
          </span>
        ))}
      </span>
    </div>
  );
}
