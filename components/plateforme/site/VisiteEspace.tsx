"use client";

// Visite de l'espace par onglets (site de la plateforme) : des écrans dessinés, pas des captures (aucune donnée réelle)
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CalendarDays, CheckCircle2, CreditCard, LayoutDashboard, Search, UserRound, Users, type LucideIcon } from "lucide-react";

const PISTE = "rounded bg-[#d5dce5]";
const CARTE = "rounded-xl bg-white border border-line";

function Tuile({ libelle, valeur, teinte, Icone }: { libelle: string; valeur: string; teinte: string; Icone: LucideIcon }) {
  return (
    <div className={`${CARTE} p-3 sm:p-4 min-w-0`}>
      <span className={`grid place-items-center size-7 sm:size-8 rounded-lg text-white ${teinte}`}><Icone size={15} /></span>
      <span className="block mt-2.5 text-[11px] sm:text-[12px] text-muted truncate">{libelle}</span>
      <span className="block text-[15px] sm:text-[20px] font-extrabold text-ink tabular-nums truncate">{valeur}</span>
    </div>
  );
}

function Statut({ ton, children }: { ton: "ok" | "attente" | "retard"; children: ReactNode }) {
  const t = { ok: "bg-marque-vert/10 text-marque-vert", attente: "bg-[#fff4dc] text-[#8a5a00]", retard: "bg-accent-soft text-marque-rouge" }[ton];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] sm:text-[11.5px] font-bold whitespace-nowrap ${t}`}>{children}</span>;
}

const Initiales = ({ nom, teinte }: { nom: string; teinte: string }) => (
  <span className={`grid place-items-center size-7 sm:size-8 rounded-lg text-[10.5px] sm:text-[11.5px] font-bold text-white shrink-0 ${teinte}`}>
    {nom.split(" ").map((m) => m[0]).join("").slice(0, 2)}
  </span>
);

function EcranTableau() {
  const barres = [42, 58, 51, 73, 66, 88];
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <Tuile Icone={Users} libelle="Membres à jour" valeur="128" teinte="bg-marque-nuit" />
        <Tuile Icone={CreditCard} libelle="Encaissé ce mois" valeur="18 400 $" teinte="bg-marque-vert" />
        <Tuile Icone={CalendarDays} libelle="Événements à venir" valeur="4" teinte="bg-marque-rouge" />
        <Tuile Icone={UserRound} libelle="Demandes d’adhésion" valeur="3" teinte="bg-[#2f5d8a]" />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className={`${CARTE} p-4`}>
          <span className="block text-[12.5px] font-bold text-ink">Encaissements</span>
          <div className="mt-4 h-[110px] flex items-end gap-2.5 sm:gap-4">
            {barres.map((h, i) => (
              <span key={i} className={`flex-1 rounded-t-md ${i === barres.length - 1 ? "bg-marque-vert" : "bg-[#cfe6da]"}`} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className={`${CARTE} p-4`}>
          <span className="block text-[12.5px] font-bold text-ink mb-3">Prochains événements</span>
          {[["Petit-déjeuner d’affaires", 78], ["Atelier export", 46], ["Soirée du réseau", 61]].map(([nom, taux]) => (
            <div key={nom} className="mb-2.5 last:mb-0">
              <div className="flex justify-between text-[11.5px] text-muted mb-1"><span className="truncate">{nom}</span><span className="tabular-nums">{taux} %</span></div>
              <div className="h-1.5 rounded-full bg-[#e8edf2]"><div className="h-full rounded-full bg-marque-vert" style={{ width: `${taux}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const MEMBRES: [string, string, "ok" | "attente" | "retard", string, string][] = [
  ["Boréal Conseil", "PME", "ok", "À jour", "bg-marque-nuit"],
  ["Maison Ravel", "Entreprise", "ok", "À jour", "bg-marque-vert"],
  ["Lumen Studio", "Jeune entreprise", "attente", "Demande", "bg-[#2f5d8a]"],
  ["Nord Logistique", "PME", "retard", "En retard", "bg-marque-rouge"],
  ["Atelier Sève", "Entreprise", "ok", "À jour", "bg-[#6b4f8a]"],
];

function EcranMembres() {
  return (
    <div className={`${CARTE} overflow-hidden`}>
      <div className="flex items-center gap-2.5 p-3 border-b border-line">
        <span className="flex-1 flex items-center gap-2 h-8 rounded-lg border border-line bg-surface-2 px-2.5 text-[11.5px] text-faint"><Search size={13} /> Rechercher un membre</span>
        <span className="h-8 px-3 rounded-lg grid place-items-center text-[11px] font-bold uppercase tracking-[0.06em] text-white" style={{ backgroundImage: "var(--bouton-rouge)" }}>Ajouter</span>
      </div>
      {MEMBRES.map(([nom, formule, ton, statut, teinte]) => (
        <div key={nom} className="flex items-center gap-3 px-3 sm:px-4 py-2.5 border-b border-line last:border-b-0">
          <Initiales nom={nom} teinte={teinte} />
          <span className="flex-1 min-w-0">
            <span className="block text-[12.5px] sm:text-[13px] font-bold text-ink truncate">{nom}</span>
            <span className="block text-[11px] text-muted truncate">{formule}</span>
          </span>
          <span className={`hidden sm:block w-28 h-2 ${PISTE}`} />
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
    { jour: "09", mois: "janv.", nom: "Soirée du réseau", lieu: "Hôtel de ville", inscrits: 92, places: 150 },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {evenements.map((e) => (
        <div key={e.nom} className={`${CARTE} p-4 flex md:flex-col gap-3`}>
          <span className="grid place-items-center w-12 h-14 rounded-lg bg-marque-nuit text-white shrink-0 leading-none">
            <span className="text-center"><span className="block text-[17px] font-extrabold">{e.jour}</span><span className="block mt-0.5 text-[10px] uppercase">{e.mois}</span></span>
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-bold text-ink truncate">{e.nom}</span>
            <span className="block text-[11.5px] text-muted">{e.lieu}</span>
            <span className="block mt-3 h-1.5 rounded-full bg-[#e8edf2]"><span className="block h-full rounded-full bg-marque-rouge" style={{ width: `${(e.inscrits / e.places) * 100}%` }} /></span>
            <span className="block mt-1.5 text-[11px] text-muted tabular-nums">{e.inscrits} inscrits sur {e.places}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function EcranPaiements() {
  const factures: [string, string, string, "ok" | "attente"][] = [
    ["F-118", "Boréal Conseil", "450,00 $", "ok"],
    ["F-117", "Maison Ravel", "900,00 $", "ok"],
    ["F-116", "Nord Logistique", "450,00 $", "attente"],
    ["F-115", "Atelier Sève", "900,00 $", "ok"],
  ];
  return (
    <>
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <Tuile Icone={CheckCircle2} libelle="Encaissé" valeur="18 400 $" teinte="bg-marque-vert" />
        <Tuile Icone={CreditCard} libelle="En attente" valeur="2 150 $" teinte="bg-marque-rouge" />
        <Tuile Icone={CreditCard} libelle="Payé par carte" valeur="86 %" teinte="bg-marque-nuit" />
      </div>
      <div className={`${CARTE} mt-3 overflow-hidden`}>
        {factures.map(([n, nom, montant, ton]) => (
          <div key={n} className="flex items-center gap-3 px-3 sm:px-4 py-2.5 border-b border-line last:border-b-0 text-[12px] sm:text-[13px]">
            <span className="w-12 font-bold text-ink tabular-nums">{n}</span>
            <span className="flex-1 min-w-0 truncate text-ink">{nom}</span>
            <span className="font-bold text-ink tabular-nums">{montant}</span>
            <Statut ton={ton}>{ton === "ok" ? "Payée par carte" : "À régler"}</Statut>
          </div>
        ))}
      </div>
    </>
  );
}

function EcranMembre() {
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className={`${CARTE} p-4`}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-bold text-ink">Ma cotisation</span>
          <Statut ton="ok">À jour</Statut>
        </div>
        <span className="block mt-2 text-[11.5px] text-muted">Formule PME · renouvellement en janvier</span>
        <span className="mt-4 inline-flex h-8 px-3 rounded-lg items-center text-[11px] font-bold uppercase tracking-[0.06em] text-white" style={{ backgroundImage: "var(--bouton-rouge)" }}>Mes factures</span>
        <span className="block mt-5 text-[13px] font-bold text-ink">Mes inscriptions</span>
        {["Petit-déjeuner d’affaires · 12 déc.", "Soirée du réseau · 9 janv."].map((t) => (
          <span key={t} className="flex items-center gap-2 mt-2 text-[12px] text-ink"><CheckCircle2 size={14} className="text-marque-vert shrink-0" /> {t}</span>
        ))}
      </div>
      <div className={`${CARTE} p-4`}>
        <span className="block text-[13px] font-bold text-ink mb-3">Suggestions de mises en relation</span>
        {MEMBRES.slice(0, 3).map(([nom, formule, , , teinte]) => (
          <div key={nom} className="flex items-center gap-2.5 py-2 border-b border-line last:border-b-0">
            <Initiales nom={nom} teinte={teinte} />
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] font-bold text-ink truncate">{nom}</span>
              <span className="block text-[11px] text-muted truncate">{formule}</span>
            </span>
            <span className="h-7 px-2.5 rounded-md grid place-items-center border border-line text-[10.5px] font-bold text-ink">Contacter</span>
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
  { cle: "membre", libelle: "Espace membre", Icone: UserRound, titre: "Bonjour, Boréal Conseil", texte: "l’espace d’un membre : sa cotisation, ses inscriptions et des mises en relation", Ecran: EcranMembre, menu: -1 },
];

export function VisiteEspace() {
  const id = useId();
  const [actif, setActif] = useState(0);
  const boutons = useRef<(HTMLButtonElement | null)[]>([]);
  const o = ONGLETS[actif];

  // Flèches, Début, Fin : d'un onglet à l'autre
  const clavier = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = ONGLETS.length;
    const cible = { ArrowRight: (actif + 1) % n, ArrowLeft: (actif - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (cible === undefined) return;
    e.preventDefault();
    setActif(cible);
    boutons.current[cible]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Visite de l’espace" onKeyDown={clavier} className="flex flex-wrap justify-center gap-2">
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
            onClick={() => setActif(i)}
            className={`inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full border text-[14px] font-semibold cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marque-nuit ${
              i === actif ? "bg-marque-nuit border-marque-nuit text-white" : "bg-white border-line text-muted hover:text-ink hover:border-[#cdd6e1]"
            }`}
          >
            <t.Icone size={16} aria-hidden /> {t.libelle}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${id}-panneau`}
        aria-labelledby={`${id}-onglet-${o.cle}`}
        tabIndex={0}
        className="mt-8 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-marque-nuit"
      >
        <div role="img" aria-label={`Illustration de l’espace : ${o.texte}`} className="relative select-none rounded-2xl border border-line bg-white shadow-[0_50px_100px_-48px_rgba(15,29,44,0.55)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 h-10 border-b border-line bg-surface-2">
            <span className="size-2.5 rounded-full bg-[#e5e9ef]" />
            <span className="size-2.5 rounded-full bg-[#e5e9ef]" />
            <span className="size-2.5 rounded-full bg-[#e5e9ef]" />
            <span className="ml-3 h-5 flex-1 max-w-[300px] rounded-full bg-white border border-line" />
          </div>
          <div className="flex min-h-[340px] sm:min-h-[400px]">
            <div
              className="hidden sm:flex w-[150px] lg:w-[180px] shrink-0 flex-col gap-1.5 p-3"
              style={{ background: o.menu < 0 ? "linear-gradient(180deg, #0f1d2c 0%, #006b3c 100%)" : "linear-gradient(180deg, #8c0a0a 0%, #1d2a36 55%, #006b3c 100%)" }}
            >
              <span className="h-2.5 w-16 rounded bg-white/70 mb-4 mt-1" />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={`h-7 rounded-md flex items-center px-2 ${i === o.menu ? "bg-white/20" : ""}`}>
                  <span className="h-2 rounded bg-white/45" style={{ width: `${72 - i * 7}%` }} />
                </span>
              ))}
            </div>
            <div key={o.cle} className="flex-1 min-w-0 p-3.5 sm:p-6 bg-[#f5f7fa] anim-fondu">
              <span className={`block h-2 w-20 ${PISTE}`} />
              <span className="block mt-2 mb-4 text-[16px] sm:text-[19px] font-extrabold text-ink">{o.titre}</span>
              <o.Ecran />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
