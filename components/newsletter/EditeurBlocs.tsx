"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bold,
  EyeOff,
  Heading,
  Image as IconeImage,
  ImagePlus,
  Italic,
  Link2,
  List,
  Loader2,
  MousePointerClick,
  Plus,
  Trash2,
  Type,
  Underline,
} from "lucide-react";
import { televerserImageLettre } from "@/lib/actions/newsletter";
import {
  ACCENT,
  blocVide,
  LARGEUR,
  nettoyerHtml,
  RESEAUX,
  urlSure,
  VARIABLES,
  versHtml,
  type Bloc,
  type DocLettre,
  type Reseau,
  type TypeBloc,
} from "@/lib/lettre-blocs";

const COORDONNEES_APERCU = { adresse: "Antananarivo, Madagascar", email: "info@cancham.mg", telephone: "+261 34 50 280 53", confidentialite: "" };

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

async function televerser(f: File): Promise<string | { erreur: string }> {
  const fd = new FormData();
  fd.set("image", f);
  const r = await televerserImageLettre(fd).catch(() => ({ erreur: "Le téléversement n’a pas abouti." }));
  return "url" in r ? r.url : r;
}

const demanderLien = (actuel: string, question = "Adresse du lien (https://…) — vide pour retirer") => {
  const r = window.prompt(question, actuel);
  return r === null ? null : urlSure(r);
};

// Texte simple modifiable sur place (titre, libellé de bouton…)
function Editable({ valeur, onChange, className = "", style, placeholder, multiligne = false }: {
  valeur: string; onChange: (v: string) => void; className?: string; style?: CSSProperties; placeholder: string; multiligne?: boolean;
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
      className={`outline-none rounded-sm cursor-text focus:ring-2 focus:ring-[#3b82f6]/60 hover:ring-1 hover:ring-[#3b82f6]/40 empty:before:content-[attr(data-vide)] empty:before:opacity-50 ${className}`}
      style={style}
    />
  );
}

// Texte mis en forme modifiable sur place, avec sa barre (gras, italique, souligné, lien, liste, variable)
function TexteRiche({ html, onChange }: { html: string; onChange: (h: string) => void }) {
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
        <div className="absolute -top-11 left-0 z-20 flex items-center gap-0.5 rounded-lg bg-[#0f1d2c] px-1 py-1 shadow-lg" onMouseDown={(e) => e.preventDefault()}>
          <button type="button" className={B} onClick={() => commande("bold")} aria-label="Gras" title="Gras"><Bold size={14} /></button>
          <button type="button" className={B} onClick={() => commande("italic")} aria-label="Italique" title="Italique"><Italic size={14} /></button>
          <button type="button" className={B} onClick={() => commande("underline")} aria-label="Souligné" title="Souligné"><Underline size={14} /></button>
          <button type="button" className={B} onClick={() => { const u = demanderLien("", "Adresse du lien (https://…)"); if (u) commande("createLink", u); }} aria-label="Lien" title="Lien"><Link2 size={14} /></button>
          <button type="button" className={B} onClick={() => commande("insertUnorderedList")} aria-label="Liste" title="Liste à puces"><List size={14} /></button>
          <span className="w-px h-5 bg-white/20 mx-1" />
          {VARIABLES.map((v) => (
            <button key={v.cle} type="button" onClick={() => commande("insertText", `{${v.cle}}`)} className="h-8 px-2 rounded-md border-0 bg-transparent text-[11.5px] font-semibold text-white/85 cursor-pointer hover:bg-white/15" title={`Insérer : ${v.libelle} du destinataire`}>
              {v.libelle}
            </button>
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
        className="outline-none rounded-sm cursor-text focus:ring-2 focus:ring-[#3b82f6]/60 hover:ring-1 hover:ring-[#3b82f6]/40 [&_a]:text-[#ad0707] [&_a]:no-underline [&_ul]:pl-6 [&_ul]:list-disc [&_p]:m-0 [&_p]:mb-3"
        style={{ fontSize: 15, lineHeight: 1.6, color: "#6b6b6b" }}
      />
    </div>
  );
}

// Un élément de la lettre, avec sa barre d'outils au survol
function Element({ children, outils, className = "" }: { children: ReactNode; outils: ReactNode; className?: string }) {
  return (
    <div className={`group/el relative ${className}`}>
      <div className="absolute -right-2 -top-3 z-10 hidden group-hover/el:flex group-focus-within/el:flex items-center gap-0.5 rounded-lg bg-[#0f1d2c] p-0.5 shadow-lg">{outils}</div>
      {children}
    </div>
  );
}
function Outil({ libelle, onClick, children, disabled }: { libelle: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={libelle} title={libelle}
      className="h-7 min-w-7 px-1.5 grid place-items-center rounded-md border-0 bg-transparent text-white/85 text-[11.5px] font-semibold cursor-pointer hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed">
      {children}
    </button>
  );
}

// « + » entre deux éléments : titre, texte, image, bouton
function Inserer({ onAjout }: { onAjout: (t: TypeBloc) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const choix: [TypeBloc, string, ReactNode][] = [
    ["titre", "Titre", <Heading key="t" size={14} />],
    ["texte", "Texte", <Type key="x" size={14} />],
    ["image", "Image", <IconeImage key="i" size={14} />],
    ["bouton", "Bouton", <MousePointerClick key="b" size={14} />],
  ];
  return (
    <div className="group/ins relative h-5 -my-2.5 z-[5] flex items-center justify-center">
      <span className={`absolute inset-x-6 h-px bg-[#3b82f6] ${ouvert ? "opacity-100" : "opacity-0 group-hover/ins:opacity-100"}`} />
      {ouvert ? (
        <div className="relative flex items-center gap-1 rounded-full bg-[#0f1d2c] p-1 shadow-lg">
          {choix.map(([t, l, i]) => (
            <button key={t} type="button" onClick={() => { onAjout(t); setOuvert(false); }} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border-0 bg-transparent text-white text-[12px] font-semibold cursor-pointer hover:bg-white/15">
              {i} {l}
            </button>
          ))}
          <button type="button" onClick={() => setOuvert(false)} className="h-7 px-2 rounded-full border-0 bg-transparent text-white/60 text-[12px] cursor-pointer hover:text-white">Annuler</button>
        </div>
      ) : (
        <button type="button" onClick={() => setOuvert(true)} aria-label="Ajouter un élément ici" title="Ajouter un titre, un texte, une image ou un bouton"
          className="relative w-6 h-6 rounded-full border-0 bg-[#3b82f6] text-white grid place-items-center cursor-pointer opacity-0 group-hover/ins:opacity-100 focus:opacity-100 shadow">
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}

function BoutonTeleverser({ onUrl, libelle, clair = false }: { onUrl: (u: string) => void; libelle: string; clair?: boolean }) {
  const [enCours, setEnCours] = useState(false);
  return (
    <label className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-semibold cursor-pointer ${clair ? "bg-white/90 text-[#0f1d2c] hover:bg-white" : "bg-[#0f1d2c] text-white hover:bg-[#1b2f45]"} ${enCours ? "opacity-60 pointer-events-none" : ""}`}>
      {enCours ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {libelle}
      <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        setEnCours(true);
        const r = await televerser(f);
        setEnCours(false);
        if (typeof r === "string") onUrl(r);
        else window.alert(r.erreur);
      }} />
    </label>
  );
}

// Éditeur : la lettre telle qu'elle sera reçue, modifiable directement
export function EditeurBlocs({ initial }: { initial: DocLettre }) {
  const [doc, setDoc] = useState<DocLettre>(initial);
  const majBloc = (id: string, c: Partial<Bloc>) => setDoc((d) => ({ ...d, blocs: d.blocs.map((b) => (b.id === id ? ({ ...b, ...c } as Bloc) : b)) }));
  const inserer = (i: number, t: TypeBloc) => setDoc((d) => ({ ...d, blocs: [...d.blocs.slice(0, i), blocVide(t), ...d.blocs.slice(i)] }));
  const deplacer = (i: number, sens: -1 | 1) => setDoc((d) => {
    const j = i + sens;
    if (j < 0 || j >= d.blocs.length) return d;
    const blocs = [...d.blocs];
    [blocs[i], blocs[j]] = [blocs[j], blocs[i]];
    return { ...d, blocs };
  });
  const retirer = (id: string) => setDoc((d) => ({ ...d, blocs: d.blocs.filter((b) => b.id !== id) }));
  const ba = doc.bandeau;

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="contenu" value={JSON.stringify(doc)} />
      <label className="block">
        <span className="block text-[12.5px] font-semibold text-muted mb-1">Ligne d’aperçu <span className="font-normal">(petit texte affiché après l’objet dans la boîte de réception)</span></span>
        <input value={doc.apercu} maxLength={200} onChange={(e) => setDoc({ ...doc, apercu: e.target.value })} placeholder="Ex. Le programme du mois et deux places offertes"
          className="w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.6px] outline-none focus:border-accent" />
      </label>
      <p className="m-0 text-[12px] text-muted">Cliquez sur un texte pour l’écrire. Survolez un élément pour le déplacer ou le supprimer, et passez entre deux éléments pour en ajouter un (+).</p>

      <div className="rounded-[var(--radius-m)] border border-line bg-[#f4f5f7] px-3 py-8 overflow-x-auto">
        <div className="mx-auto bg-white" style={{ maxWidth: LARGEUR, fontFamily: "Arial, Helvetica, sans-serif" }}>
          {/* Logo */}
          <div className="flex justify-center pt-6 pb-5">
            {/* eslint-disable-next-line @next/next/no-img-element -- même logo que dans le courriel */}
            <img src="/marque/logo-couleur.png" alt="IMPACT 261" style={{ width: 190, height: "auto" }} />
          </div>

          {/* Bandeau */}
          <div className="group/el relative px-0 pb-7">
            <div className="rounded-2xl px-10 py-16 text-right bg-cover bg-center" style={{ backgroundColor: ACCENT, backgroundImage: ba.image ? `url('${ba.image}')` : undefined }}>
              <Editable valeur={ba.titre} onChange={(titre) => setDoc((d) => ({ ...d, bandeau: { ...d.bandeau, titre } }))} placeholder="Titre du bandeau"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 40, lineHeight: 1.1, fontWeight: "bold", color: "#fff" }} />
              <Editable valeur={ba.sousTitre} onChange={(sousTitre) => setDoc((d) => ({ ...d, bandeau: { ...d.bandeau, sousTitre } }))} placeholder="Sous-titre"
                className="mt-2.5" style={{ fontSize: 20, lineHeight: 1.3, fontWeight: "bold", color: "#fff" }} />
            </div>
            <div className="absolute left-3 top-3 hidden group-hover/el:flex group-focus-within/el:flex gap-1.5">
              <BoutonTeleverser clair libelle={ba.image ? "Changer l’image" : "Image du bandeau"} onUrl={(image) => setDoc((d) => ({ ...d, bandeau: { ...d.bandeau, image } }))} />
              <button type="button" onClick={() => { const u = demanderLien(ba.image, "Adresse d’une image (https://…)"); if (u !== null) setDoc((d) => ({ ...d, bandeau: { ...d.bandeau, image: u } })); }}
                className="h-8 px-3 rounded-md border-0 bg-white/90 text-[#0f1d2c] text-[12.5px] font-semibold cursor-pointer hover:bg-white"><Link2 size={13} className="inline -mt-0.5" /> Lien</button>
              {ba.image ? <button type="button" onClick={() => setDoc((d) => ({ ...d, bandeau: { ...d.bandeau, image: "" } }))} className="h-8 px-3 rounded-md border-0 bg-white/90 text-[#0f1d2c] text-[12.5px] font-semibold cursor-pointer hover:bg-white">Retirer</button> : null}
            </div>
          </div>

          {/* Contenu */}
          <div className="px-6">
            <Inserer onAjout={(t) => inserer(0, t)} />
            {doc.blocs.map((b, i) => (
              <div key={b.id}>
                <Element
                  className="py-2.5"
                  outils={
                    <>
                      {b.type === "image" && b.url ? (
                        <>
                          <BoutonTeleverserOutil onUrl={(url) => majBloc(b.id, { url })} />
                          <Outil libelle="Lien au clic" onClick={() => { const u = demanderLien(b.lien); if (u !== null) majBloc(b.id, { lien: u }); }}><Link2 size={13} /></Outil>
                        </>
                      ) : null}
                      {b.type === "bouton" ? (
                        <Outil libelle={b.url ? `Lien : ${b.url}` : "Ajouter le lien du bouton"} onClick={() => { const u = demanderLien(b.url); if (u !== null) majBloc(b.id, { url: u }); }}>
                          <span className="inline-flex items-center gap-1"><Link2 size={13} /> {b.url ? "Lien" : "Lien ?"}</span>
                        </Outil>
                      ) : null}
                      <Outil libelle="Monter" onClick={() => deplacer(i, -1)} disabled={i === 0}><ArrowUp size={13} /></Outil>
                      <Outil libelle="Descendre" onClick={() => deplacer(i, 1)} disabled={i === doc.blocs.length - 1}><ArrowDown size={13} /></Outil>
                      <Outil libelle="Supprimer" onClick={() => retirer(b.id)}><Trash2 size={13} /></Outil>
                    </>
                  }
                >
                  <ContenuBloc bloc={b} maj={(c) => majBloc(b.id, c)} />
                </Element>
                <Inserer onAjout={(t) => inserer(i + 1, t)} />
              </div>
            ))}
          </div>
          <div className="h-5" />

          {/* Encadré d'appel */}
          {doc.appel.actif ? (
            <Element outils={
              <>
                <Outil libelle={doc.appel.url ? `Lien : ${doc.appel.url}` : "Ajouter le lien du bouton"} onClick={() => { const u = demanderLien(doc.appel.url); if (u !== null) setDoc((d) => ({ ...d, appel: { ...d.appel, url: u } })); }}>
                  <span className="inline-flex items-center gap-1"><Link2 size={13} /> {doc.appel.url ? "Lien" : "Lien ?"}</span>
                </Outil>
                <Outil libelle="Masquer l’encadré" onClick={() => setDoc((d) => ({ ...d, appel: { ...d.appel, actif: false } }))}><EyeOff size={13} /></Outil>
              </>
            }>
              <div className="px-6 py-8 text-center" style={{ background: ACCENT }}>
                <Editable valeur={doc.appel.titre} onChange={(titre) => setDoc((d) => ({ ...d, appel: { ...d.appel, titre } }))} placeholder="Titre de l’encadré"
                  className="mb-3.5" style={{ fontSize: 28, lineHeight: 1.25, color: "#fff" }} />
                <span className="inline-block bg-white px-2.5 py-2">
                  <Editable valeur={doc.appel.bouton} onChange={(bouton) => setDoc((d) => ({ ...d, appel: { ...d.appel, bouton } }))} placeholder="Texte du bouton"
                    style={{ fontSize: 16, fontWeight: "bold", color: ACCENT }} />
                </span>
              </div>
            </Element>
          ) : (
            <button type="button" onClick={() => setDoc((d) => ({ ...d, appel: { ...d.appel, actif: true } }))}
              className="mx-6 mb-2 w-[calc(100%-48px)] py-3 rounded-md border border-dashed border-[#c9c9c9] bg-transparent text-[13px] font-semibold text-[#8a8a8a] cursor-pointer hover:border-[#ad0707] hover:text-[#ad0707]">
              <Plus size={14} className="inline -mt-0.5" /> Ajouter l’encadré d’appel (titre + bouton sur fond rouge)
            </button>
          )}

          {/* Pied de page */}
          <div className="px-10 pt-7 pb-8 text-center" style={{ background: "#efece0", fontSize: 12, lineHeight: 1.5, color: "#5a5a5a" }}>
            <div className="flex justify-center gap-2.5 mb-5">
              {RESEAUX.map((r) => (
                <ReseauIcone key={r} reseau={r} url={doc.pied.reseaux[r]} onChange={(u) => setDoc((d) => ({ ...d, pied: { ...d.pied, reseaux: { ...d.pied.reseaux, [r]: u } } }))} />
              ))}
            </div>
            <Editable multiligne valeur={doc.pied.texte} onChange={(texte) => setDoc((d) => ({ ...d, pied: { ...d.pied, texte } }))} placeholder="Présentation de la Chambre" className="mb-3.5 whitespace-pre-line" />
            <p className="m-0">
              <span style={{ color: ACCENT }}>Politique de confidentialité</span><br />
              {COORDONNEES_APERCU.adresse}<br />
              <span style={{ color: ACCENT }}>{COORDONNEES_APERCU.email}</span> | {COORDONNEES_APERCU.telephone}
            </p>
            <p className="m-0 mt-3.5">© {new Date().getFullYear()} Chambre de Commerce et de Coopération Canada–Madagascar.<br />Tous droits réservés.</p>
          </div>
          <div className="px-6 py-4 text-center" style={{ background: "#f1f1f1", fontSize: 12, color: "#8a8a8a" }}>
            Vous recevez ce message en tant que membre de la Chambre. Les abonnés y trouvent le lien pour se désabonner.
          </div>
        </div>
      </div>
    </div>
  );
}

function BoutonTeleverserOutil({ onUrl }: { onUrl: (u: string) => void }) {
  const [enCours, setEnCours] = useState(false);
  return (
    <label title="Changer l’image" className="h-7 min-w-7 px-1.5 grid place-items-center rounded-md text-white/85 cursor-pointer hover:bg-white/15">
      {enCours ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
      <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        setEnCours(true);
        const r = await televerser(f);
        setEnCours(false);
        if (typeof r === "string") onUrl(r);
        else window.alert(r.erreur);
      }} />
    </label>
  );
}

function ReseauIcone({ reseau, url, onChange }: { reseau: Reseau; url: string; onChange: (u: string) => void }) {
  const nom = reseau.charAt(0).toUpperCase() + reseau.slice(1);
  return (
    <button type="button" onClick={() => { const u = demanderLien(url, `Adresse de votre page ${nom} — vide pour ne pas l’afficher`); if (u !== null) onChange(u); }}
      title={url ? `${nom} : ${url}` : `${nom} : cliquez pour ajouter l’adresse (masqué dans le courriel tant qu’elle est vide)`}
      className={`relative p-0 border-0 bg-transparent cursor-pointer rounded-full transition-opacity hover:opacity-100 ${url ? "" : "opacity-25"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- mêmes icônes que dans le courriel */}
      <img src={`/marque/reseaux/${reseau}.png`} alt={nom} width={48} height={48} className="block" />
      {url ? null : <span className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-[#3b82f6] text-white grid place-items-center"><Plus size={12} /></span>}
    </button>
  );
}

function ContenuBloc({ bloc: b, maj }: { bloc: Bloc; maj: (c: Partial<Bloc>) => void }) {
  switch (b.type) {
    case "titre":
      return <Editable valeur={b.texte} onChange={(texte) => maj({ texte })} placeholder="Titre" style={{ fontSize: 17, lineHeight: 1.4, fontWeight: "bold", color: "#3a3a3a" }} />;
    case "texte":
      return <TexteRiche html={b.html} onChange={(html) => maj({ html })} />;
    case "image":
      return b.url ? (
        // eslint-disable-next-line @next/next/no-img-element -- image de la lettre, de taille quelconque
        <img src={b.url} alt={b.alt} className="block w-full h-auto rounded-xl" />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2.5 py-10 rounded-xl border-2 border-dashed border-[#d5d8dd] bg-[#fafbfc] text-[#8a8a8a]">
          <IconeImage size={26} />
          <div className="flex gap-2">
            <BoutonTeleverser libelle="Téléverser une image" onUrl={(url) => maj({ url })} />
            <button type="button" onClick={() => { const u = demanderLien("", "Adresse d’une image (https://…)"); if (u) maj({ url: u }); }}
              className="h-8 px-3 rounded-md border border-[#d5d8dd] bg-white text-[12.5px] font-semibold text-[#3a3a3a] cursor-pointer hover:border-[#0f1d2c]">
              <Link2 size={13} className="inline -mt-0.5" /> Lien d’une image
            </button>
          </div>
        </div>
      );
    case "bouton":
      return (
        <div className="text-center">
          <span className="inline-block rounded-md px-6 py-3" style={{ background: ACCENT }}>
            <Editable valeur={b.libelle} onChange={(libelle) => maj({ libelle })} placeholder="Texte du bouton" style={{ fontSize: 15, fontWeight: "bold", color: "#fff" }} />
          </span>
          {!b.url ? <div className="mt-1.5 text-[11.5px] text-[#b45309]">Ce bouton n’a pas encore de lien : survolez-le, puis « Lien ».</div> : null}
        </div>
      );
  }
}
