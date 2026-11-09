"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  Copy,
  Image as IconeImage,
  ImagePlus,
  Italic,
  Link2,
  List,
  Loader2,
  Paintbrush,
  Plus,
  Trash2,
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
const demanderLien = (actuel: string, question = "Adresse du lien (https://…) — vide pour retirer") => {
  const r = window.prompt(question, actuel);
  return r === null ? null : urlSure(r);
};

// Texte simple modifiable sur place
function Editable({ valeur, onChange, style, placeholder, multiligne = false }: {
  valeur: string; onChange: (v: string) => void; style?: CSSProperties; placeholder: string; multiligne?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerText !== valeur) el.innerText = valeur;
  }, [valeur]);
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={placeholder}
      data-vide={placeholder}
      onInput={(e) => onChange(e.currentTarget.innerText.replace(/\n$/, ""))}
      onKeyDown={(e) => { if (!multiligne && e.key === "Enter") e.preventDefault(); }}
      onPaste={(e) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
      className="outline-none rounded-sm cursor-text whitespace-pre-wrap focus:ring-2 focus:ring-[#3b82f6]/60 empty:before:content-[attr(data-vide)] empty:before:opacity-50"
      style={style}
    />
  );
}

// Texte mis en forme modifiable sur place, avec sa barre (gras, italique, souligné, lien, liste, variables)
function TexteRiche({ html, onChange, style }: { html: string; onChange: (h: string) => void; style: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [initial] = useState(html);
  const [actif, setActif] = useState(false);
  const commande = (c: string, v?: string) => {
    ref.current?.focus();
    document.execCommand(c, false, v);
    onChange(nettoyerHtml(ref.current?.innerHTML ?? ""));
  };
  const B = "w-8 h-8 grid place-items-center rounded-md border-0 bg-transparent text-white/85 cursor-pointer hover:bg-white/15";
  return (
    <div className="relative" onFocus={() => setActif(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setActif(false); }}>
      {actif ? (
        <div className="absolute -top-11 left-0 z-30 flex items-center gap-0.5 rounded-lg bg-[#0f1d2c] px-1 py-1 shadow-lg" onMouseDown={(e) => e.preventDefault()}>
          <button type="button" className={B} onClick={() => commande("bold")} aria-label="Gras" title="Gras"><Bold size={14} /></button>
          <button type="button" className={B} onClick={() => commande("italic")} aria-label="Italique" title="Italique"><Italic size={14} /></button>
          <button type="button" className={B} onClick={() => commande("underline")} aria-label="Souligné" title="Souligné"><Underline size={14} /></button>
          <button type="button" className={B} onClick={() => { const u = demanderLien("", "Adresse du lien (https://…)"); if (u) commande("createLink", u); }} aria-label="Lien" title="Lien"><Link2 size={14} /></button>
          <button type="button" className={B} onClick={() => commande("insertUnorderedList")} aria-label="Liste" title="Liste à puces"><List size={14} /></button>
          <span className="w-px h-5 bg-white/20 mx-1" />
          {VARIABLES.map((v) => (
            <button key={v.cle} type="button" onClick={() => commande("insertText", `{${v.cle}}`)} title={`Insérer : ${v.libelle} du destinataire`}
              className="h-8 px-2 rounded-md border-0 bg-transparent text-[11.5px] font-semibold text-white/85 cursor-pointer hover:bg-white/15">{v.libelle}</button>
          ))}
        </div>
      ) : null}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        aria-label="Texte"
        onInput={(e) => onChange(nettoyerHtml(e.currentTarget.innerHTML))}
        onPaste={(e) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
        dangerouslySetInnerHTML={{ __html: initial }}
        className="outline-none rounded-sm cursor-text focus:ring-2 focus:ring-[#3b82f6]/60 [&_a]:text-[#ad0707] [&_a]:no-underline [&_ul]:pl-6 [&_ul]:list-disc [&_p]:m-0 [&_p]:mb-3"
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

// « + » entre deux sections : toutes les sections possibles
function Inserer({ onAjout }: { onAjout: (t: TypeSection) => void }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="group/ins relative h-4 -my-2 z-20 flex items-center justify-center">
      <span className={`absolute inset-x-0 h-0.5 ${ouvert ? "opacity-100" : "opacity-0 group-hover/ins:opacity-100"}`} style={{ background: BLEU }} />
      {ouvert ? (
        <div className="relative flex flex-wrap justify-center items-center gap-1 rounded-xl bg-[#0f1d2c] p-1.5 shadow-xl max-w-[560px]">
          {TYPES_SECTION.map((t) => (
            <button key={t.type} type="button" onClick={() => { onAjout(t.type); setOuvert(false); }}
              className="h-7 px-2.5 rounded-md border-0 bg-transparent text-white text-[12px] font-semibold cursor-pointer hover:bg-white/15">{t.libelle}</button>
          ))}
          <button type="button" onClick={() => setOuvert(false)} aria-label="Annuler" className="w-7 h-7 grid place-items-center rounded-md border-0 bg-transparent text-white/60 cursor-pointer hover:text-white"><X size={14} /></button>
        </div>
      ) : (
        <button type="button" onClick={() => setOuvert(true)} aria-label="Ajouter une section ici" title="Ajouter une section ici"
          className="relative w-6 h-6 rounded-full border-0 text-white grid place-items-center cursor-pointer opacity-0 group-hover/ins:opacity-100 focus:opacity-100 shadow" style={{ background: BLEU }}>
          <Plus size={14} />
        </button>
      )}
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
      {s.type === "image" ? <Curseur libelle="Largeur" valeur={s.largeur} min={20} max={100} unite="%" onChange={(largeur) => m({ largeur })} /> : null}
      {s.type === "espace" ? <Curseur libelle="Hauteur" valeur={s.hauteur} min={4} max={120} onChange={(hauteur) => m({ hauteur })} /> : null}
      {"couleur" in s ? <Nuancier libelle={s.type === "separateur" ? "Couleur de la ligne" : "Couleur du texte"} valeur={s.couleur} onChange={((couleur: Couleur) => m({ couleur })) as never} /> : null}
      {"couleurBouton" in s ? <Nuancier libelle="Couleur du bouton" valeur={s.couleurBouton} onChange={((couleurBouton: Couleur) => m({ couleurBouton })) as never} /> : null}
      {s.type === "appel" ? <Nuancier libelle="Texte du bouton" valeur={s.couleurTexteBouton} onChange={((couleurTexteBouton: Couleur) => m({ couleurTexteBouton })) as never} /> : null}
      <Nuancier fond libelle="Fond de la section" valeur={s.fond} onChange={((fond: Fond) => m({ fond })) as never} />
      {s.type !== "espace" && s.type !== "separateur" ? <Alignement valeur={s.align} onChange={(align) => m({ align })} /> : null}
    </div>
  );
}

// Éditeur : la lettre telle qu'elle sera reçue, faite de sections modifiables, déplaçables, supprimables
export function EditeurBlocs({ initial, reseaux }: { initial: DocLettre; reseaux: Partial<Record<Reseau, string>> }) {
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
    <div className="flex flex-col gap-3">
      <input type="hidden" name="contenu" value={JSON.stringify(doc)} />
      <label className="block">
        <span className="block text-[12.5px] font-semibold text-muted mb-1">Ligne d’aperçu <span className="font-normal">(petit texte affiché après l’objet dans la boîte de réception)</span></span>
        <input value={doc.apercu} maxLength={200} onChange={(e) => setDoc({ ...doc, apercu: e.target.value })} placeholder="Ex. Le programme du mois et deux places offertes"
          className="w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.6px] outline-none focus:border-accent" />
      </label>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="m-0 text-[12px] text-muted">Cliquez sur un texte pour l’écrire. Survolez une section pour la régler (<Paintbrush size={11} className="inline" />), la déplacer, la dupliquer ou la supprimer ; passez entre deux sections pour en ajouter une.</p>
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
                  <div className={`absolute right-1 -top-3.5 z-20 items-center gap-0.5 rounded-lg bg-[#0f1d2c] p-0.5 shadow-lg ${actif ? "flex" : "hidden group-hover/sec:flex"}`}>
                    <span className="px-2 text-[11px] font-semibold text-white/60">{libelle}</span>
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
          {!doc.sections.length ? <p className="m-0 py-16 text-center text-[13px] text-muted">Lettre vide : survolez ce cadre et cliquez sur « + » pour ajouter une section.</p> : null}
        </div>
        <p className="mx-auto mt-3 text-center text-[11.5px]" style={{ maxWidth: LARGEUR, color: hex("ardoise") }}>
          Vous recevez ce message en tant que membre de la Chambre. Les abonnés trouvent ici le lien pour se désabonner (toujours présent).
        </p>
      </div>
    </div>
  );
}

function Outil({ libelle, onClick, children, disabled, actif }: { libelle: string; onClick: () => void; children: ReactNode; disabled?: boolean; actif?: boolean }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} disabled={disabled} aria-label={libelle} title={libelle}
      className={`h-7 min-w-7 px-1.5 grid place-items-center rounded-md border-0 text-[11.5px] font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${actif ? "bg-white text-[#0f1d2c]" : "bg-transparent text-white/85 hover:bg-white/15"}`}>
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
      // eslint-disable-next-line @next/next/no-img-element -- même logo que dans le courriel
      return cadre(<img src="/marque/logo-couleur.png" alt="IMPACT 261" style={{ width: 190, height: "auto", display: "inline-block" }} />, "24px 32px 18px");
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
          <div style={{ ...fondCss(s.fond, s.image), borderRadius: 16, padding: "56px 40px", textAlign: s.align }}>
            <Editable valeur={s.titre} onChange={(titre) => m({ titre })} placeholder="Titre du bandeau"
              style={{ fontSize: s.taille, lineHeight: 1.12, fontWeight: 800, letterSpacing: "-0.02em", color: hex(s.couleur) }} />
            <Editable valeur={s.sousTitre} onChange={(sousTitre) => m({ sousTitre })} placeholder="Sous-titre"
              style={{ marginTop: 10, fontSize: Math.round(s.taille * 0.5), lineHeight: 1.35, fontWeight: 600, color: hex(s.couleur) }} />
          </div>
        </div>
      );
    case "titre":
      return cadre(<Editable valeur={s.texte} onChange={(texte) => m({ texte })} placeholder="Titre"
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
          <Editable valeur={s.libelle} onChange={(libelle) => m({ libelle })} placeholder="Texte du bouton" style={{ fontSize: s.taille, fontWeight: 700, color: hex(s.couleur) }} />
        </span>,
        "14px 32px 22px",
        <Actions><ActionLien libelle="Lien du bouton" url={s.url} onChange={(url) => m({ url })} /></Actions>,
      );
    case "appel":
      return cadre(
        <>
          <Editable valeur={s.titre} onChange={(titre) => m({ titre })} placeholder="Titre de l’encadré"
            style={{ fontSize: s.taille, lineHeight: 1.25, fontWeight: 700, letterSpacing: "-0.015em", color: hex(s.couleur), marginBottom: 16 }} />
          <span style={{ display: "inline-block", background: hex(s.couleurBouton), borderRadius: 8, padding: "11px 22px" }}>
            <Editable valeur={s.bouton} onChange={(bouton) => m({ bouton })} placeholder="Texte du bouton" style={{ fontSize: 15, fontWeight: 700, color: hex(s.couleurTexteBouton) }} />
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
              <button key={r} type="button" onClick={() => { const u = demanderLien(url, `Adresse de votre page ${nom} — vide pour ne pas l’afficher`); if (u !== null) m({ liens: { ...s.liens, [r]: u } }); }}
                title={url ? `${nom} : ${url}` : `${nom} : cliquez pour ajouter l’adresse (masqué dans le courriel tant qu’elle est vide)`}
                className={`relative p-0 border-0 bg-transparent cursor-pointer rounded-full hover:opacity-100 ${url ? "" : "opacity-25"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- mêmes icônes que dans le courriel */}
                <img src={`/marque/reseaux/${r}.png`} alt={nom} width={44} height={44} className="block" />
                {url ? null : <span className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full text-white grid place-items-center" style={{ background: BLEU }}><Plus size={12} /></span>}
              </button>
            );
          })}
        </div>,
        "24px 32px 8px",
      );
    case "pied":
      return cadre(
        <div style={{ fontSize: s.taille, lineHeight: 1.55, color: hex(s.couleur) }}>
          <Editable multiligne valeur={s.texte} onChange={(texte) => m({ texte })} placeholder="Présentation de la Chambre" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0 }}>
            <span style={{ color: hex("rouge") }}>Politique de confidentialité</span><br />
            {COORDONNEES_APERCU.adresse}<br />
            <span style={{ color: hex("rouge") }}>{COORDONNEES_APERCU.email}</span> | {COORDONNEES_APERCU.telephone}
          </p>
          <p style={{ margin: "12px 0 0" }}>© {new Date().getFullYear()} Chambre de Commerce et de Coopération Canada–Madagascar. Tous droits réservés.</p>
        </div>,
        "12px 40px 28px",
      );
    case "separateur":
      return cadre(<div style={{ borderTop: `1px solid ${hex(s.couleur)}` }} />, "14px 32px");
    case "espace":
      return <div style={{ ...fondCss(s.fond), height: s.hauteur }} />;
  }
}
