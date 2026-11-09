"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  Columns2,
  Copy,
  Heading,
  Image as IconeImage,
  ImagePlus,
  Italic,
  Link2,
  List,
  Loader2,
  Minus,
  Monitor,
  MousePointerClick,
  MoveVertical,
  PanelTop,
  Settings2,
  Smartphone,
  Trash2,
  Type,
  Underline,
  X,
} from "lucide-react";
import { televerserImageLettre } from "@/lib/actions/newsletter";
import {
  blocVide,
  LARGEURS,
  nouvelId,
  POLICES,
  VARIABLES,
  versHtml,
  type Align,
  type Bloc,
  type DocLettre,
  type Police,
  type TypeBloc,
} from "@/lib/lettre-blocs";

const CHAMP =
  "w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2 text-[13.4px] outline-none focus:border-accent";
const ETIQUETTE = "block text-[12px] font-semibold text-muted mb-1";

const TYPES: { type: TypeBloc; libelle: string; icone: ReactNode }[] = [
  { type: "bandeau", libelle: "Bandeau", icone: <PanelTop size={16} /> },
  { type: "titre", libelle: "Titre", icone: <Heading size={16} /> },
  { type: "texte", libelle: "Texte", icone: <Type size={16} /> },
  { type: "image", libelle: "Image", icone: <IconeImage size={16} /> },
  { type: "bouton", libelle: "Bouton", icone: <MousePointerClick size={16} /> },
  { type: "colonnes", libelle: "2 colonnes", icone: <Columns2 size={16} /> },
  { type: "separateur", libelle: "Séparateur", icone: <Minus size={16} /> },
  { type: "espace", libelle: "Espace", icone: <MoveVertical size={16} /> },
];
const libelleType = (t: TypeBloc) => TYPES.find((x) => x.type === t)!;

// Aperçu fidèle : le même HTML que celui envoyé, avec des exemples pour les variables
export function ApercuLettre({ doc, mobile = false, hauteur = 640 }: { doc: DocLettre; mobile?: boolean; hauteur?: number }) {
  const html = useMemo(
    () =>
      versHtml(doc, {
        base: typeof window === "undefined" ? "" : window.location.origin,
        logo: '<img src="/marque/logo-courriel.png" width="180" alt="IMPACT 261" style="display:block;width:180px;height:auto">',
        vars: { prenom: "Noro", nom: "Noro Rasoanaivo", entreprise: "Bio Sud Essences", email: "noro@exemple.mg" },
        pied: ["Vous recevez ce message en tant que membre de la Chambre.", "Chambre de Commerce et de Coopération Canada–Madagascar"],
      }),
    [doc],
  );
  return (
    <div className="flex justify-center rounded-[var(--radius-m)] border border-line bg-surface-2 p-3 overflow-hidden">
      <iframe
        title="Aperçu de la lettre"
        srcDoc={html}
        sandbox=""
        className="bg-white rounded-[var(--radius-s)] border border-line transition-[width] duration-200"
        style={{ width: mobile ? 375 : "100%", height: hauteur }}
      />
    </div>
  );
}

// Éditeur visuel de la lettre : réglages, blocs à ajouter, déplacer, dupliquer, modifier ; aperçu en direct
export function EditeurBlocs({ initial }: { initial: DocLettre }) {
  const [doc, setDoc] = useState<DocLettre>(initial);
  const [ouvert, setOuvert] = useState<string | null>(initial.blocs[0]?.id ?? null);
  const [mobile, setMobile] = useState(false);
  const [vue, setVue] = useState<"modifier" | "apercu">("modifier");

  const maj = (id: string, changes: Partial<Bloc>) =>
    setDoc((d) => ({ ...d, blocs: d.blocs.map((b) => (b.id === id ? ({ ...b, ...changes } as Bloc) : b)) }));
  const ajouter = (type: TypeBloc) => {
    const b = blocVide(type);
    setDoc((d) => ({ ...d, blocs: [...d.blocs, b] }));
    setOuvert(b.id);
  };
  const deplacer = (i: number, sens: -1 | 1) =>
    setDoc((d) => {
      const j = i + sens;
      if (j < 0 || j >= d.blocs.length) return d;
      const blocs = [...d.blocs];
      [blocs[i], blocs[j]] = [blocs[j], blocs[i]];
      return { ...d, blocs };
    });
  const dupliquer = (i: number) => {
    const copie = { ...structuredClone(doc.blocs[i]), id: nouvelId() };
    setDoc((d) => ({ ...d, blocs: [...d.blocs.slice(0, i + 1), copie, ...d.blocs.slice(i + 1)] }));
    setOuvert(copie.id);
  };
  const supprimer = (id: string) => setDoc((d) => ({ ...d, blocs: d.blocs.filter((b) => b.id !== id) }));

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="contenu" value={JSON.stringify(doc)} />

      <div className="2xl:hidden inline-flex self-start rounded-[var(--radius-s)] border border-line p-0.5 bg-surface-2" role="tablist">
        {(["modifier", "apercu"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={vue === v}
            onClick={() => setVue(v)}
            className={`px-3.5 py-1.5 rounded-[6px] border-0 text-[13px] font-semibold cursor-pointer ${vue === v ? "bg-surface text-ink shadow-sm" : "bg-transparent text-muted"}`}
          >
            {v === "modifier" ? "Modifier" : "Aperçu"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
        <div className={`flex flex-col gap-3 min-w-0 ${vue === "apercu" ? "hidden 2xl:flex" : ""}`}>
          <label className="block">
            <span className={ETIQUETTE}>Ligne d’aperçu <span className="font-normal">(affichée après l’objet dans la boîte de réception)</span></span>
            <input value={doc.apercu} maxLength={200} onChange={(e) => setDoc({ ...doc, apercu: e.target.value })} placeholder="Ex. Le programme du mois et deux places offertes" className={CHAMP} />
          </label>

          <details className="rounded-[var(--radius-m)] border border-line bg-surface-2 group">
            <summary className="flex items-center gap-2 px-3.5 py-2.5 cursor-pointer text-[13px] font-semibold text-ink list-none [&::-webkit-details-marker]:hidden">
              <Settings2 size={15} className="text-muted" /> Style de la lettre
              <span className="ml-auto text-[12px] font-normal text-muted">{doc.police} · {doc.largeur} px</span>
            </summary>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 px-3.5 pb-3.5">
              <label><span className={ETIQUETTE}>Police</span>
                <select value={doc.police} onChange={(e) => setDoc({ ...doc, police: e.target.value as Police })} className={CHAMP}>
                  {POLICES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label><span className={ETIQUETTE}>Largeur</span>
                <select value={doc.largeur} onChange={(e) => setDoc({ ...doc, largeur: Number(e.target.value) })} className={CHAMP}>
                  {LARGEURS.map((l) => <option key={l} value={l}>{l} px</option>)}
                </select>
              </label>
              <Couleur libelle="Fond" valeur={doc.fond} onChange={(fond) => setDoc({ ...doc, fond })} />
              <Couleur libelle="Liens" valeur={doc.couleurLiens} onChange={(couleurLiens) => setDoc({ ...doc, couleurLiens })} />
            </div>
          </details>

          <ol className="list-none m-0 p-0 flex flex-col gap-2">
            {doc.blocs.map((b, i) => {
              const t = libelleType(b.type);
              const actif = ouvert === b.id;
              return (
                <li key={b.id} className={`rounded-[var(--radius-m)] border bg-surface transition-colors duration-150 ${actif ? "border-accent shadow-sm" : "border-line"}`}>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <button type="button" onClick={() => setOuvert(actif ? null : b.id)} aria-expanded={actif} className="flex-1 min-w-0 flex items-center gap-2.5 border-0 bg-transparent text-left cursor-pointer p-0">
                      <span className="w-8 h-8 shrink-0 rounded-[var(--radius-s)] bg-surface-2 text-muted grid place-items-center">{t.icone}</span>
                      <span className="min-w-0">
                        <span className="block text-[13.4px] font-semibold text-ink">{t.libelle}</span>
                        <span className="block text-[12px] text-muted truncate">{resume(b)}</span>
                      </span>
                    </button>
                    <Outil libelle="Monter" onClick={() => deplacer(i, -1)} disabled={i === 0}><ArrowUp size={14} /></Outil>
                    <Outil libelle="Descendre" onClick={() => deplacer(i, 1)} disabled={i === doc.blocs.length - 1}><ArrowDown size={14} /></Outil>
                    <Outil libelle="Dupliquer" onClick={() => dupliquer(i)}><Copy size={14} /></Outil>
                    <Outil libelle="Supprimer" onClick={() => supprimer(b.id)} danger><Trash2 size={14} /></Outil>
                  </div>
                  {actif ? <div className="px-3.5 pb-3.5 pt-1 border-t border-line flex flex-col gap-3"><Reglages bloc={b} maj={(c) => maj(b.id, c)} /></div> : null}
                </li>
              );
            })}
          </ol>

          <div className="rounded-[var(--radius-m)] border border-dashed border-line p-3">
            <div className="text-[12px] font-semibold text-muted mb-2">Ajouter un bloc</div>
            <div className="grid grid-cols-4 gap-1.5">
              {TYPES.map((t) => (
                <button key={t.type} type="button" onClick={() => ajouter(t.type)} className="flex flex-col items-center gap-1 py-2.5 rounded-[var(--radius-s)] border border-line bg-surface text-[11.5px] font-semibold text-ink cursor-pointer hover:border-accent hover:text-accent transition-colors duration-150">
                  {t.icone} {t.libelle}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`flex flex-col gap-2 min-w-0 2xl:sticky 2xl:top-[88px] ${vue === "modifier" ? "hidden 2xl:flex" : ""}`}>
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-muted">Aperçu (exemple : Noro, Bio Sud Essences)</span>
            <div className="inline-flex rounded-[var(--radius-s)] border border-line p-0.5 bg-surface-2">
              {[false, true].map((m) => (
                <button key={String(m)} type="button" onClick={() => setMobile(m)} aria-label={m ? "Aperçu mobile" : "Aperçu ordinateur"} aria-pressed={mobile === m}
                  className={`w-8 h-7 grid place-items-center rounded-[6px] border-0 cursor-pointer ${mobile === m ? "bg-surface text-ink shadow-sm" : "bg-transparent text-muted"}`}>
                  {m ? <Smartphone size={14} /> : <Monitor size={14} />}
                </button>
              ))}
            </div>
          </div>
          <ApercuLettre doc={doc} mobile={mobile} />
        </div>
      </div>
    </div>
  );
}

function resume(b: Bloc): string {
  switch (b.type) {
    case "bandeau":
      return b.titre || (b.image ? "Image" : "Sans titre");
    case "titre":
    case "texte":
      return b.texte.replace(/\s+/g, " ").slice(0, 70) || "Vide";
    case "image":
      return b.url ? b.alt || "Image choisie" : "Aucune image";
    case "bouton":
      return `${b.libelle}${b.url ? ` → ${b.url}` : " (sans lien)"}`;
    case "colonnes":
      return `${b.gauche.texte.slice(0, 30)} | ${b.droite.texte.slice(0, 30)}`;
    case "separateur":
      return "Ligne de séparation";
    case "espace":
      return `${b.hauteur} px`;
  }
}

function Outil({ libelle, onClick, disabled, danger, children }: { libelle: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={libelle} title={libelle}
      className={`w-8 h-8 shrink-0 grid place-items-center rounded-[var(--radius-s)] border border-line bg-surface cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${danger ? "text-muted hover:text-bad hover:border-bad" : "text-muted hover:text-ink"}`}>
      {children}
    </button>
  );
}

function Couleur({ libelle, valeur, onChange, vide }: { libelle: string; valeur: string; onChange: (v: string) => void; vide?: boolean }) {
  return (
    <label className="block">
      <span className={ETIQUETTE}>{libelle}</span>
      <span className="flex items-center gap-1.5">
        <input type="color" value={valeur || "#ffffff"} onChange={(e) => onChange(e.target.value)} className="w-10 h-9 p-0.5 rounded-[var(--radius-s)] border border-line bg-surface cursor-pointer" />
        {vide && valeur ? (
          <button type="button" onClick={() => onChange("")} className="text-[12px] text-muted border-0 bg-transparent cursor-pointer hover:text-accent">Aucun</button>
        ) : vide ? <span className="text-[12px] text-faint">Aucun</span> : null}
      </span>
    </label>
  );
}

function Alignement({ valeur, onChange }: { valeur: Align; onChange: (a: Align) => void }) {
  const choix: [Align, ReactNode, string][] = [["left", <AlignLeft key="l" size={14} />, "Gauche"], ["center", <AlignCenter key="c" size={14} />, "Centre"], ["right", <AlignRight key="r" size={14} />, "Droite"]];
  return (
    <div>
      <span className={ETIQUETTE}>Alignement</span>
      <div className="inline-flex rounded-[var(--radius-s)] border border-line p-0.5 bg-surface-2">
        {choix.map(([a, icone, l]) => (
          <button key={a} type="button" onClick={() => onChange(a)} aria-label={l} aria-pressed={valeur === a}
            className={`w-8 h-7 grid place-items-center rounded-[6px] border-0 cursor-pointer ${valeur === a ? "bg-surface text-ink shadow-sm" : "bg-transparent text-muted"}`}>
            {icone}
          </button>
        ))}
      </div>
    </div>
  );
}

function Taille({ valeur, min, max, onChange }: { valeur: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className={ETIQUETTE}>Taille ({valeur} px)</span>
      <input type="range" min={min} max={max} value={valeur} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
    </label>
  );
}

// Choisir, téléverser, retirer une image
function ChoixImage({ valeur, onChange, libelle = "Image" }: { valeur: string; onChange: (url: string) => void; libelle?: string }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  return (
    <div>
      <span className={ETIQUETTE}>{libelle}</span>
      <div className="flex items-center gap-3">
        <span className="w-20 h-14 shrink-0 rounded-[var(--radius-s)] border border-line bg-surface-2 grid place-items-center overflow-hidden text-faint">
          {/* eslint-disable-next-line @next/next/no-img-element -- image téléversée, de taille quelconque */}
          {valeur ? <img src={valeur} alt="" className="w-full h-full object-cover" /> : <IconeImage size={20} />}
        </span>
        <label className={`btn-contour btn-contour-sm text-ink cursor-pointer ${enCours ? "opacity-60 pointer-events-none" : ""}`}>
          {enCours ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {valeur ? "Changer" : "Téléverser"}
          <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setEnCours(true);
            setErreur("");
            const fd = new FormData();
            fd.set("image", f);
            const r = await televerserImageLettre(fd).catch(() => ({ erreur: "Le téléversement n’a pas abouti." }));
            setEnCours(false);
            if ("url" in r) onChange(r.url);
            else setErreur(r.erreur);
          }} />
        </label>
        {valeur ? <button type="button" onClick={() => onChange("")} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-muted border-0 bg-transparent cursor-pointer hover:text-bad"><X size={13} /> Retirer</button> : null}
      </div>
      {erreur ? <p className="m-0 mt-1 text-[12px] text-bad">{erreur}</p> : null}
    </div>
  );
}

// Zone de texte avec barre de mise en forme (gras, italique, souligné, lien, liste, variables)
function TexteMisEnForme({ valeur, onChange, lignes = 6 }: { valeur: string; onChange: (v: string) => void; lignes?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const entourer = (avant: string, apres: string, defaut: string) => {
    const z = ref.current;
    if (!z) return;
    const { selectionStart: a, selectionEnd: b } = z;
    const choisi = valeur.slice(a, b) || defaut;
    const suite = valeur.slice(0, a) + avant + choisi + apres + valeur.slice(b);
    onChange(suite);
    requestAnimationFrame(() => {
      z.focus();
      z.setSelectionRange(a + avant.length, a + avant.length + choisi.length);
    });
  };
  const inserer = (t: string) => entourer(t, "", "");
  const liste = () => {
    const z = ref.current;
    if (!z) return;
    const { selectionStart: a, selectionEnd: b } = z;
    const debut = valeur.lastIndexOf("\n", a - 1) + 1;
    const bloc = valeur.slice(debut, b) || "Élément";
    const puce = bloc.split("\n").map((l) => (l.startsWith("- ") ? l : `- ${l}`)).join("\n");
    onChange(valeur.slice(0, debut) + puce + valeur.slice(b));
  };
  const B = "w-8 h-8 grid place-items-center rounded-[6px] border-0 bg-transparent text-muted cursor-pointer hover:bg-surface hover:text-ink";
  return (
    <div className="rounded-[var(--radius-s)] border border-line overflow-hidden focus-within:border-accent">
      <div className="flex items-center gap-0.5 flex-wrap px-1.5 py-1 bg-surface-2 border-b border-line">
        <button type="button" className={B} onClick={() => entourer("**", "**", "texte en gras")} aria-label="Gras" title="Gras"><Bold size={14} /></button>
        <button type="button" className={B} onClick={() => entourer("*", "*", "texte en italique")} aria-label="Italique" title="Italique"><Italic size={14} /></button>
        <button type="button" className={B} onClick={() => entourer("__", "__", "texte souligné")} aria-label="Souligné" title="Souligné"><Underline size={14} /></button>
        <button type="button" className={B} onClick={() => {
          const url = window.prompt("Adresse du lien (https://…)");
          if (url) entourer("[", `](${url.trim()})`, "texte du lien");
        }} aria-label="Lien" title="Lien"><Link2 size={14} /></button>
        <button type="button" className={B} onClick={liste} aria-label="Liste à puces" title="Liste à puces"><List size={14} /></button>
        <span className="w-px h-5 bg-line mx-1" aria-hidden />
        <select value="" onChange={(e) => { if (e.target.value) inserer(`{${e.target.value}}`); }} aria-label="Insérer une variable"
          className="h-8 rounded-[6px] border-0 bg-transparent text-[12.5px] font-semibold text-muted cursor-pointer hover:text-ink">
          <option value="">+ Variable</option>
          {VARIABLES.map((v) => <option key={v.cle} value={v.cle}>{v.libelle}</option>)}
        </select>
      </div>
      <textarea ref={ref} value={valeur} rows={lignes} onChange={(e) => onChange(e.target.value)} className="w-full border-0 bg-surface text-ink px-3 py-2.5 text-[13.4px] leading-relaxed outline-none resize-y" />
      <p className="m-0 px-3 pb-2 text-[11.5px] text-faint">Une ligne vide sépare les paragraphes. {"{prenom}"} est remplacé par le prénom de chaque destinataire.</p>
    </div>
  );
}

function Reglages({ bloc: b, maj }: { bloc: Bloc; maj: (c: Partial<Bloc>) => void }) {
  const grille = "grid gap-3 grid-cols-2 sm:grid-cols-4 items-end";
  switch (b.type) {
    case "bandeau":
      return (
        <>
          <ChoixImage libelle="Image de fond (facultative)" valeur={b.image} onChange={(image) => maj({ image })} />
          <label><span className={ETIQUETTE}>Titre</span><input value={b.titre} onChange={(e) => maj({ titre: e.target.value })} className={CHAMP} /></label>
          <label><span className={ETIQUETTE}>Sous-titre</span><input value={b.sousTitre} onChange={(e) => maj({ sousTitre: e.target.value })} className={CHAMP} /></label>
          <div className={grille}>
            <Couleur libelle="Fond" valeur={b.fond} onChange={(fond) => maj({ fond })} />
            <Couleur libelle="Texte" valeur={b.couleur} onChange={(couleur) => maj({ couleur })} />
            <Alignement valeur={b.align} onChange={(align) => maj({ align })} />
          </div>
        </>
      );
    case "titre":
      return (
        <>
          <input value={b.texte} onChange={(e) => maj({ texte: e.target.value })} className={CHAMP} aria-label="Titre" />
          <div className={grille}>
            <Taille valeur={b.taille} min={16} max={40} onChange={(taille) => maj({ taille })} />
            <Couleur libelle="Couleur" valeur={b.couleur} onChange={(couleur) => maj({ couleur })} />
            <Couleur libelle="Fond de section" valeur={b.fondSection} vide onChange={(fondSection) => maj({ fondSection })} />
            <Alignement valeur={b.align} onChange={(align) => maj({ align })} />
          </div>
        </>
      );
    case "texte":
      return (
        <>
          <TexteMisEnForme valeur={b.texte} onChange={(texte) => maj({ texte })} lignes={8} />
          <div className={grille}>
            <Taille valeur={b.taille} min={12} max={22} onChange={(taille) => maj({ taille })} />
            <Couleur libelle="Couleur" valeur={b.couleur} onChange={(couleur) => maj({ couleur })} />
            <Couleur libelle="Fond de section" valeur={b.fondSection} vide onChange={(fondSection) => maj({ fondSection })} />
            <Alignement valeur={b.align} onChange={(align) => maj({ align })} />
          </div>
        </>
      );
    case "image":
      return (
        <>
          <ChoixImage valeur={b.url} onChange={(url) => maj({ url })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className={ETIQUETTE}>Description (si l’image ne s’affiche pas)</span><input value={b.alt} onChange={(e) => maj({ alt: e.target.value })} className={CHAMP} /></label>
            <label><span className={ETIQUETTE}>Lien au clic (facultatif)</span><input value={b.lien} onChange={(e) => maj({ lien: e.target.value })} placeholder="https://…" className={CHAMP} /></label>
          </div>
          <div className={grille}>
            <Taille valeur={b.largeur} min={20} max={100} onChange={(largeur) => maj({ largeur })} />
            <Couleur libelle="Fond de section" valeur={b.fondSection} vide onChange={(fondSection) => maj({ fondSection })} />
            <Alignement valeur={b.align} onChange={(align) => maj({ align })} />
          </div>
        </>
      );
    case "bouton":
      return (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className={ETIQUETTE}>Texte du bouton</span><input value={b.libelle} onChange={(e) => maj({ libelle: e.target.value })} className={CHAMP} /></label>
            <label><span className={ETIQUETTE}>Lien</span><input value={b.url} onChange={(e) => maj({ url: e.target.value })} placeholder="https://…" className={CHAMP} /></label>
          </div>
          <div className={grille}>
            <Couleur libelle="Fond" valeur={b.fond} onChange={(fond) => maj({ fond })} />
            <Couleur libelle="Texte" valeur={b.couleur} onChange={(couleur) => maj({ couleur })} />
            <Couleur libelle="Fond de section" valeur={b.fondSection} vide onChange={(fondSection) => maj({ fondSection })} />
            <Alignement valeur={b.align} onChange={(align) => maj({ align })} />
          </div>
        </>
      );
    case "colonnes":
      return (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["gauche", "droite"] as const).map((cote) => (
              <div key={cote} className="flex flex-col gap-2 rounded-[var(--radius-s)] border border-line p-2.5">
                <b className="text-[12.5px] text-ink">Colonne de {cote}</b>
                <ChoixImage valeur={b[cote].image} onChange={(image) => maj({ [cote]: { ...b[cote], image } })} />
                <TexteMisEnForme valeur={b[cote].texte} onChange={(texte) => maj({ [cote]: { ...b[cote], texte } })} lignes={4} />
              </div>
            ))}
          </div>
          <Couleur libelle="Fond de section" valeur={b.fondSection} vide onChange={(fondSection) => maj({ fondSection })} />
          <p className="m-0 text-[12px] text-faint">Sur téléphone, les deux colonnes passent l’une sous l’autre.</p>
        </>
      );
    case "separateur":
      return <Couleur libelle="Couleur de la ligne" valeur={b.couleur} onChange={(couleur) => maj({ couleur })} />;
    case "espace":
      return <Taille valeur={b.hauteur} min={4} max={120} onChange={(hauteur) => maj({ hauteur })} />;
  }
}
