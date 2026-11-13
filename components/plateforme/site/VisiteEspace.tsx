"use client";

// Visite de l'espace par onglets (site de la plateforme) : des écrans dessinés, pas des captures (aucune donnée réelle).
// Sur téléphone, les onglets tiennent sur une ligne qui défile. En mouvement : l'onglet choisi glisse, les chiffres
// se comptent et les barres montent quand l'écran apparaît (rien de tout cela si l'appareil demande moins de mouvements).
import { createContext, useContext, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { CalendarDays, Check, CreditCard, LayoutDashboard, Search, UserRound, Users, type LucideIcon } from "lucide-react";
import { Marque } from "@/components/plateforme/site/MarqueSite";

const CARTE = "rounded-[10px] bg-white border border-line";
const PISTE = "rounded bg-[#e6e3dc]";

// Vrai dès qu'un onglet a été choisi : l'écran qui arrive est en mouvement
const ContexteVisite = createContext(false);

const delai = (ms: number) => ({ "--delai": `${ms}ms` }) as CSSProperties;
const formater = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// Le chiffre d'une tuile se compte de zéro à sa valeur (0,9 s) quand il apparaît ; il reste tel quel s'il est déjà à
// l'écran au chargement de la page, ou si l'appareil demande moins de mouvements
function useCompteur(valeur: string) {
  const ref = useRef<HTMLSpanElement>(null);
  const interagi = useContext(ContexteVisite);

  useEffect(() => {
    const el = ref.current;
    const m = /\d[\d\s]*\d|\d/.exec(valeur);
    if (!el || !m || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const enVue = r.top < window.innerHeight && r.bottom > 0;
    if (enVue && !interagi) return;

    const cible = Number(m[0].replace(/\s/g, ""));
    const avant = valeur.slice(0, m.index);
    const apres = valeur.slice(m.index + m[0].length);
    const ecrire = (n: number) => {
      el.textContent = avant + formater(n) + apres;
    };
    let image = 0;
    const compter = () => {
      const debut = performance.now();
      const pas = (t: number) => {
        const p = Math.min(1, (t - debut) / 900);
        ecrire(cible * (1 - Math.pow(1 - p, 3)));
        if (p < 1) image = requestAnimationFrame(pas);
      };
      image = requestAnimationFrame(pas);
    };

    ecrire(0);
    if (enVue || !("IntersectionObserver" in window)) {
      compter();
      return () => cancelAnimationFrame(image);
    }
    const obs = new IntersectionObserver(
      (entrees) => {
        if (!entrees.some((e) => e.isIntersecting)) return;
        compter();
        obs.disconnect();
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(image);
    };
  }, [valeur, interagi]);

  return ref;
}

// Une donnée : le libellé, le chiffre, et ce à quoi il se compare
function Tuile({ libelle, valeur, detail }: { libelle: string; valeur: string; detail?: string }) {
  const chiffre = useCompteur(valeur);
  return (
    <div className={`${CARTE} p-3 sm:p-4 min-w-0`}>
      <span className="block text-[12px] text-muted truncate">{libelle}</span>
      <span ref={chiffre} className="mono block mt-1 text-[18px] sm:text-[22px] font-medium text-ink truncate">{valeur}</span>
      {detail ? <span className="block mt-1 text-[11px] text-muted truncate">{detail}</span> : null}
    </div>
  );
}

function Statut({ ton, children }: { ton: "ok" | "attente" | "retard"; children: ReactNode }) {
  const t = { ok: "bg-success-soft text-success-strong", attente: "bg-surface-2 text-muted", retard: "bg-accent-soft text-accent-strong" }[ton];
  return <span className={`inline-flex rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${t}`}>{children}</span>;
}

const Initiales = ({ nom }: { nom: string }) => (
  <span className="grid place-items-center size-8 rounded-[8px] bg-marque-nuit text-[11px] font-medium text-white shrink-0">
    {nom.split(" ").map((m) => m[0]).join("").slice(0, 2)}
  </span>
);

const MOIS = ["juin", "juil.", "août", "sept.", "oct.", "nov."];

function EcranTableau() {
  const barres = [42, 58, 51, 73, 66, 88];
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Tuile libelle="Membres à jour" valeur="128" detail="+6 vs octobre" />
        <Tuile libelle="Encaissé ce mois" valeur="18 400 $" detail="+2 150 $ vs octobre" />
        <Tuile libelle="Événements à venir" valeur="4" detail="166 inscrits" />
        <Tuile libelle="Demandes d’adhésion" valeur="3" detail="à examiner" />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className={`${CARTE} p-4`}>
          <span className="block text-[12px] font-medium text-ink">Encaissements, six mois</span>
          <div className="mt-4 h-[112px] flex items-end gap-2 sm:gap-4">
            {barres.map((h, i) => (
              <span key={i} className={`pousse-y flex-1 rounded-t-[4px] ${i === barres.length - 1 ? "bg-success" : "bg-[#e6e3dc]"}`} style={{ height: `${h}%`, ...delai(i * 60) }} />
            ))}
          </div>
          <div className="mt-2 flex gap-2 sm:gap-4">
            {MOIS.map((m) => <span key={m} className="mono flex-1 text-center text-[11px] text-muted">{m}</span>)}
          </div>
        </div>
        <div className={`${CARTE} p-4`}>
          <span className="block text-[12px] font-medium text-ink mb-3">Prochains événements</span>
          {[["Petit-déjeuner d’affaires", 78], ["Atelier export", 46], ["Soirée du réseau", 61]].map(([nom, taux], i) => (
            <div key={nom} className="mb-3 last:mb-0">
              <div className="flex justify-between gap-2 text-[11px] text-muted mb-1"><span className="truncate">{nom}</span><span className="mono">{taux} %</span></div>
              <div className="h-1.5 rounded-full bg-[#eeebe5]"><div className="pousse-x h-full rounded-full bg-marque-nuit" style={{ width: `${taux}%`, ...delai(200 + i * 90) }} /></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const MEMBRES: [string, string, "ok" | "attente" | "retard", string][] = [
  ["Boréal Conseil", "PME", "ok", "À jour"],
  ["Maison Ravel", "Entreprise", "ok", "À jour"],
  ["Lumen Studio", "Jeune entreprise", "attente", "Demande"],
  ["Nord Logistique", "PME", "retard", "En retard"],
  ["Atelier Sève", "Entreprise", "ok", "À jour"],
];

function EcranMembres() {
  return (
    <div className={`${CARTE} overflow-hidden`}>
      <div className="flex items-center gap-2 p-3 border-b border-line">
        <span className="flex-1 flex items-center gap-2 h-8 rounded-[8px] border border-line bg-surface-2 px-2.5 text-[12px] text-faint"><Search size={14} strokeWidth={1.5} /> Rechercher</span>
        <span className="h-8 px-3 rounded-[8px] grid place-items-center text-[12px] font-medium text-white bg-marque-rouge">Ajouter</span>
      </div>
      {MEMBRES.map(([nom, formule, ton, statut]) => (
        <div key={nom} className="flex items-center gap-3 px-3 sm:px-4 h-12 border-b border-line last:border-b-0">
          <Initiales nom={nom} />
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-medium text-ink truncate">{nom}</span>
            <span className="block text-[11px] text-muted truncate">{formule}</span>
          </span>
          <span className={`hidden sm:block w-24 h-2 ${PISTE}`} />
          <Statut ton={ton}>{statut}</Statut>
        </div>
      ))}
    </div>
  );
}

function EcranEvenements() {
  const evenements = [
    { jour: "12", mois: "déc.", nom: "Petit-déjeuner d’affaires", lieu: "Salle du conseil", inscrits: 47, places: 60 },
    { jour: "18", mois: "déc.", nom: "Atelier export", lieu: "En ligne", inscrits: 23, places: 50 },
    { jour: "9", mois: "janv.", nom: "Soirée du réseau", lieu: "Hôtel de ville", inscrits: 92, places: 150 },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {evenements.map((e, i) => (
        <div key={e.nom} className={`${CARTE} p-4 flex md:flex-col gap-3`}>
          <span className="grid place-items-center w-12 h-14 rounded-[8px] bg-marque-nuit text-white shrink-0 leading-none">
            <span className="text-center"><span className="mono block text-[17px] font-medium">{e.jour}</span><span className="block mt-1 text-[11px] text-white/70">{e.mois}</span></span>
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-medium text-ink truncate">{e.nom}</span>
            <span className="block text-[11px] text-muted">{e.lieu}</span>
            <span className="block mt-3 h-1.5 rounded-full bg-[#eeebe5]"><span className="pousse-x block h-full rounded-full bg-marque-nuit" style={{ width: `${(e.inscrits / e.places) * 100}%`, ...delai(i * 90) }} /></span>
            <span className="mono block mt-1.5 text-[11px] text-muted">{e.inscrits} inscrits sur {e.places}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function EcranPaiements() {
  const factures: [string, string, string, "ok" | "attente"][] = [
    ["F-118", "Boréal Conseil", "450 $", "ok"],
    ["F-117", "Maison Ravel", "900 $", "ok"],
    ["F-116", "Nord Logistique", "450 $", "attente"],
    ["F-115", "Atelier Sève", "900 $", "ok"],
  ];
  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Tuile libelle="Encaissé" valeur="18 400 $" detail="novembre" />
        <Tuile libelle="En attente" valeur="2 150 $" detail="3 factures" />
        <Tuile libelle="Payé par carte" valeur="86 %" detail="+4 pts vs octobre" />
      </div>
      <div className={`${CARTE} mt-3 overflow-hidden`}>
        {factures.map(([n, nom, montant, ton]) => (
          <div key={n} className="flex items-center gap-3 px-3 sm:px-4 h-11 border-b border-line last:border-b-0 text-[12px] sm:text-[13px]">
            <span className="mono w-12 text-muted">{n}</span>
            <span className="flex-1 min-w-0 truncate text-ink">{nom}</span>
            <span className="mono font-medium text-ink">{montant}</span>
            <Statut ton={ton}>{ton === "ok" ? "Payée par carte" : "À régler"}</Statut>
          </div>
        ))}
      </div>
    </>
  );
}

// L'espace d'un membre : sa carte de membre, rendue en code, est le moment de cette vue
function EcranMembre() {
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className={`${CARTE} p-4`}>
        <div className="rounded-[12px] p-4 sm:p-5 text-white" style={{ background: "linear-gradient(135deg, #18293b 0%, #0f1d2c 65%)" }}>
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-[11px] text-white/60">Carte de membre</span>
              <span className="block text-[13px] sm:text-[14px] font-medium truncate">Chambre de commerce de la Vallée</span>
            </span>
            <Marque className="w-2 h-6" />
          </div>
          <div className="mt-7 sm:mt-9 flex items-end justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-[15px] sm:text-[17px] font-medium truncate">Boréal Conseil</span>
              <span className="block text-[11px] text-white/60">Membre depuis 2021 · Formule PME</span>
            </span>
            <span className="mono text-[11px] text-white/80">2026</span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium text-ink">Ma cotisation</span>
          <Statut ton="ok">À jour</Statut>
        </div>
        <span className="block mt-1 text-[11px] text-muted">Renouvellement en janvier</span>
        <span className="block mt-4 text-[13px] font-medium text-ink">Mes inscriptions</span>
        {["Petit-déjeuner d’affaires · 12 déc.", "Soirée du réseau · 9 janv."].map((t) => (
          <span key={t} className="flex items-center gap-2 mt-2 text-[12px] text-ink"><Check size={14} strokeWidth={1.5} className="text-muted shrink-0" /> {t}</span>
        ))}
      </div>
      <div className={`${CARTE} p-4`}>
        <span className="block text-[12px] font-medium text-ink mb-2">Mises en relation suggérées</span>
        {MEMBRES.slice(0, 3).map(([nom, formule]) => (
          <div key={nom} className="flex items-center gap-2.5 h-12 border-b border-line last:border-b-0">
            <Initiales nom={nom} />
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] font-medium text-ink truncate">{nom}</span>
              <span className="block text-[11px] text-muted truncate">{formule}</span>
            </span>
            <span className="h-7 px-2.5 rounded-[6px] grid place-items-center border border-line text-[11px] font-medium text-ink">Contacter</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ONGLETS: { cle: string; libelle: string; Icone: LucideIcon; titre: string; texte: string; Ecran: () => ReactNode; menu: number }[] = [
  { cle: "tableau", libelle: "Tableau de bord", Icone: LayoutDashboard, titre: "Tableau de bord", texte: "membres à jour, encaissements, événements et demandes d’adhésion", Ecran: EcranTableau, menu: 0 },
  { cle: "membres", libelle: "Membres", Icone: Users, titre: "Membres", texte: "liste des entreprises membres, leur formule et leur statut", Ecran: EcranMembres, menu: 1 },
  { cle: "evenements", libelle: "Événements", Icone: CalendarDays, titre: "Événements", texte: "événements à venir et inscriptions", Ecran: EcranEvenements, menu: 2 },
  { cle: "paiements", libelle: "Paiements", Icone: CreditCard, titre: "Paiements", texte: "cotisations encaissées, en attente et payées par carte", Ecran: EcranPaiements, menu: 3 },
  { cle: "membre", libelle: "Espace membre", Icone: UserRound, titre: "Bonjour, Boréal Conseil", texte: "l’espace d’un membre : sa carte de membre, sa cotisation, ses inscriptions et des mises en relation", Ecran: EcranMembre, menu: -1 },
];

export function VisiteEspace() {
  const id = useId();
  const [actif, setActif] = useState(0);
  const [interagi, setInteragi] = useState(false);
  const boutons = useRef<(HTMLButtonElement | null)[]>([]);
  const indicateur = useRef<HTMLSpanElement>(null);
  const panneau = useRef<HTMLDivElement>(null);
  const o = ONGLETS[actif];

  // Le fond de l'onglet choisi glisse jusqu'à lui (et suit sa largeur)
  useEffect(() => {
    const b = boutons.current[actif];
    const ind = indicateur.current;
    if (!b || !ind) return;
    const placer = () => {
      ind.style.transform = `translateX(${b.offsetLeft}px)`;
      ind.style.width = `${b.offsetWidth}px`;
      ind.style.opacity = "1";
    };
    placer();
    const taille = new ResizeObserver(placer);
    taille.observe(b);
    return () => taille.disconnect();
  }, [actif]);

  // Les barres montent quand l'aperçu entre dans l'écran
  useEffect(() => {
    const el = panneau.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("est-visible");
      return;
    }
    const obs = new IntersectionObserver(
      (entrees) => {
        if (!entrees.some((e) => e.isIntersecting)) return;
        el.classList.add("est-visible");
        obs.disconnect();
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Sur téléphone, l'onglet choisi vient au centre de la ligne
  const montrer = (b: HTMLButtonElement | null) => b?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  const choisir = (i: number, e?: MouseEvent<HTMLButtonElement>) => {
    setActif(i);
    setInteragi(true);
    montrer(e?.currentTarget ?? boutons.current[i]);
  };

  // Flèches, Début, Fin : d'un onglet à l'autre
  const clavier = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = ONGLETS.length;
    const cible = { ArrowRight: (actif + 1) % n, ArrowLeft: (actif - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (cible === undefined) return;
    e.preventDefault();
    choisir(cible);
    boutons.current[cible]?.focus();
  };

  return (
    <div>
      <div className="-mx-5 px-5 sm:mx-0 sm:px-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div role="tablist" aria-label="Visite de l’espace" onKeyDown={clavier} className="relative inline-flex gap-1 p-1 rounded-[10px] border border-line bg-surface-2 whitespace-nowrap">
          <span ref={indicateur} aria-hidden className="visite-indicateur absolute top-1 bottom-1 left-0 w-0 rounded-[6px] bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.05)] opacity-0 pointer-events-none" />
          {ONGLETS.map((t, i) => (
            <button
              key={t.cle}
              ref={(b) => { boutons.current[i] = b; }}
              type="button"
              role="tab"
              id={`${id}-onglet-${t.cle}`}
              aria-selected={i === actif}
              aria-controls={`${id}-panneau`}
              tabIndex={i === actif ? 0 : -1}
              onClick={(e) => choisir(i, e)}
              className={`relative z-[1] inline-flex items-center gap-2 h-9 px-4 rounded-[6px] border-0 bg-transparent text-[14px] font-medium cursor-pointer transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marque-nuit ${
                i === actif ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              <t.Icone size={16} strokeWidth={1.5} aria-hidden /> {t.libelle}
            </button>
          ))}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`${id}-panneau`}
        aria-labelledby={`${id}-onglet-${o.cle}`}
        tabIndex={0}
        className="mt-6 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-marque-nuit"
      >
        <div ref={panneau} role="img" aria-label={`Illustration de l’espace : ${o.texte}`} className="visite select-none rounded-2xl border border-line bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 h-10 border-b border-line bg-surface-2">
            <span className="size-2.5 rounded-full bg-[#dcd8d0]" />
            <span className="size-2.5 rounded-full bg-[#dcd8d0]" />
            <span className="size-2.5 rounded-full bg-[#dcd8d0]" />
            <span className="ml-3 h-5 flex-1 max-w-[280px] rounded-full bg-surface border border-line" />
          </div>
          <div className="flex min-h-[340px] sm:min-h-[400px]">
            <div
              className="hidden sm:flex w-[152px] lg:w-[180px] shrink-0 flex-col gap-1 p-3"
              style={{ background: o.menu < 0 ? "linear-gradient(180deg, #0f1d2c 0%, #006b3c 100%)" : "linear-gradient(180deg, #8c0a0a 0%, #1d2a36 55%, #006b3c 100%)" }}
            >
              <span className="h-2.5 w-16 rounded bg-white/70 mb-4 mt-1" />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={`h-8 rounded-[6px] flex items-center px-2 ${i === o.menu ? "bg-white/15" : ""}`}>
                  <span className="h-2 rounded bg-white/45" style={{ width: `${72 - i * 7}%` }} />
                </span>
              ))}
            </div>
            <div key={o.cle} className="flex-1 min-w-0 p-4 sm:p-6 bg-[#f6f4ef] anim-fondu">
              <span className={`block h-2 w-20 ${PISTE}`} />
              <span className="block mt-2 mb-4 text-[16px] sm:text-[18px] font-semibold text-ink">{o.titre}</span>
              <ContexteVisite.Provider value={interagi}>
                <o.Ecran />
              </ContexteVisite.Provider>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
