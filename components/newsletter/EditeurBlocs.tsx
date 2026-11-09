"use client";

import { createContext, useContext, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Baseline,
  Bold,
  BadgeCheck,
  Copy,
  Eraser,
  Heading,
  Image as IconeImage,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Megaphone,
  Minus,
  MousePointerClick,
  MoveVertical,
  Paintbrush,
  PanelBottom,
  PanelTop,
  Plus,
  Share2,
  Trash2,
  Type,
  Underline,
  X,
} from "lucide-react";
import { televerserImageLettre } from "@/lib/actions/newsletter";
import {
  COULEURS,
  DEGRADE,
  hex,
  LARGEUR,
  nettoyerHtml,
  nouvelId,
  PALETTE,
  RESEAUX,
  sectionVide,
  TYPES_SECTION,
  urlSure,
  VARIABLES,
  versHtml,
  type Align,
  type Couleur,
  type DocLettre,
  type Fond,
  type Reseau,
  type Section,
  type TypeSection,
} from "@/lib/lettre-blocs";

const COORDONNEES_APERCU = { adresse: "Antananarivo, Madagascar", email: "info@cancham.mg", telephone: "+261 34 50 280 53", confidentialite: "" };
// Variables proposées dans la barre de mise en forme (newsletter par défaut ; un rappel a les siennes)
const VariablesProposees = createContext<readonly { cle: string; libelle: string }[]>(VARIABLES);
const BLEU = "#3b82f6"; // repères de l'éditeur (survol, sélection) : jamais dans la lettre

// Lettre envoyée : son rendu exact, dans un cadre
export function ApercuLettre({ doc, hauteur = 720 }: { doc: DocLettre; hauteur?: number }) {
  const html = useMemo(
    () =>
      versHtml(doc, {
        base: typeof window === "undefined" ? "" : window.location.origin,
        vars: { prenom: "Noro", nom: "Noro Rasoanaivo", entreprise: "Bio Sud Essences", email: "noro@exemple.mg" },
        mention: "Vous recevez ce message en tant que membre de la Chambre.",
        desabonnement: null,
        coordonnees: COORDONNEES_APERCU,
      }),
    [doc],
  );
  return <iframe title="Aperçu de la lettre" srcDoc={html} sandbox="" className="w-full bg-white rounded-[var(--radius-m)] border border-line" style={{ height: hauteur }} />;
}

const fondCss = (f: Fond, image = ""): CSSProperties =>
  image
    ? { backgroundColor: hex("rouge"), backgroundImage: `url('${image}')`, backgroundSize: "cover", backgroundPosition: "center" }
    : f === "degrade"
      ? { backgroundColor: hex("rouge"), backgroundImage: DEGRADE }
      : f
        ? { backgroundColor: hex(f) }
        : {};

async function televerser(f: File): Promise<string | null> {
  const fd = new FormData();
  fd.set("image", f);
  const r = await televerserImageLettre(fd).catch(() => ({ erreur: "Le téléversement n’a pas abouti." }));
  if ("url" in r) return r.url;
  window.alert(r.erreur);
  return null;
}
const demanderLien = (actuel: string, question = "Adresse du lien (https://…). Laissez vide pour le retirer.") => {
  const r = window.prompt(question, actuel);
  return r === null ? null : urlSure(r);
};

// Texte mis en forme modifiable sur place, avec sa barre : gras, italique, souligné, couleur (palette),
// alignement du paragraphe (début, milieu, fin, justifié), listes, lien, variables, effacer la mise en forme
function TexteRiche({ html, onChange, style, ligne = false, placeholder = "Texte" }: {
  html: string; onChange: (h: string) => void; style?: CSSProperties; ligne?: boolean; placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [initial] = useState(html);
  const [actif, setActif] = useState(false);
  const [teintes, setTeintes] = useState(false);
  const variables = useContext(VariablesProposees);
  const commande = (c: string, v?: string) => {
    ref.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(c, false, v);
    onChange(nettoyerHtml(ref.current?.innerHTML ?? ""));
  };
  const B = "w-8 h-8 grid place-items-center rounded-md border-0 bg-transparent text-[#16202b] cursor-pointer hover:bg-[#f1f4f7]";
  const sep = <span className="w-px h-5 bg-[#e5eaf0] mx-0.5" />;
  return (
    <div className="relative" onFocus={() => setActif(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setActif(false); setTeintes(false); } }}>
      {actif ? (
        <div className="absolute -top-12 left-0 z-30 flex items-center gap-0.5 rounded-xl border border-[#e5eaf0] bg-white px-1.5 py-1 shadow-[0_8px_24px_-8px_rgb(15_29_44/0.25)]" onMouseDown={(e) => e.preventDefault()} style={{ fontFamily: "var(--font-texte)" }}>
          <button type="button" className={B} onClick={() => commande("bold")} aria-label="Gras" title="Gras"><Bold size={15} /></button>
          <button type="button" className={B} onClick={() => commande("italic")} aria-label="Italique" title="Italique"><Italic size={15} /></button>
          <button type="button" className={B} onClick={() => commande("underline")} aria-label="Souligné" title="Souligné"><Underline size={15} /></button>
          <span className="relative">
            <button type="button" className={B} onClick={() => setTeintes((t) => !t)} aria-label="Couleur du texte" title="Couleur du texte (palette)"><Baseline size={15} /></button>
            {teintes ? (
              <span className="absolute top-10 left-0 z-40 grid grid-cols-6 gap-1.5 rounded-xl border border-[#e5eaf0] bg-white p-2 shadow-lg w-[196px]">
                {COULEURS.map((c) => (
                  <button key={c} type="button" onClick={() => { commande("foreColor", hex(c)); setTeintes(false); }} title={PALETTE[c].libelle} aria-label={PALETTE[c].libelle}
                    className="w-6 h-6 rounded-full border border-[#d5d8dd] cursor-pointer hover:scale-110 transition-transform" style={{ background: hex(c) }} />
                ))}
              </span>
            ) : null}
          </span>
          {sep}
          <button type="button" className={B} onClick={() => commande("justifyLeft")} aria-label="Aligner au début" title="Aligner au début"><AlignLeft size={15} /></button>
          <button type="button" className={B} onClick={() => commande("justifyCenter")} aria-label="Centrer" title="Centrer"><AlignCenter size={15} /></button>
          <button type="button" className={B} onClick={() => commande("justifyRight")} aria-label="Aligner à la fin" title="Aligner à la fin"><AlignRight size={15} /></button>
          <button type="button" className={B} onClick={() => commande("justifyFull")} aria-label="Justifier" title="Justifier"><AlignJustify size={15} /></button>
          {sep}
          <button type="button" className={B} onClick={() => commande("insertUnorderedList")} aria-label="Liste à puces" title="Liste à puces"><List size={15} /></button>
          <button type="button" className={B} onClick={() => commande("insertOrderedList")} aria-label="Liste numérotée" title="Liste numérotée"><ListOrdered size={15} /></button>
          <button type="button" className={B} onClick={() => { const u = demanderLien("", "Adresse du lien (https://…)"); if (u) commande("createLink", u); }} aria-label="Lien" title="Lien"><Link2 size={15} /></button>
          <button type="button" className={B} onClick={() => commande("removeFormat")} aria-label="Effacer la mise en forme" title="Effacer la mise en forme"><Eraser size={15} /></button>
          {sep}
          <select value="" onChange={(e) => { if (e.target.value) commande("insertText", `{${e.target.value}}`); }} aria-label="Insérer une variable"
            className="h-8 rounded-md border-0 bg-transparent text-[12.5px] font-semibold text-[#16202b] cursor-pointer hover:bg-[#f1f4f7] px-1">
            <option value="">+ Variable</option>
            {variables.map((v) => <option key={v.cle} value={v.cle}>{v.libelle}</option>)}
          </select>
        </div>
      ) : null}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        aria-label={placeholder}
        data-vide={placeholder}
        onKeyDown={(e) => { if (ligne && e.key === "Enter") e.preventDefault(); }}
        onInput={(e) => onChange(nettoyerHtml(e.currentTarget.innerHTML))}
        onPaste={(e) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
        dangerouslySetInnerHTML={{ __html: initial }}
        className="outline-none rounded-sm cursor-text focus:ring-2 focus:ring-[#3b82f6]/60 empty:before:content-[attr(data-vide)] empty:before:opacity-50 [&_a]:text-[#ad0707] [&_a]:no-underline [&_ul]:pl-6 [&_ul]:list-disc [&_ol]:pl-6 [&_ol]:list-decimal [&_p]:m-0 [&_p]:mb-3"
        style={style}
      />
    </div>
  );
}

function BoutonImage({ onUrl, libelle, sombre = true }: { onUrl: (u: string) => void; libelle: string; sombre?: boolean }) {
  const [enCours, setEnCours] = useState(false);
  return (
    <label className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-semibold cursor-pointer ${sombre ? "bg-[#0f1d2c] text-white hover:bg-[#1b2f45]" : "bg-white text-[#0f1d2c] border border-line hover:border-[#0f1d2c]"} ${enCours ? "opacity-60 pointer-events-none" : ""}`}>
      {enCours ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {libelle}
      <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        setEnCours(true);
        const u = await televerser(f);
        setEnCours(false);
        if (u) onUrl(u);
      }} />
    </label>
  );
}

const CATALOGUE: Record<TypeSection, { icone: ReactNode; aide: string }> = {
  logo: { icone: <BadgeCheck size={18} />, aide: "Votre logo, centré" },
  bandeau: { icone: <PanelTop size={18} />, aide: "Grand titre sur image ou couleur" },
  titre: { icone: <Heading size={18} />, aide: "Titre de rubrique" },
  texte: { icone: <Type size={18} />, aide: "Paragraphe mis en forme" },
  image: { icone: <IconeImage size={18} />, aide: "Téléversée ou par lien" },
  bouton: { icone: <MousePointerClick size={18} />, aide: "Lien bien visible" },
  appel: { icone: <Megaphone size={18} />, aide: "Titre et bouton sur fond" },
  reseaux: { icone: <Share2 size={18} />, aide: "Icônes de vos pages" },
  pied: { icone: <PanelBottom size={18} />, aide: "Présentation et coordonnées" },
  separateur: { icone: <Minus size={18} />, aide: "Ligne fine" },
  espace: { icone: <MoveVertical size={18} />, aide: "Respiration verticale" },
};

// « + » entre deux sections : une carte avec toutes les sections possibles
function Inserer({ onAjout }: { onAjout: (t: TypeSection) => void }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="group/ins relative h-4 -my-2 z-20 flex items-center justify-center">
      <span className={`absolute inset-x-0 h-0.5 ${ouvert ? "opacity-100" : "opacity-0 group-hover/ins:opacity-100"}`} style={{ background: BLEU }} />
      <button type="button" onClick={() => setOuvert((o) => !o)} aria-label="Ajouter une section ici" aria-expanded={ouvert} title="Ajouter une section ici"
        className={`relative w-7 h-7 rounded-full border-2 border-white text-white grid place-items-center cursor-pointer shadow transition-[opacity,transform] duration-150 ${ouvert ? "opacity-100 rotate-45" : "opacity-0 group-hover/ins:opacity-100 focus:opacity-100"}`} style={{ background: BLEU }}>
        <Plus size={15} />
      </button>
      {ouvert ? (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 w-[min(560px,92vw)] rounded-2xl border border-[#e5eaf0] bg-white p-3 shadow-[0_18px_40px_-12px_rgb(15_29_44/0.35)]" style={{ fontFamily: "var(--font-texte)" }}>
          <div className="flex items-center justify-between px-1 pb-2">
            <b className="text-[13px] text-[#16202b]">Ajouter une section</b>
            <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer" className="w-7 h-7 grid place-items-center rounded-md border-0 bg-transparent text-[#5b6b7a] cursor-pointer hover:bg-[#f1f4f7]"><X size={15} /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {TYPES_SECTION.map((t) => (
              <button key={t.type} type="button" onClick={() => { onAjout(t.type); setOuvert(false); }}
                className="flex items-start gap-2.5 rounded-xl border border-[#e5eaf0] bg-white p-2.5 text-left cursor-pointer transition-colors duration-150 hover:border-[#ad0707] hover:bg-[#fdeaed]/50 group/carte">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-[#f1f4f7] text-[#16202b] grid place-items-center group-hover/carte:bg-[#ad0707] group-hover/carte:text-white transition-colors duration-150">{CATALOGUE[t.type].icone}</span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-[#16202b]">{t.libelle}</span>
                  <span className="block text-[11.5px] leading-snug text-[#5b6b7a]">{CATALOGUE[t.type].aide}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Pastilles de la palette
function Nuancier({ libelle, valeur, onChange, fond = false }: { libelle: string; valeur: string; onChange: (c: never) => void; fond?: boolean }) {
  const choix: { cle: string; style: CSSProperties; nom: string }[] = [
    ...(fond ? [{ cle: "", style: { background: "repeating-linear-gradient(45deg,#fff 0 4px,#e5e7eb 4px 8px)" }, nom: "Aucun" }, { cle: "degrade", style: { backgroundImage: DEGRADE }, nom: "Dégradé rouge → vert" }] : []),
    ...COULEURS.map((c) => ({ cle: c, style: { background: hex(c) }, nom: PALETTE[c].libelle })),
  ];
  return (
    <div>
      <div className="text-[11.5px] font-semibold text-muted mb-1.5">{libelle}</div>
      <div className="flex flex-wrap gap-1.5">
        {choix.map((c) => (
          <button key={c.cle || "aucun"} type="button" onClick={() => (onChange as (v: string) => void)(c.cle)} title={c.nom} aria-label={c.nom} aria-pressed={valeur === c.cle}
            className={`w-7 h-7 rounded-full border cursor-pointer ${valeur === c.cle ? "ring-2 ring-offset-2 ring-[#3b82f6] border-transparent" : "border-[#d5d8dd]"}`} style={c.style} />
        ))}
      </div>
    </div>
  );
}

function Curseur({ libelle, valeur, min, max, onChange, unite = "px" }: { libelle: string; valeur: number; min: number; max: number; onChange: (n: number) => void; unite?: string }) {
  return (
    <label className="block min-w-[160px]">
      <span className="block text-[11.5px] font-semibold text-muted mb-1">{libelle} : {valeur} {unite}</span>
      <input type="range" min={min} max={max} value={valeur} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#ad0707]" />
    </label>
  );
}

function Alignement({ valeur, onChange }: { valeur: Align; onChange: (a: Align) => void }) {
  const choix: [Align, ReactNode, string][] = [["left", <AlignLeft key="l" size={14} />, "Gauche"], ["center", <AlignCenter key="c" size={14} />, "Centre"], ["right", <AlignRight key="r" size={14} />, "Droite"]];
  return (
    <div>
      <div className="text-[11.5px] font-semibold text-muted mb-1.5">Alignement</div>
      <div className="inline-flex rounded-md border border-line p-0.5 bg-surface-2">
        {choix.map(([a, i, l]) => (
          <button key={a} type="button" onClick={() => onChange(a)} aria-label={l} aria-pressed={valeur === a}
            className={`w-8 h-7 grid place-items-center rounded border-0 cursor-pointer ${valeur === a ? "bg-white text-ink shadow-sm" : "bg-transparent text-muted"}`}>{i}</button>
        ))}
      </div>
    </div>
  );
}

// Réglages d'une section : taille, couleurs de la palette, fond, alignement, et ce qui lui est propre
function Style({ s, maj }: { s: Section; maj: (c: Partial<Section>) => void }) {
  const m = maj as (c: Record<string, unknown>) => void;
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-4 rounded-b-lg border border-t-0 px-4 py-3.5 bg-white text-left" style={{ borderColor: BLEU, fontFamily: "var(--font-texte)" }}>
      {"taille" in s ? <Curseur libelle="Taille du texte" valeur={s.taille} min={s.type === "bandeau" ? 18 : s.type === "pied" ? 10 : 11} max={s.type === "bandeau" ? 56 : s.type === "titre" || s.type === "appel" ? 44 : 24} onChange={(taille) => m({ taille })} /> : null}
      {s.type === "logo" ? <Curseur libelle="Largeur du logo" valeur={s.largeur} min={60} max={400} onChange={(largeur) => m({ largeur })} /> : null}
      {s.type === "image" ? <Curseur libelle="Largeur" valeur={s.largeur} min={20} max={100} unite="%" onChange={(largeur) => m({ largeur })} /> : null}
      {s.type === "espace" ? <Curseur libelle="Hauteur" valeur={s.hauteur} min={4} max={120} onChange={(hauteur) => m({ hauteur })} /> : null}
      {"couleur" in s ? <Nuancier libelle={s.type === "separateur" ? "Couleur de la ligne" : "Couleur du texte"} valeur={s.couleur} onChange={((couleur: Couleur) => m({ couleur })) as never} /> : null}
      {"couleurBouton" in s ? <Nuancier libelle="Couleur du bouton" valeur={s.couleurBouton} onChange={((couleurBouton: Couleur) => m({ couleurBouton })) as never} /> : null}
      {s.type === "reseaux" ? <Nuancier libelle="Couleur des icônes" valeur={s.couleurIcone} onChange={((couleurIcone: Couleur) => m({ couleurIcone })) as never} /> : null}
      {s.type === "appel" ? <Nuancier libelle="Texte du bouton" valeur={s.couleurTexteBouton} onChange={((couleurTexteBouton: Couleur) => m({ couleurTexteBouton })) as never} /> : null}
      <Nuancier fond libelle="Fond de la section" valeur={s.fond} onChange={((fond: Fond) => m({ fond })) as never} />
      {s.type !== "espace" && s.type !== "separateur" ? <Alignement valeur={s.align} onChange={(align) => m({ align })} /> : null}
    </div>
  );
}

// Éditeur : la lettre telle qu'elle sera reçue, faite de sections modifiables, déplaçables, supprimables
export function EditeurBlocs({
  initial,
  reseaux,
  name = "contenu",
  variables = VARIABLES,
  apercuBoite = true,
  mention = "Vous recevez ce message en tant que membre de la Chambre.",
}: {
  initial: DocLettre;
  reseaux: Partial<Record<Reseau, string>>;
  name?: string;
  variables?: readonly { cle: string; libelle: string }[];
  apercuBoite?: boolean;
  mention?: string;
}) {
  const [doc, setDoc] = useState<DocLettre>(initial);
  const [choisie, setChoisie] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);

  const maj = (id: string, c: Partial<Section>) => setDoc((d) => ({ ...d, sections: d.sections.map((s) => (s.id === id ? ({ ...s, ...c } as Section) : s)) }));
  const inserer = (i: number, t: TypeSection) => {
    const s = sectionVide(t, reseaux);
    setDoc((d) => ({ ...d, sections: [...d.sections.slice(0, i), s, ...d.sections.slice(i)] }));
    setChoisie(s.id);
  };
  const deplacer = (i: number, sens: -1 | 1) => setDoc((d) => {
    const j = i + sens;
    if (j < 0 || j >= d.sections.length) return d;
    const sections = [...d.sections];
    [sections[i], sections[j]] = [sections[j], sections[i]];
    return { ...d, sections };
  });
  const dupliquer = (i: number) => {
    const copie = { ...structuredClone(doc.sections[i]), id: nouvelId() };
    setDoc((d) => ({ ...d, sections: [...d.sections.slice(0, i + 1), copie, ...d.sections.slice(i + 1)] }));
    setChoisie(copie.id);
  };
  const supprimer = (id: string) => setDoc((d) => ({ ...d, sections: d.sections.filter((s) => s.id !== id) }));

  return (
    <VariablesProposees.Provider value={variables}>
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={JSON.stringify(doc)} />
      {apercuBoite ? <label className="block">
        <span className="block text-[12.5px] font-semibold text-muted mb-1">Aperçu dans la boîte de réception</span>
        <input value={doc.apercu} maxLength={200} onChange={(e) => setDoc({ ...doc, apercu: e.target.value })} placeholder="Le texte qui suit l’objet, ex. le programme du mois"
          className="w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.6px] outline-none focus:border-accent" />
      </label> : null}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-[12px] text-muted">
          Fond autour :
          {(["brume", "blanc", "ciel", "menthe", "rose"] as Couleur[]).map((c) => (
            <button key={c} type="button" onClick={() => setDoc({ ...doc, fond: c })} title={PALETTE[c].libelle} aria-label={PALETTE[c].libelle} aria-pressed={doc.fond === c}
              className={`w-5 h-5 rounded-full border cursor-pointer ${doc.fond === c ? "ring-2 ring-offset-1 ring-[#3b82f6]" : "border-[#d5d8dd]"}`} style={{ background: hex(c) }} />
          ))}
        </div>
      </div>

      <div className="rounded-[var(--radius-m)] border border-line px-3 py-8 overflow-x-auto" style={{ background: hex(doc.fond) }}>
        <div className="mx-auto bg-white rounded-[14px]" style={{ maxWidth: LARGEUR, fontFamily: "var(--font-texte), Inter, Arial, sans-serif" }}>
          <Inserer onAjout={(t) => inserer(0, t)} />
          {doc.sections.map((s, i) => {
            const actif = choisie === s.id;
            const libelle = TYPES_SECTION.find((t) => t.type === s.type)!.libelle;
            return (
              <div key={s.id}>
                <div className="group/sec relative" onClick={() => setChoisie(s.id)}>
                  <div className={`absolute inset-0 pointer-events-none z-[1] rounded-sm ${actif ? "ring-2" : "ring-0 group-hover/sec:ring-1"}`} style={{ ["--tw-ring-color" as string]: BLEU }} />
                  <div className={`absolute right-1 -top-4 z-20 items-center gap-0.5 rounded-xl border border-[#e5eaf0] bg-white p-1 shadow-[0_8px_24px_-8px_rgb(15_29_44/0.25)] ${actif ? "flex" : "hidden group-hover/sec:flex"}`} style={{ fontFamily: "var(--font-texte)" }}>
                    <span className="px-2 text-[11.5px] font-semibold text-[#5b6b7a]">{libelle}</span>
                    <Outil libelle="Style" actif={style === s.id} onClick={() => setStyle(style === s.id ? null : s.id)}><Paintbrush size={13} /></Outil>
                    <Outil libelle="Monter" onClick={() => deplacer(i, -1)} disabled={i === 0}><ArrowUp size={13} /></Outil>
                    <Outil libelle="Descendre" onClick={() => deplacer(i, 1)} disabled={i === doc.sections.length - 1}><ArrowDown size={13} /></Outil>
                    <Outil libelle="Dupliquer" onClick={() => dupliquer(i)}><Copy size={13} /></Outil>
                    <Outil libelle="Supprimer la section" onClick={() => supprimer(s.id)}><Trash2 size={13} /></Outil>
                  </div>
                  <RenduSection s={s} maj={(c) => maj(s.id, c)} actif={actif} />
                </div>
                {style === s.id ? <Style s={s} maj={(c) => maj(s.id, c)} /> : null}
                <Inserer onAjout={(t) => inserer(i + 1, t)} />
              </div>
            );
          })}
          {!doc.sections.length ? <p className="m-0 py-16 text-center text-[13px] text-muted">Lettre vide. Ajoutez une section avec le « + ».</p> : null}
        </div>
        <p className="mx-auto mt-3 text-center text-[11.5px]" style={{ maxWidth: LARGEUR, color: hex("ardoise") }}>
          {mention}
        </p>
      </div>
    </div>
    </VariablesProposees.Provider>
  );
}

function Outil({ libelle, onClick, children, disabled, actif }: { libelle: string; onClick: () => void; children: ReactNode; disabled?: boolean; actif?: boolean }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} disabled={disabled} aria-label={libelle} title={libelle}
      className={`h-7 min-w-7 px-1.5 grid place-items-center rounded-md border-0 text-[11.5px] font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${actif ? "bg-[#ad0707] text-white" : "bg-transparent text-[#16202b] hover:bg-[#f1f4f7]"}`}>
      {children}
    </button>
  );
}

// Petite barre d'actions propre à une section (image, liens), affichée quand elle est choisie
function Actions({ children }: { children: ReactNode }) {
  return <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>{children}</div>;
}
function ActionLien({ libelle, url, onChange }: { libelle: string; url: string; onChange: (u: string) => void }) {
  return (
    <button type="button" onClick={() => { const u = demanderLien(url); if (u !== null) onChange(u); }} title={url || "Aucun lien"}
      className={`inline-flex items-center gap-1 h-8 px-3 rounded-md border-0 text-[12.5px] font-semibold cursor-pointer ${url ? "bg-[#0f1d2c] text-white" : "bg-[#b45309] text-white"}`}>
      <Link2 size={13} /> {url ? libelle : `${libelle} (à ajouter)`}
    </button>
  );
}

function RenduSection({ s, maj, actif }: { s: Section; maj: (c: Partial<Section>) => void; actif: boolean }) {
  const m = maj as (c: Record<string, unknown>) => void;
  const cadre = (contenu: ReactNode, padding: string, extra?: ReactNode) => (
    <div className="relative" style={{ ...fondCss(s.fond), padding, textAlign: s.align }}>
      {actif ? extra : null}
      {contenu}
    </div>
  );
  switch (s.type) {
    case "logo":
      return cadre(
        // eslint-disable-next-line @next/next/no-img-element -- même logo que dans le courriel
        <img src={s.image || "/marque/logo-couleur.png"} alt="Logo" style={{ width: s.largeur || 150, maxWidth: "100%", height: "auto", display: "inline-block" }} />,
        "24px 32px 18px",
        <Actions>
          <BoutonImage libelle="Changer le logo" onUrl={(image) => m({ image })} />
          <button type="button" onClick={() => { const u = demanderLien(s.image, "Adresse d’une image de logo (https://…)"); if (u !== null) m({ image: u }); }}
            className="h-8 px-3 rounded-md border-0 bg-[#0f1d2c] text-white text-[12.5px] font-semibold cursor-pointer"><Link2 size={13} className="inline -mt-0.5" /> Lien</button>
          {s.image ? <button type="button" onClick={() => m({ image: "" })} className="h-8 px-3 rounded-md border-0 bg-[#0f1d2c] text-white text-[12.5px] font-semibold cursor-pointer">Logo IMPACT 261</button> : null}
        </Actions>,
      );
    case "bandeau":
      return (
        <div className="relative" style={{ padding: "0 0 24px" }}>
          {actif ? (
            <Actions>
              <BoutonImage libelle={s.image ? "Changer l’image" : "Image de fond"} onUrl={(image) => m({ image })} />
              <button type="button" onClick={() => { const u = demanderLien(s.image, "Adresse d’une image (https://…)"); if (u !== null) m({ image: u }); }}
                className="h-8 px-3 rounded-md border-0 bg-[#0f1d2c] text-white text-[12.5px] font-semibold cursor-pointer"><Link2 size={13} className="inline -mt-0.5" /> Lien d’image</button>
              {s.image ? <button type="button" onClick={() => m({ image: "" })} className="h-8 px-3 rounded-md border-0 bg-[#0f1d2c] text-white text-[12.5px] font-semibold cursor-pointer">Retirer l’image</button> : null}
            </Actions>
          ) : null}
          <div style={{ ...fondCss(s.fond, s.image), padding: "56px 40px", textAlign: s.align }}>
            <TexteRiche ligne html={s.titre} onChange={(titre) => m({ titre })} placeholder="Titre du bandeau"
              style={{ fontSize: s.taille, lineHeight: 1.12, fontWeight: 800, letterSpacing: "-0.02em", color: hex(s.couleur) }} />
            <TexteRiche ligne html={s.sousTitre} onChange={(sousTitre) => m({ sousTitre })} placeholder="Sous-titre"
              style={{ marginTop: 10, fontSize: Math.round(s.taille * 0.5), lineHeight: 1.35, fontWeight: 600, color: hex(s.couleur) }} />
          </div>
        </div>
      );
    case "titre":
      return cadre(<TexteRiche ligne html={s.texte} onChange={(texte) => m({ texte })} placeholder="Titre"
        style={{ fontSize: s.taille, lineHeight: 1.3, fontWeight: 700, letterSpacing: "-0.015em", color: hex(s.couleur) }} />, "16px 32px 6px");
    case "texte":
      return cadre(<TexteRiche html={s.html} onChange={(html) => m({ html })} style={{ fontSize: s.taille, lineHeight: 1.65, color: hex(s.couleur) }} />, "12px 32px");
    case "image":
      return cadre(
        s.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- image de la lettre, de taille quelconque
          <img src={s.url} alt={s.alt} style={{ display: "inline-block", width: `${s.largeur}%`, height: "auto", borderRadius: 12 }} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2.5 py-10 rounded-xl border-2 border-dashed border-[#d5d8dd] bg-[#fafbfc] text-[#8a8a8a]" onClick={(e) => e.stopPropagation()}>
            <IconeImage size={26} />
            <div className="flex gap-2">
              <BoutonImage libelle="Téléverser une image" onUrl={(url) => m({ url })} />
              <button type="button" onClick={() => { const u = demanderLien("", "Adresse d’une image (https://…)"); if (u) m({ url: u }); }}
                className="h-8 px-3 rounded-md border border-[#d5d8dd] bg-white text-[12.5px] font-semibold text-[#16202b] cursor-pointer hover:border-[#0f1d2c]"><Link2 size={13} className="inline -mt-0.5" /> Lien d’une image</button>
            </div>
          </div>
        ),
        "12px 32px",
        s.url ? (
          <Actions>
            <BoutonImage libelle="Changer" onUrl={(url) => m({ url })} />
            <ActionLien libelle="Lien au clic" url={s.lien} onChange={(lien) => m({ lien })} />
          </Actions>
        ) : null,
      );
    case "bouton":
      return cadre(
        <span style={{ display: "inline-block", background: hex(s.couleurBouton), borderRadius: 8, padding: "13px 26px" }}>
          <TexteRiche ligne html={s.libelle} onChange={(libelle) => m({ libelle })} placeholder="Texte du bouton" style={{ fontSize: s.taille, fontWeight: 700, color: hex(s.couleur) }} />
        </span>,
        "14px 32px 22px",
        <Actions><ActionLien libelle="Lien du bouton" url={s.url} onChange={(url) => m({ url })} /></Actions>,
      );
    case "appel":
      return cadre(
        <>
          <TexteRiche ligne html={s.titre} onChange={(titre) => m({ titre })} placeholder="Titre de l’encadré"
            style={{ fontSize: s.taille, lineHeight: 1.25, fontWeight: 700, letterSpacing: "-0.015em", color: hex(s.couleur), marginBottom: 16 }} />
          <span style={{ display: "inline-block", background: hex(s.couleurBouton), borderRadius: 8, padding: "11px 22px" }}>
            <TexteRiche ligne html={s.bouton} onChange={(bouton) => m({ bouton })} placeholder="Texte du bouton" style={{ fontSize: 15, fontWeight: 700, color: hex(s.couleurTexteBouton) }} />
          </span>
        </>,
        "34px 32px",
        <Actions><ActionLien libelle="Lien du bouton" url={s.url} onChange={(url) => m({ url })} /></Actions>,
      );
    case "reseaux":
      return cadre(
        <div className="inline-flex gap-2.5" onClick={(e) => e.stopPropagation()}>
          {RESEAUX.map((r) => {
            const nom = r.charAt(0).toUpperCase() + r.slice(1);
            const url = s.liens[r];
            return (
              <button key={r} type="button" onClick={() => { const u = demanderLien(url, `Adresse de votre page ${nom}. Laissez vide pour ne pas l’afficher.`); if (u !== null) m({ liens: { ...s.liens, [r]: u } }); }}
                title={url ? `${nom} : ${url}` : `${nom} : ajouter l’adresse`}
                className={`relative p-0 border-0 bg-transparent cursor-pointer rounded-full hover:opacity-100 ${url ? "" : "opacity-25"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- mêmes icônes que dans le courriel */}
                <img src={`/marque/reseaux/${r}-${s.couleurIcone ?? "rouge"}.png`} alt={nom} width={44} height={44} className="block" />
                {url ? null : <span className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full text-white grid place-items-center" style={{ background: BLEU }}><Plus size={12} /></span>}
              </button>
            );
          })}
        </div>,
        "24px 32px 8px",
      );
    case "pied": {
      const lien = { color: hex("rouge") };
      return cadre(
        <div style={{ fontSize: s.taille, lineHeight: 1.55, color: hex(s.couleur) }}>
          <TexteRiche html={s.texte} onChange={(texte) => m({ texte })} placeholder="Présentation de la Chambre" style={{ marginBottom: 12 }} />
          <button type="button" onClick={(e) => { e.stopPropagation(); const u = demanderLien(s.confidentialite, "Adresse de la politique de confidentialité. Laissez vide pour la retirer."); if (u !== null) m({ confidentialite: u }); }}
            title={s.confidentialite || "Ajouter le lien"} className="p-0 border-0 bg-transparent cursor-pointer hover:underline" style={{ ...lien, fontSize: s.taille, opacity: s.confidentialite ? 1 : 0.4 }}>
            Politique de confidentialité
          </button>
          <TexteRiche ligne html={s.adresse} onChange={(adresse) => m({ adresse })} placeholder="Adresse" />
          <div className="flex justify-center items-baseline gap-1 flex-wrap" style={{ justifyContent: s.align === "left" ? "flex-start" : s.align === "right" ? "flex-end" : "center" }}>
            <TexteRiche ligne html={s.email} onChange={(email) => m({ email })} placeholder="Courriel" style={lien} /> | <TexteRiche ligne html={s.telephone} onChange={(telephone) => m({ telephone })} placeholder="Téléphone" />
          </div>
          <TexteRiche ligne html={s.copyright} onChange={(copyright) => m({ copyright })} placeholder="Copyright" style={{ marginTop: 12 }} />
        </div>,
        "12px 40px 28px",
      );
    }
    case "separateur":
      return cadre(<div style={{ borderTop: `1px solid ${hex(s.couleur)}` }} />, "14px 32px");
    case "espace":
      return <div style={{ ...fondCss(s.fond), height: s.hauteur }} />;
  }
}
