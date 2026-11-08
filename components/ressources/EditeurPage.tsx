"use client";

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Check,
  GripVertical,
  Heading,
  Image as IconeImage,
  ImagePlus,
  LoaderCircle,
  Plus,
  RotateCw,
  Trash2,
  TriangleAlert,
  Type,
  Upload,
  Video,
  type LucideIcon,
} from "lucide-react";
import {
  JetonsEnvoyes,
  pourcentage,
  useEnvois,
  type Envoi,
} from "@/components/EnvoisSuivis";
import { Field, INPUT } from "@/components/form-bits";
import { Card } from "@/components/ui";
import { enregistrerPageRessource } from "@/lib/actions/content";
import {
  PLAFOND_BLOCS,
  lienVideo,
  type Alignement,
  type Bloc,
  type Ligne,
  type TypeBloc,
} from "@/lib/blocs";
import { PLAFOND_FICHIER, PLAFOND_FICHIER_MO } from "@/lib/plafonds";
import { ACCEPT_VIDEO, formatVideo } from "@/lib/video-presentation";
import { ChoixCouleur } from "./ChoixCouleur";
import { VideoEnLien } from "./PageRessource";
import { TexteRiche } from "./TexteRiche";

interface Media {
  local?: File;
  apercu?: string;
}
type EditeTitre = {
  cle: string;
  type: "titre";
  texte: string;
  niveau: 2 | 3;
  alignement?: Alignement;
  couleur?: string;
};
type EditeTexte = { cle: string; type: "texte"; lignes: Ligne[] };
type EditePhoto = {
  cle: string;
  type: "photo";
  fichier: string;
  legende: string;
} & Media;
type EditeVideo = {
  cle: string;
  type: "video";
  source: "fichier" | "lien";
  fichier: string;
  url: string;
} & Media;
type Edite = EditeTitre | EditeTexte | EditePhoto | EditeVideo;

const CATALOGUE: { type: TypeBloc; nom: string; Icone: LucideIcon }[] = [
  { type: "titre", nom: "Titre", Icone: Heading },
  { type: "texte", nom: "Texte", Icone: Type },
  { type: "photo", nom: "Photo", Icone: IconeImage },
  { type: "video", nom: "Vidéo", Icone: Video },
];
const NOM = Object.fromEntries(CATALOGUE.map((c) => [c.type, c.nom])) as Record<
  TypeBloc,
  string
>;

const MARQUE = "application/x-cancham-bloc";

const versEdite = (b: Bloc, cle: string): Edite =>
  b.type === "titre" || b.type === "texte"
    ? { cle, ...b }
    : b.type === "photo"
      ? { cle, type: "photo", fichier: b.fichier, legende: b.legende ?? "" }
      : b.source === "lien"
        ? { cle, type: "video", source: "lien", fichier: "", url: b.url }
        : {
            cle,
            type: "video",
            source: "fichier",
            fichier: b.fichier,
            url: "",
          };

const neuf = (type: TypeBloc, cle: string): Edite =>
  type === "titre"
    ? { cle, type, texte: "", niveau: 2 }
    : type === "texte"
      ? { cle, type, lignes: [] }
      : type === "photo"
        ? { cle, type, fichier: "", legende: "" }
        : { cle, type, source: "fichier", fichier: "", url: "" };

const estVide = (b: Edite) =>
  b.type === "titre"
    ? !b.texte.trim()
    : b.type === "texte"
      ? !b.lignes.length
      : !b.local && !b.fichier && !(b.type === "video" && b.url.trim());

const ALIGNEMENTS: {
  valeur: Alignement | undefined;
  nom: string;
  Icone: LucideIcon;
}[] = [
  { valeur: undefined, nom: "Aligner à gauche", Icone: AlignLeft },
  { valeur: "centre", nom: "Centrer", Icone: AlignCenter },
  { valeur: "droite", nom: "Aligner à droite", Icone: AlignRight },
];
const CLASSE_ALIGNEMENT: Record<Alignement, string> = {
  centre: "text-center",
  droite: "text-right",
};

export interface RessourcePage {
  id: string;
  titre: string;
  description: string | null;
  cat: string;
  type: "gratuit" | "payant";
  prix: number;
  cover: string | null;
  dossierId: string | null;
  blocs: Bloc[];
}

export function EditeurPage({
  ressource,
  dossiers,
  dossierParDefaut,
}: {
  ressource?: RessourcePage;
  dossiers: {
    id: string;
    nom: string;
    profondeur: number;
    restreint?: boolean;
  }[];
  dossierParDefaut?: string;
}) {
  const [blocs, setBlocs] = useState<Edite[]>(() =>
    (ressource?.blocs ?? []).map((b, i) => versEdite(b, `b${i}`)),
  );
  const compteur = useRef(0);
  const [actif, setActif] = useState<string | null>(null);
  const [payant, setPayant] = useState(ressource?.type === "payant");
  const [glisse, setGlisse] = useState<
    { nouveau: TypeBloc } | { cle: string } | "fichier" | null
  >(null);
  const [cible, setCible] = useState<number | null>(null);
  const [saisie, setSaisie] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [modifie, setModifie] = useState(false);
  const [enCours, demarrer] = useTransition();
  const toile = useRef<HTMLDivElement>(null);
  const alerte = useRef<HTMLDivElement>(null);
  const aMontrer = useRef<string | null>(null);

  const locaux = useMemo(
    () => blocs.flatMap((b) => ("local" in b && b.local ? [b.local] : [])),
    [blocs],
  );
  const { etats } = useEnvois(locaux);
  const envoiDe = (fichier?: File): Envoi | null =>
    fichier ? (etats[locaux.indexOf(fichier)] ?? null) : null;
  const enAttente = locaux.some((_, i) => !etats[i]?.jeton);
  const echec = etats.some((e) => e?.erreur);

  const changer = (suite: (avant: Edite[]) => Edite[]) => {
    setBlocs(suite);
    setModifie(true);
  };
  const modifier = (cle: string, partiel: Partial<Edite>) =>
    changer((avant) =>
      avant.map((b) => (b.cle === cle ? ({ ...b, ...partiel } as Edite) : b)),
    );

  const inserer = (bloc: (cle: string) => Edite, rang: number) => {
    if (blocs.length >= PLAFOND_BLOCS) {
      setErreur(`Une page compte ${PLAFOND_BLOCS} blocs au plus.`);
      return;
    }
    const cle = `n${compteur.current++}`;
    changer((avant) => [
      ...avant.slice(0, rang),
      bloc(cle),
      ...avant.slice(rang),
    ]);
    setActif(cle);
    aMontrer.current = cle;
  };

  const deplacer = (cle: string, rang: number) =>
    changer((avant) => {
      const de = avant.findIndex((b) => b.cle === cle);
      const vise = Math.max(0, Math.min(rang, avant.length));
      const vers = vise > de ? vise - 1 : vise;
      if (de < 0 || vers === de) return avant;
      const reste = avant.filter((b) => b.cle !== cle);
      return [...reste.slice(0, vers), avant[de], ...reste.slice(vers)];
    });

  const retirer = (b: Edite) => {
    if (
      !estVide(b) &&
      !window.confirm(`Retirer ce bloc « ${NOM[b.type]} » ?`)
    ) {
      return;
    }
    changer((avant) => avant.filter((x) => x.cle !== b.cle));
  };

  const blocDuFichier = (f: File): ((cle: string) => Edite) | string => {
    if (f.size > PLAFOND_FICHIER) {
      return `« ${f.name} » dépasse ${PLAFOND_FICHIER_MO} Mo.`;
    }
    const apercu = URL.createObjectURL(f);
    if (f.type.startsWith("image/")) {
      return (cle) => ({
        cle,
        type: "photo",
        fichier: "",
        legende: "",
        local: f,
        apercu,
      });
    }
    if (formatVideo(f.name)) {
      return (cle) => ({
        cle,
        type: "video",
        source: "fichier",
        fichier: "",
        url: "",
        local: f,
        apercu,
      });
    }
    return `« ${f.name} » : seules les photos et les vidéos (MP4, WebM, MOV) se déposent dans la page.`;
  };

  const finir = () => {
    setGlisse(null);
    setCible(null);
    setSaisie(null);
  };

  const viser = (e: DragEvent) => {
    const fichiers = e.dataTransfer.types.includes("Files");
    if (!glisse && !fichiers) return;
    e.preventDefault();
    e.dataTransfer.dropEffect =
      glisse && typeof glisse === "object" && "cle" in glisse ? "move" : "copy";
    if (!glisse) setGlisse("fichier");
    const elements = Array.from(
      toile.current?.querySelectorAll<HTMLElement>(":scope > [data-bloc]") ??
        [],
    );
    let rang = elements.length;
    for (let i = 0; i < elements.length; i++) {
      const r = elements[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        rang = i;
        break;
      }
    }
    if (rang !== cible) setCible(rang);
  };

  const deposer = (e: DragEvent) => {
    e.preventDefault();
    const rang = cible ?? blocs.length;
    if (glisse && typeof glisse === "object") {
      if ("nouveau" in glisse) {
        const type = glisse.nouveau;
        inserer((cle) => neuf(type, cle), rang);
      } else {
        deplacer(glisse.cle, rang);
      }
    } else {
      const refus: string[] = [];
      Array.from(e.dataTransfer.files).forEach((f, i) => {
        const bloc = blocDuFichier(f);
        if (typeof bloc === "string") refus.push(bloc);
        else inserer(bloc, rang + i);
      });
      if (refus.length) setErreur(refus.join(" "));
    }
    finir();
  };

  useEffect(() => {
    const retenir = (e: globalThis.DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", retenir);
    window.addEventListener("drop", retenir);
    return () => {
      window.removeEventListener("dragover", retenir);
      window.removeEventListener("drop", retenir);
    };
  }, []);

  useEffect(() => {
    if (!modifie || enCours) return;
    const prevenir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", prevenir);
    return () => window.removeEventListener("beforeunload", prevenir);
  }, [modifie, enCours]);

  useEffect(() => {
    const cle = aMontrer.current;
    if (!cle) return;
    aMontrer.current = null;
    const el = toile.current?.querySelector<HTMLElement>(
      `[data-bloc="${cle}"]`,
    );
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    el?.querySelector<HTMLElement>(
      "textarea, [contenteditable], input[type=url]",
    )?.focus({ preventScroll: true });
  }, [blocs]);

  useEffect(() => {
    if (erreur) alerte.current?.scrollIntoView({ block: "nearest" });
  }, [erreur]);

  const envoyer = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const donnees = new FormData(e.currentTarget);
    donnees.set(
      "contenu",
      JSON.stringify(
        blocs.map((b) => {
          if (b.type === "titre") {
            const { type, texte, niveau, alignement, couleur } = b;
            return { type, texte, niveau, alignement, couleur };
          }
          if (b.type === "texte") return { type: b.type, lignes: b.lignes };
          const fichier = b.local ? (envoiDe(b.local)?.jeton ?? "") : b.fichier;
          return b.type === "photo"
            ? { type: "photo", fichier, legende: b.legende }
            : b.source === "lien"
              ? { type: "video", source: "lien", url: b.url }
              : { type: "video", source: "fichier", fichier };
        }),
      ),
    );
    setErreur(null);
    demarrer(async () => {
      const reponse = await enregistrerPageRessource(donnees);
      if (!reponse?.erreur) return;
      setErreur(reponse.erreur);
      if (reponse.renvoyer) {
        setBlocs((avant) =>
          avant.map((b) =>
            "local" in b && b.local
              ? {
                  ...b,
                  local: new File([b.local], b.local.name, {
                    type: b.local.type,
                  }),
                }
              : b,
          ),
        );
      }
    });
  };

  const tirage =
    glisse && typeof glisse === "object" && "cle" in glisse ? glisse.cle : null;

  return (
    <form
      onSubmit={envoyer}
      onChange={() => setModifie(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
          e.preventDefault();
        }
      }}
      className="grid items-start gap-5 lg:grid-cols-[292px_minmax(0,1fr)]"
    >
      {ressource ? (
        <input type="hidden" name="resourceId" value={ressource.id} />
      ) : null}

      <div className="flex flex-col gap-4 lg:sticky lg:top-[84px] lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto lg:pr-1">
        <Card className="p-4">
          <button
            type="submit"
            disabled={enCours || enAttente}
            className="btn-action w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enCours ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            {enCours
              ? "Enregistrement…"
              : ressource
                ? "Enregistrer la page"
                : "Publier la page"}
          </button>
          <p
            className={`m-0 mt-2 text-center text-[12px] ${echec ? "font-semibold text-accent" : "text-faint"}`}
          >
            {echec
              ? "Un envoi a échoué : relancez-le dans son bloc."
              : enAttente
                ? "Envoi des fichiers en cours…"
                : `${blocs.length} bloc${blocs.length > 1 ? "s" : ""} dans la page`}
          </p>
        </Card>

        <Card className="p-4">
          <h2 className="m-0 text-[12px] font-semibold uppercase tracking-[0.07em] text-faint">
            Blocs
          </h2>
          <p className="m-0 mt-1 text-[12.2px] text-muted">
            Glissez un bloc dans la page, ou cliquez pour l’ajouter à la fin.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {CATALOGUE.map(({ type, nom, Icone }) => (
              <button
                key={type}
                type="button"
                draggable
                onDragStart={(e) => {
                  setGlisse({ nouveau: type });
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData(MARQUE, type);
                }}
                onDragEnd={finir}
                onClick={() => inserer((cle) => neuf(type, cle), blocs.length)}
                className="flex cursor-grab flex-col items-center gap-1.5 rounded-[var(--radius-m)] border border-line bg-surface-2 px-2 py-3.5 text-[12.6px] font-semibold text-ink hover:border-accent hover:bg-accent-soft hover:text-accent active:cursor-grabbing"
              >
                <Icone size={22} strokeWidth={1.7} />
                {nom}
              </button>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-3.5 p-4">
          <h2 className="m-0 text-[12px] font-semibold uppercase tracking-[0.07em] text-faint">
            Réglages
          </h2>
          <Field label="Catégorie">
            <select
              name="cat"
              defaultValue={ressource?.cat ?? "Guide"}
              className={INPUT}
            >
              {["Guide", "Modèle", "Formation", "Rapport"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Accès">
            <select
              name="type"
              value={payant ? "payant" : "gratuit"}
              onChange={(e) => setPayant(e.target.value === "payant")}
              className={INPUT}
            >
              <option value="gratuit">Inclus dans l’adhésion</option>
              <option value="payant">Payant</option>
            </select>
          </Field>
          {payant ? (
            <Field label="Prix ($ CAD)">
              <input
                type="number"
                name="prix"
                min={1}
                required
                defaultValue={ressource?.prix || 50000}
                className={INPUT}
              />
            </Field>
          ) : null}
          <Field
            label="Dossier"
            hint="Vide, elle reste à la racine de la bibliothèque."
          >
            <select
              name="dossier"
              defaultValue={ressource?.dossierId ?? dossierParDefaut ?? ""}
              className={INPUT}
            >
              <option value="">Racine de la bibliothèque</option>
              {dossiers.map((d) => (
                <option key={d.id} value={d.id}>
                  {`${"\u00a0\u00a0".repeat(d.profondeur)}${d.profondeur ? "└ " : ""}${d.nom}${d.restreint ? " — accès réservé" : ""}`}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Description"
            hint="Facultatif : la carte en montre les premières lignes."
          >
            <textarea
              name="description"
              rows={3}
              maxLength={600}
              defaultValue={ressource?.description ?? ""}
              className={INPUT}
            />
          </Field>
          <ChampCouverture actuelle={ressource?.cover ?? null} />
        </Card>
      </div>

      <div className="min-w-0">
        {erreur ? (
          <div
            ref={alerte}
            role="alert"
            className="mx-auto mb-3 flex max-w-[860px] items-start gap-2.5 rounded-[var(--radius-m)] border border-accent/30 bg-accent-soft px-4 py-3 text-[13.4px] font-semibold text-accent"
          >
            <TriangleAlert size={17} className="mt-px shrink-0" />
            {erreur}
          </div>
        ) : null}

        <div className="mx-auto max-w-[860px] rounded-[var(--radius-m)] border border-line bg-surface px-4 pb-6 pt-7 shadow-[var(--shadow)] sm:px-9">
          <ChampAuto
            name="titre"
            required
            maxLength={200}
            defaultValue={ressource?.titre ?? ""}
            placeholder="Titre de la ressource"
            aria-label="Titre de la ressource"
            onInput={() => setModifie(true)}
            className="titre text-[30px] leading-tight"
          />

          <div
            ref={toile}
            onDragOver={viser}
            onDrop={deposer}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setCible(null);
                if (glisse === "fichier") setGlisse(null);
              }
            }}
            className="mt-3"
          >
            {blocs.length ? null : (
              <div
                className={`flex flex-col items-center gap-2 rounded-[var(--radius-m)] border-2 border-dashed px-6 py-14 text-center ${
                  glisse
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line text-faint"
                }`}
              >
                <Plus size={26} />
                <span className="text-[14.5px] font-semibold text-ink">
                  La page est vide
                </span>
                <span className="max-w-[40ch] text-[13px] text-muted">
                  Glissez ici un bloc de la colonne de gauche — ou une photo,
                  une vidéo depuis votre ordinateur.
                </span>
              </div>
            )}

            {blocs.map((b, i) => {
              const ici = actif === b.cle;
              return (
                <Fragment key={b.cle}>
                  <Repere visible={Boolean(glisse) && cible === i} />
                  <div
                    data-bloc={b.cle}
                    draggable={saisie === b.cle}
                    onDragStart={(e) => {
                      if (saisie !== b.cle) return;
                      setGlisse({ cle: b.cle });
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData(MARQUE, b.cle);
                    }}
                    onDragEnd={finir}
                    onMouseDownCapture={() => setActif(b.cle)}
                    onFocusCapture={() => setActif(b.cle)}
                    className={`group/bloc relative rounded-[var(--radius-m)] border px-3.5 py-3 transition-colors ${
                      ici
                        ? "border-accent/55 bg-surface"
                        : "border-transparent hover:border-line"
                    } ${tirage === b.cle ? "opacity-40" : ""}`}
                  >
                    <div
                      className={`absolute -top-3.5 right-3 z-10 flex items-center rounded-full border border-line bg-surface pl-0.5 pr-1 shadow-[0_4px_12px_-8px_rgb(15_29_44/0.5)] transition-opacity ${
                        ici
                          ? "opacity-100"
                          : "opacity-0 group-focus-within/bloc:opacity-100 group-hover/bloc:opacity-100"
                      }`}
                    >
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Déplacer le bloc « ${NOM[b.type]} » : glissez, ou flèches haut et bas`}
                        title="Glisser pour déplacer"
                        onMouseDown={() => setSaisie(b.cle)}
                        onMouseUp={() => setSaisie(null)}
                        onKeyDown={(e) => {
                          const pas =
                            e.key === "ArrowUp"
                              ? -1
                              : e.key === "ArrowDown"
                                ? 2
                                : 0;
                          if (!pas) return;
                          e.preventDefault();
                          deplacer(b.cle, i + pas);
                        }}
                        className="flex h-7 w-6 cursor-grab items-center justify-center rounded-full text-faint hover:text-ink active:cursor-grabbing"
                      >
                        <GripVertical size={15} />
                      </span>
                      <span className="pr-1.5 text-[10.8px] font-semibold uppercase tracking-[0.06em] text-muted">
                        {NOM[b.type]}
                      </span>
                      <Commande
                        libelle="Monter le bloc"
                        disabled={i === 0}
                        onClick={() => deplacer(b.cle, i - 1)}
                      >
                        <ArrowUp size={14} />
                      </Commande>
                      <Commande
                        libelle="Descendre le bloc"
                        disabled={i === blocs.length - 1}
                        onClick={() => deplacer(b.cle, i + 2)}
                      >
                        <ArrowDown size={14} />
                      </Commande>
                      <Commande
                        libelle="Retirer le bloc"
                        danger
                        onClick={() => retirer(b)}
                      >
                        <Trash2 size={14} />
                      </Commande>
                    </div>

                    {b.type === "titre" ? (
                      <BlocTitre
                        bloc={b}
                        actif={ici}
                        onChange={(p) => modifier(b.cle, p)}
                      />
                    ) : b.type === "texte" ? (
                      <TexteRiche
                        lignes={b.lignes}
                        actif={ici}
                        onChange={(lignes) => modifier(b.cle, { lignes })}
                      />
                    ) : b.type === "photo" ? (
                      <BlocPhoto
                        bloc={b}
                        resourceId={ressource?.id}
                        envoi={envoiDe(b.local)}
                        onChange={(p) => modifier(b.cle, p)}
                        onRefus={setErreur}
                      />
                    ) : (
                      <BlocVideo
                        bloc={b}
                        resourceId={ressource?.id}
                        envoi={envoiDe(b.local)}
                        onChange={(p) => modifier(b.cle, p)}
                        onRefus={setErreur}
                      />
                    )}
                  </div>
                </Fragment>
              );
            })}
            {blocs.length ? (
              <Repere visible={Boolean(glisse) && cible === blocs.length} />
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 border-t border-dashed border-line pt-4">
            {CATALOGUE.map(({ type, nom, Icone }) => (
              <button
                key={type}
                type="button"
                onClick={() => inserer((cle) => neuf(type, cle), blocs.length)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12.6px] font-semibold text-muted hover:border-accent hover:text-accent"
              >
                <Icone size={14} /> {nom}
              </button>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}

function Repere({ visible }: { visible: boolean }) {
  return (
    <div className="flex h-3.5 items-center" aria-hidden>
      <span
        className={`h-[3px] w-full rounded-full ${visible ? "bg-accent" : ""}`}
      />
    </div>
  );
}

function Commande({
  libelle,
  danger = false,
  children,
  ...attributs
}: { libelle: string; danger?: boolean } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      title={libelle}
      aria-label={libelle}
      {...attributs}
      className={`flex h-7 w-7 items-center justify-center rounded-full text-muted disabled:opacity-30 ${
        danger
          ? "hover:bg-accent-soft hover:text-accent"
          : "hover:bg-surface-3 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function ChampAuto({
  className = "",
  ...attributs
}: ComponentProps<"textarea">) {
  const champ = useRef<HTMLTextAreaElement>(null);
  const ajuster = () => {
    const el = champ.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  useLayoutEffect(ajuster);
  return (
    <textarea
      ref={champ}
      rows={1}
      {...attributs}
      onInput={(e) => {
        ajuster();
        attributs.onInput?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.preventDefault();
      }}
      className={`champ-fondu block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-ink placeholder:text-faint ${className}`}
    />
  );
}

function BlocTitre({
  bloc,
  actif,
  onChange,
}: {
  bloc: EditeTitre;
  actif: boolean;
  onChange: (partiel: Partial<EditeTitre>) => void;
}) {
  const choix = (enfonce: boolean) =>
    `h-7 rounded-full px-2.5 text-[12px] font-semibold ${
      enfonce ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"
    }`;
  return (
    <>
      {actif ? (
        <div className="mb-2 rounded-[var(--radius-m)] border border-line bg-surface shadow-[0_8px_20px_-14px_rgb(15_29_44/0.45)]">
          <div className="flex flex-wrap items-center gap-1 px-1.5 py-1.5">
            <button
              type="button"
              aria-pressed={bloc.niveau === 2}
              onClick={() => onChange({ niveau: 2 })}
              className={choix(bloc.niveau === 2)}
            >
              Grand titre
            </button>
            <button
              type="button"
              aria-pressed={bloc.niveau === 3}
              onClick={() => onChange({ niveau: 3 })}
              className={choix(bloc.niveau === 3)}
            >
              Sous-titre
            </button>
            <span className="mx-1 h-5 w-px bg-line" aria-hidden />
            {ALIGNEMENTS.map(({ valeur, nom, Icone }) => (
              <button
                key={nom}
                type="button"
                title={nom}
                aria-label={nom}
                aria-pressed={bloc.alignement === valeur}
                onClick={() => onChange({ alignement: valeur })}
                className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  bloc.alignement === valeur
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:text-ink"
                }`}
              >
                <Icone size={15} />
              </button>
            ))}
          </div>
          <ChoixCouleur
            libelle="Couleur du titre"
            actuelle={bloc.couleur ?? null}
            onChoisir={(couleur) => onChange({ couleur: couleur ?? undefined })}
            className="border-t border-line px-2.5 py-2"
          />
        </div>
      ) : null}
      <ChampAuto
        value={bloc.texte}
        maxLength={200}
        placeholder={bloc.niveau === 2 ? "Titre" : "Sous-titre"}
        aria-label={bloc.niveau === 2 ? "Titre" : "Sous-titre"}
        onChange={(e) => onChange({ texte: e.target.value })}
        style={bloc.couleur ? { color: bloc.couleur } : undefined}
        className={`titre ${
          bloc.niveau === 2
            ? "text-[26px] leading-tight"
            : "text-[20px] leading-snug"
        } ${bloc.alignement ? CLASSE_ALIGNEMENT[bloc.alignement] : ""}`}
      />
    </>
  );
}

function ZoneDepot({
  accept,
  icone,
  invite,
  aide,
  onFichier,
}: {
  accept: string;
  icone: ReactNode;
  invite: string;
  aide: string;
  onFichier: (f: File) => void;
}) {
  const [survol, setSurvol] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        e.stopPropagation();
        setSurvol(true);
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        e.stopPropagation();
        setSurvol(false);
        const f = e.dataTransfer.files[0];
        if (f) onFichier(f);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-m)] border-2 border-dashed px-4 py-9 text-center ${
        survol
          ? "border-accent bg-accent-soft"
          : "border-line bg-surface-2 hover:border-faint"
      }`}
    >
      <span className="text-muted">{icone}</span>
      <span className="text-[13.4px] font-semibold text-ink">{invite}</span>
      <span className="text-[11.8px] text-faint">{aide}</span>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFichier(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function SuiviEnvoi({
  envoi,
  onReessayer,
}: {
  envoi: Envoi | null;
  onReessayer: () => void;
}) {
  if (!envoi || (envoi.termine && !envoi.erreur)) return null;
  const pct = pourcentage(envoi);
  return (
    <div role="status" aria-live="polite" className="mt-2">
      {envoi.erreur ? (
        <div className="flex flex-wrap items-center gap-2 text-[12.6px] font-semibold text-accent">
          <TriangleAlert size={15} /> L’envoi s’est interrompu.
          <button
            type="button"
            onClick={onReessayer}
            className="inline-flex items-center gap-1 rounded-full border border-accent/40 px-2.5 py-1 hover:bg-accent-soft"
          >
            <RotateCw size={13} /> Réessayer
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-[12px] font-semibold text-muted">
            <span>Envoi…</span>
            <span className="tabular-nums text-ink">{pct} %</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

const renvoyer = (f: File) => new File([f], f.name, { type: f.type });

const BOUTON_MEDIA =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.4px] font-semibold text-ink hover:border-accent hover:text-accent";

function BlocPhoto({
  bloc,
  resourceId,
  envoi,
  onChange,
  onRefus,
}: {
  bloc: EditePhoto;
  resourceId?: string;
  envoi: Envoi | null;
  onChange: (partiel: Partial<EditePhoto>) => void;
  onRefus: (message: string) => void;
}) {
  const vue =
    bloc.apercu ??
    (bloc.fichier && resourceId
      ? `/api/ressources/${resourceId}/blocs/${bloc.fichier}`
      : null);
  const choisir = (f: File) => {
    if (!f.type.startsWith("image/")) {
      onRefus(`« ${f.name} » n’est pas une photo : JPEG, PNG ou WebP.`);
      return;
    }
    if (f.size > PLAFOND_FICHIER) {
      onRefus(`« ${f.name} » dépasse ${PLAFOND_FICHIER_MO} Mo.`);
      return;
    }
    onChange({ local: f, apercu: URL.createObjectURL(f) });
  };

  if (!vue) {
    return (
      <ZoneDepot
        accept="image/jpeg,image/png,image/webp"
        icone={<ImagePlus size={26} />}
        invite="Choisir une photo"
        aide="JPEG, PNG ou WebP — ou glissez-la ici. Elle est redimensionnée à l’envoi."
        onFichier={choisir}
      />
    );
  }
  return (
    <figure className="m-0">
      <div className="relative overflow-hidden rounded-[var(--radius-m)] bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={vue}
          alt=""
          draggable={false}
          className="block h-auto w-full"
        />
        <label className={`${BOUTON_MEDIA} absolute right-2.5 top-2.5`}>
          <Upload size={13} /> Remplacer
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) choisir(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <SuiviEnvoi
        envoi={envoi}
        onReessayer={() =>
          bloc.local && onChange({ local: renvoyer(bloc.local) })
        }
      />
      <input
        value={bloc.legende}
        maxLength={300}
        placeholder="Légende (facultative)"
        aria-label="Légende de la photo"
        onChange={(e) => onChange({ legende: e.target.value })}
        className="champ-fondu mt-2 w-full border-0 bg-transparent p-0 text-center text-[13px] text-muted placeholder:text-faint"
      />
    </figure>
  );
}

function BlocVideo({
  bloc,
  resourceId,
  envoi,
  onChange,
  onRefus,
}: {
  bloc: EditeVideo;
  resourceId?: string;
  envoi: Envoi | null;
  onChange: (partiel: Partial<EditeVideo>) => void;
  onRefus: (message: string) => void;
}) {
  const vue =
    bloc.apercu ??
    (bloc.fichier && resourceId
      ? `/api/ressources/${resourceId}/blocs/${bloc.fichier}`
      : null);
  const lien = bloc.url.trim();
  const video = lien ? lienVideo(lien) : null;
  const choisir = (f: File) => {
    if (!formatVideo(f.name)) {
      onRefus(`« ${f.name} » : envoyez une vidéo MP4, WebM ou MOV.`);
      return;
    }
    if (f.size > PLAFOND_FICHIER) {
      onRefus(`« ${f.name} » dépasse ${PLAFOND_FICHIER_MO} Mo.`);
      return;
    }
    onChange({ local: f, apercu: URL.createObjectURL(f) });
  };
  const onglet = (enfonce: boolean) =>
    `h-7 rounded-full px-3 text-[12.2px] font-semibold ${
      enfonce ? "bg-surface text-accent shadow-sm" : "text-muted hover:text-ink"
    }`;

  return (
    <>
      <div className="mb-2.5 inline-flex rounded-full border border-line bg-surface-2 p-0.5">
        <button
          type="button"
          aria-pressed={bloc.source === "fichier"}
          onClick={() => onChange({ source: "fichier" })}
          className={onglet(bloc.source === "fichier")}
        >
          Déposer un fichier
        </button>
        <button
          type="button"
          aria-pressed={bloc.source === "lien"}
          onClick={() => onChange({ source: "lien" })}
          className={onglet(bloc.source === "lien")}
        >
          Coller un lien
        </button>
      </div>

      {bloc.source === "lien" ? (
        <>
          <input
            type="url"
            inputMode="url"
            value={bloc.url}
            maxLength={500}
            placeholder="Lien YouTube, Vimeo ou Google Drive"
            aria-label="Lien de la vidéo"
            onChange={(e) => onChange({ url: e.target.value })}
            className={INPUT}
          />
          {!lien ? (
            <p className="m-0 mt-1.5 text-[12px] text-faint">
              YouTube, Vimeo ou Google Drive : la vidéo se lira dans la page,
              sans quitter la plateforme.
            </p>
          ) : video ? (
            <div className="mt-2.5">
              <VideoEnLien url={lien} titre="Aperçu de la vidéo" />
              {video.plateforme === "drive" ? (
                <p className="m-0 mt-2 flex items-start gap-1.5 text-[12.4px] text-muted">
                  <TriangleAlert
                    size={14}
                    className="mt-0.5 shrink-0 text-warn"
                  />
                  <span>
                    Dans Google Drive, partagez le fichier à «{"\u00a0"}Tous les
                    utilisateurs disposant du lien{"\u00a0"}». Sinon, les
                    membres verront une demande d’accès à la place de la vidéo.
                  </span>
                </p>
              ) : null}
            </div>
          ) : (
            <p className="m-0 mt-1.5 text-[12.4px] font-semibold text-accent">
              Lien non reconnu : collez l’adresse d’une vidéo YouTube, Vimeo ou
              Google Drive.
            </p>
          )}
        </>
      ) : vue ? (
        <>
          <div className="overflow-hidden rounded-[var(--radius-m)] bg-black">
            <video
              src={vue}
              controls
              playsInline
              preload="metadata"
              className="block h-auto max-h-[480px] w-full"
            />
          </div>
          <SuiviEnvoi
            envoi={envoi}
            onReessayer={() =>
              bloc.local && onChange({ local: renvoyer(bloc.local) })
            }
          />
          <label className={`${BOUTON_MEDIA} mt-2.5`}>
            <Upload size={13} /> Remplacer la vidéo
            <input
              type="file"
              accept={ACCEPT_VIDEO}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) choisir(f);
                e.target.value = "";
              }}
            />
          </label>
        </>
      ) : (
        <ZoneDepot
          accept={ACCEPT_VIDEO}
          icone={<Video size={26} />}
          invite="Choisir une vidéo"
          aide={`MP4, WebM ou MOV · ${PLAFOND_FICHIER_MO} Mo au plus — ou glissez-la ici.`}
          onFichier={choisir}
        />
      )}
    </>
  );
}

function ChampCouverture({ actuelle }: { actuelle: string | null }) {
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [choisie, setChoisie] = useState<string | null>(null);
  const [retiree, setRetiree] = useState(false);
  const { jetons } = useEnvois(fichiers);
  const vue = choisie ?? (retiree ? null : actuelle);
  return (
    <div>
      <span className="mb-1.5 block text-[12.3px] font-semibold text-muted">
        Couverture
      </span>
      <div className="flex aspect-[16/9] items-center justify-center overflow-hidden rounded-[var(--radius-m)] border border-line bg-surface-2">
        {vue ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={vue} alt="" className="h-full w-full object-cover" />
          </>
        ) : (
          <span className="flex flex-col items-center gap-1 text-[12px] text-faint">
            <ImagePlus size={20} /> Aucune couverture
          </span>
        )}
      </div>
      <label className={`${BOUTON_MEDIA} mt-2`}>
        <ImagePlus size={13} />
        {vue ? "Remplacer" : "Choisir une image"}
        <input
          type="file"
          name={jetons ? undefined : "couverture"}
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setChoisie(f ? URL.createObjectURL(f) : null);
            setFichiers(f ? [f] : []);
            if (f) setRetiree(false);
          }}
        />
      </label>
      <JetonsEnvoyes name="couverture" jetons={jetons} />
      {actuelle && !choisie ? (
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-[12.4px] text-muted">
          <input
            type="checkbox"
            name="retirerCouverture"
            value="1"
            checked={retiree}
            onChange={(e) => setRetiree(e.target.checked)}
          />
          Retirer la couverture actuelle
        </label>
      ) : null}
      <span className="mt-1.5 block text-[11.5px] text-faint">
        Sans couverture, la première photo de la page en tient lieu.
      </span>
    </div>
  );
}
