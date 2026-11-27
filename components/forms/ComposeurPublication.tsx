"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { unstable_rethrow } from "next/navigation";
import { Images, LoaderCircle, Pencil, Trash2, Users, X } from "lucide-react";
import { Modal } from "@/components/Modal";
import { JetonsEnvoyes, useEnvois } from "@/components/EnvoisSuivis";
import {
  CancelButton,
  ModalBody,
  ModalFooter,
  SubmitButton,
  VoileEnvoi,
} from "@/components/form-bits";
import {
  modifierPublication,
  publierPublication,
  supprimerMaPublication,
} from "@/lib/actions/content";
import { PLAFOND_FICHIER, PLAFOND_FICHIER_MO } from "@/lib/plafonds";
import {
  LONGUEUR_PUBLICATION,
  PHOTOS_PAR_PUBLICATION,
  PUBLICATION_VIERGE,
  type EtatPublication,
} from "@/lib/publications";

type Photo =
  | { cle: string; type: "existante"; url: string }
  | { cle: string; type: "nouvelle"; fichier: File; apercu: string };
type PhotoNouvelle = Extract<Photo, { type: "nouvelle" }>;

const INVITE =
  "Partagez vos besoins ou ce que vous souhaitez partager à la communauté";

const RESTE_ANNONCE = 500;

const BTN_ICONE =
  "w-9 h-9 rounded-[var(--radius-s)] border border-line bg-surface flex items-center justify-center cursor-pointer text-muted";

export interface PublicationAModifier {
  id: string;
  texte: string;
  images: string[];
}

export function ComposeurPublication({
  avatar,
  entreprise,
  publication,
}: {
  avatar: ReactNode;
  entreprise: string;
  publication?: PublicationAModifier;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState(publication?.texte ?? "");
  const [photos, setPhotos] = useState<Photo[]>(() =>
    (publication?.images ?? []).map((url) => ({
      cle: `e:${url}`,
      type: "existante",
      url,
    })),
  );
  const [avis, setAvis] = useState<string | null>(null);
  const zone = useRef<HTMLTextAreaElement>(null);
  const choix = useRef<HTMLInputElement>(null);
  const versPhotos = useRef(false);
  const rang = useRef(0);
  const [caduque, setCaduque] = useState<EtatPublication | null>(null);

  const nouvelles = useMemo(
    () => photos.filter((p): p is PhotoNouvelle => p.type === "nouvelle"),
    [photos],
  );
  const fichiers = useMemo(() => nouvelles.map((p) => p.fichier), [nouvelles]);
  const { etats, jetons } = useEnvois(fichiers);
  const poids = fichiers.reduce((n, f) => n + f.size, 0);
  const ordre = photos.map((p) =>
    p.type === "existante" ? `e:${p.url}` : `n:${nouvelles.indexOf(p)}`,
  );

  const viderNouvelles = () => {
    nouvelles.forEach((p) => URL.revokeObjectURL(p.apercu));
    setPhotos((l) => l.filter((p) => p.type === "existante"));
  };

  const [etat, publier, envoi] = useActionState(
    async (
      avant: EtatPublication,
      formData: FormData,
    ): Promise<EtatPublication> => {
      setAvis(null);
      if (!jetons) {
        formData.delete("images");
        fichiers.forEach((f) => formData.append("images", f));
      }
      let r: EtatPublication;
      try {
        r = await (publication ? modifierPublication : publierPublication)(
          avant,
          formData,
        );
      } catch (e) {
        unstable_rethrow(e);
        return {
          etape: "erreur",
          erreur:
            "La publication n’est pas partie. Vérifiez votre connexion, puis réessayez.",
          photosPerdues: false,
        };
      }
      if (r.etape === "publiee") {
        setAvis(null);
        setOuvert(false);
        if (publication) {
          annoncer("Publication modifiée");
        } else {
          setTexte("");
          viderNouvelles();
          annoncer("Publication partagée dans le fil");
        }
      } else if (r.etape === "erreur" && r.photosPerdues) {
        viderNouvelles();
      }
      return r;
    },
    PUBLICATION_VIERGE,
  );

  useEffect(() => {
    if (!ouvert) return;
    ajuster(zone.current);
    if (versPhotos.current) {
      versPhotos.current = false;
      choix.current?.click();
    } else {
      zone.current?.focus();
    }
  }, [ouvert]);

  const ajouter = (liste: FileList | null) => {
    if (!liste?.length) return;
    const images = Array.from(liste).filter((f) => f.type.startsWith("image/"));
    const place = PHOTOS_PAR_PUBLICATION - photos.length;
    setAvis(
      images.length > place
        ? `${PHOTOS_PAR_PUBLICATION} photos au plus par publication.`
        : images.length < liste.length
          ? "Seules les images sont acceptées."
          : null,
    );
    const ajoutees = images
      .slice(0, Math.max(0, place))
      .map((fichier): Photo => ({
        cle: `photo-${rang.current++}`,
        type: "nouvelle",
        fichier,
        apercu: URL.createObjectURL(fichier),
      }));
    if (ajoutees.length) setPhotos((l) => [...l, ...ajoutees]);
    setCaduque(etat);
  };

  const retirer = (photo: Photo) => {
    setAvis(null);
    if (photo.type === "nouvelle") URL.revokeObjectURL(photo.apercu);
    setPhotos((l) => l.filter((x) => x.cle !== photo.cle));
  };

  const tropLourd = poids > PLAFOND_FICHIER;
  const vide = !texte.trim() && !photos.length;
  const bloque = vide || tropLourd || envoi;
  const erreur =
    etat.etape === "erreur" && etat !== caduque
      ? etat.photosPerdues
        ? `${etat.erreur} Ajoutez vos photos à nouveau.`
        : etat.erreur
      : null;
  const message = tropLourd
    ? `Les photos dépassent ${PLAFOND_FICHIER_MO} Mo à elles toutes : envoyez-en moins à la fois.`
    : (erreur ?? avis);
  const longueurMax = Math.max(
    LONGUEUR_PUBLICATION,
    publication?.texte.length ?? 0,
  );
  const reste = longueurMax - texte.length;

  return (
    <>
      {publication ? (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setOuvert(true)}
          aria-label="Modifier ma publication"
          title="Modifier"
          className={`${BTN_ICONE} hover:border-faint hover:text-ink`}
        >
          <Pencil size={15} />
        </button>
      ) : (
        <div className="mb-3 flex items-center gap-2.5 rounded-[var(--radius-m)] border border-line bg-surface p-3">
          {avatar}
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setOuvert(true)}
            className={`min-h-11 min-w-0 flex-1 cursor-pointer rounded-[22px] border-0 bg-surface-2 px-4 py-2 text-left text-[14px] leading-snug transition-colors hover:bg-surface-3 ${
              texte.trim() ? "text-ink" : "text-muted"
            }`}
          >
            <span className="line-clamp-2">{texte.trim() || INVITE}</span>
          </button>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label="Publier des photos"
            title="Publier des photos"
            onClick={() => {
              versPhotos.current = true;
              setOuvert(true);
            }}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-transparent px-3 text-[13px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Images size={19} className="text-success-strong" aria-hidden />
            <span className="hidden sm:inline">Photo</span>
          </button>
        </div>
      )}

      <Modal
        title={
          publication ? "Modifier la publication" : "Créer une publication"
        }
        ouvert={ouvert}
        onFermer={() => setOuvert(false)}
      >
        {() => (
          <form
            action={publier}
            className="flex flex-col gap-3.5 px-5 pb-5 pt-4"
          >
            {publication ? (
              <input type="hidden" name="newsId" value={publication.id} />
            ) : null}

            <div className="flex items-center gap-2.5">
              {avatar}
              <div className="min-w-0">
                <div className="truncate text-[14.2px] font-semibold">
                  {entreprise}
                </div>
                <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-semibold text-muted">
                  <Users size={11} aria-hidden /> Visible par les membres
                </span>
              </div>
            </div>

            <textarea
              ref={zone}
              name="texte"
              value={texte}
              onChange={(e) => {
                setTexte(e.target.value);
                setCaduque(etat);
                ajuster(e.target);
              }}
              maxLength={longueurMax}
              rows={3}
              placeholder={INVITE}
              aria-label="Votre publication"
              className={`block min-h-[96px] w-full resize-none border-0 bg-transparent p-0 leading-snug text-ink outline-none placeholder:text-faint ${
                texte.length > 110 || photos.length
                  ? "text-[15px]"
                  : "text-[19px]"
              }`}
            />
            {reste <= RESTE_ANNONCE ? (
              <span className="-mt-2 self-end text-[11.5px] tabular-nums text-faint">
                {reste} caractère{reste > 1 ? "s" : ""} restant
                {reste > 1 ? "s" : ""}
              </span>
            ) : null}

            {photos.length ? (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p, i) => {
                  const envoiPhoto =
                    p.type === "nouvelle" ? etats[nouvelles.indexOf(p)] : null;
                  return (
                    <div
                      key={p.cle}
                      className="relative aspect-square overflow-hidden rounded-[var(--radius-s)] border border-line bg-surface-2"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.type === "existante" ? p.url : p.apercu}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      {envoiPhoto && !envoiPhoto.masque ? (
                        <VoileEnvoi envoi={envoiPhoto} />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => retirer(p)}
                        aria-label={`Retirer la photo ${i + 1}`}
                        title="Retirer la photo"
                        className="absolute right-1.5 top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-0 bg-[#0f1d2c]/75 text-white hover:bg-[#0f1d2c]"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <ChampsPhotos ordre={ordre} fichiers={fichiers} jetons={jetons} />

            <div className="flex items-center justify-between gap-3 rounded-[var(--radius-m)] border border-line px-3.5 py-1.5">
              <span className="text-[13.2px] font-semibold">
                Ajouter à votre publication
              </span>
              {photos.length < PHOTOS_PAR_PUBLICATION ? (
                <label
                  title="Ajouter des photos"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-success-strong transition-colors hover:bg-surface-2 focus-within:ring-2 focus-within:ring-accent"
                >
                  <Images size={21} aria-hidden />
                  <span className="sr-only">Ajouter des photos</span>
                  <input
                    ref={choix}
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      ajouter(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              ) : (
                <span className="text-[12px] tabular-nums text-faint">
                  {photos.length} / {PHOTOS_PAR_PUBLICATION} photos
                </span>
              )}
            </div>

            {message ? (
              <p
                role="alert"
                className="m-0 text-[12.8px] font-semibold text-bad"
              >
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={bloque}
              style={bloque && !envoi ? { cursor: "not-allowed" } : undefined}
              className="btn-action w-full"
            >
              {envoi ? (
                <>
                  <LoaderCircle size={15} className="animate-spin" />{" "}
                  {publication ? "Enregistrement…" : "Publication…"}
                </>
              ) : publication ? (
                "Enregistrer"
              ) : (
                "Publier"
              )}
            </button>
            <p className="m-0 text-center text-[11.8px] text-faint">
              Publiée au nom de votre entreprise. L’équipe de la Chambre peut la
              modifier ou la retirer.
            </p>
          </form>
        )}
      </Modal>
    </>
  );
}

function ChampsPhotos({
  ordre,
  fichiers,
  jetons,
}: {
  ordre: string[];
  fichiers: File[];
  jetons: string[] | null;
}) {
  const champ = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!champ.current) return;
    const dt = new DataTransfer();
    fichiers.forEach((f) => dt.items.add(f));
    champ.current.files = dt.files;
  }, [fichiers]);

  return (
    <>
      <input type="hidden" name="ordre" value={JSON.stringify(ordre)} />
      <input
        ref={champ}
        type="file"
        name={jetons ? undefined : "images"}
        multiple
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />
      <JetonsEnvoyes name="images" jetons={jetons} />
    </>
  );
}

export function SupprimerMaPublication({
  newsId,
  commentaires,
}: {
  newsId: string;
  commentaires: number;
}) {
  return (
    <Modal
      title="Supprimer ma publication"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          aria-label="Supprimer ma publication"
          title="Supprimer"
          className={`${BTN_ICONE} hover:border-accent hover:text-accent`}
        >
          <Trash2 size={15} />
        </button>
      )}
    >
      {(fermer) => (
        <form action={supprimerMaPublication}>
          <input type="hidden" name="newsId" value={newsId} />
          <ModalBody>
            <p className="m-0 text-[13.6px] text-muted">
              Votre publication disparaîtra du fil
              {commentaires === 1
                ? ", avec son commentaire"
                : commentaires
                  ? `, avec ses ${commentaires} commentaires`
                  : ""}
              . Cette suppression est définitive.
            </p>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton variant="danger" pendingLabel="Suppression…">
              <Trash2 size={14} /> Supprimer
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

function ajuster(el: HTMLTextAreaElement | null) {
  if (!el) return;
  const defilements: [HTMLElement, number][] = [];
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (p.scrollTop) defilements.push([p, p.scrollTop]);
  }
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
  for (const [p, haut] of defilements) p.scrollTop = haut;
}

function annoncer(message: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("msg", message);
  url.searchParams.delete("ton");
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}
