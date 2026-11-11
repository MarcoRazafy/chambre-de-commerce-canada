"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileUp,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import {
  JetonsEnvoyes,
  pourcentage,
  useEnvois,
  type Envoi,
} from "@/components/EnvoisSuivis";
import { PLAFOND_FICHIER, PLAFOND_FICHIER_MO } from "@/lib/plafonds";
import { INPUT } from "@/components/champ-style";
import { CancelButton, ChampPhoto, Field, ModalBody, ModalFooter, SubmitButton, VoileEnvoi } from "@/components/form-bits";
import { Card } from "@/components/ui";
import {
  deleteNews,
  deleteOffer,
  deleteResource,
  enregistrerActualite,
  enregistrerOffre,
  enregistrerRessource,
} from "@/lib/actions/content";
import { ChoixDiffusion } from "@/components/forms/ChoixDiffusion";
import { CouvertureRessource } from "@/components/forms/CouvertureRessource";
// EMPLACEMENTS_OFFRE et EmplacementOffre servent au choix « Où afficher l'offre » (en commentaire)
import { OFFRE_CANCHAM } from "@/lib/offres";
import type { NewsCategory, NewsItem, Offer } from "@/lib/types";

const CATEGORIES: NewsCategory[] = [
  "Vie de la chambre",
  "Programmation",
  "Événement passé",
  "Formation",
];

const BTN_ICONE =
  "w-9 h-9 rounded-[var(--radius-s)] border border-line bg-surface flex items-center justify-center cursor-pointer text-muted";

export function FormulaireActualite({ news }: { news?: NewsItem }) {
  return (
    <form
      action={enregistrerActualite}
      className="grid gap-4 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px] items-start"
    >
      {news ? <input type="hidden" name="newsId" value={news.id} /> : null}

      <Card className="p-6 flex flex-col gap-4 min-w-0">
        <ChampPhotosActualite actuelles={news?.images ?? []} />
        <Field label="Titre">
          <input
            name="titre"
            required
            defaultValue={news?.titre}
            placeholder="Ex. Retour sur la Caravane de régionalisation"
            className={INPUT}
          />
        </Field>
        <Field
          label="Résumé"
          hint="Deux ou trois lignes : c’est ce qu’affiche le fil d’actualité."
        >
          <textarea
            name="extrait"
            required={!news?.libre}
            rows={3}
            defaultValue={news?.extrait}
            className={INPUT}
          />
        </Field>
        <Field
          label="Texte de l’article"
          hint="Les liens collés dans le texte deviennent cliquables."
        >
          <textarea
            name="corps"
            required={!news?.libre}
            rows={14}
            defaultValue={news?.corps}
            className={INPUT}
          />
        </Field>
      </Card>

      <div className="flex flex-col gap-4 lg:sticky lg:top-[88px]">
        <Card className="p-6 flex flex-col gap-4">
          <Field label="Catégorie">
            <select
              name="cat"
              defaultValue={news?.cat ?? "Vie de la chambre"}
              className={INPUT}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Date de publication"
            hint="Classe l’actualité dans le fil."
          >
            <input
              type="date"
              name="date"
              defaultValue={news?.date ?? new Date().toISOString().slice(0, 10)}
              className={INPUT}
            />
          </Field>
        </Card>

        <Card className="p-6 flex flex-col gap-3">
          <h2 className="text-[15px] m-0">Diffusion</h2>
          <ChoixDiffusion publique={news?.public ?? false} />
        </Card>

        <SubmitButton pendingLabel="Publication…" className="w-full">
          <Check size={15} />{" "}
          {news ? "Enregistrer les modifications" : "Publier l’actualité"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function SupprimerActualiteButton({
  newsId,
  titre,
  commentaires,
}: {
  newsId: string;
  titre: string;
  commentaires: number;
}) {
  return (
    <Modal
      title="Supprimer l’actualité"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          aria-label={`Supprimer « ${titre} »`}
          title="Supprimer"
          className={`${BTN_ICONE} hover:text-accent hover:border-accent`}
        >
          <Trash2 size={15} />
        </button>
      )}
    >
      {(fermer) => (
        <form action={deleteNews}>
          <input type="hidden" name="newsId" value={newsId} />
          <ModalBody>
            <p className="m-0 text-[13.6px] text-muted">
              « <b className="text-ink">{titre}</b> » disparaîtra du fil des
              membres
              {commentaires
                ? `, avec ses ${commentaires} commentaire${commentaires > 1 ? "s" : ""}`
                : ""}
              . L’opération est consignée au journal.
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

export function OffreButton({
  offre,
  membres,
}: {
  offre?: Offer;
  membres: { id: string; nom: string }[];
}) {
  return (
    <Modal
      title={offre ? "Modifier l’offre" : "Nouvelle offre de membre"}
      trigger={(ouvrir) =>
        offre ? (
          <button
            type="button"
            onClick={ouvrir}
            aria-label={`Modifier « ${offre.titre} »`}
            title="Modifier"
            className={`${BTN_ICONE} hover:text-ink hover:border-faint`}
          >
            <Pencil size={15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={ouvrir}
            className="btn-action btn-action-sm"
          >
            <Plus size={15} /> Nouvelle offre
          </button>
        )
      }
    >
      {(fermer) => (
        <form action={enregistrerOffre}>
          {offre ? (
            <input type="hidden" name="offerId" value={offre.id} />
          ) : null}
          <ModalBody>
            <ChampPhoto
              name="image"
              retirer="retirerImage"
              apercu={offre?.image}
              aide="Sans photo, la carte reprend la couverture de l’entreprise."
            />
            <Field label="Qui propose l’offre">
              <select
                name="memberId"
                required
                defaultValue={offre ? (offre.membreId ?? OFFRE_CANCHAM) : ""}
                className={INPUT}
              >
                <option value="" disabled>
                  Choisir…
                </option>
                <option value={OFFRE_CANCHAM}>CanCham Madagascar</option>
                <optgroup label="Membres">
                  {membres.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nom}
                    </option>
                  ))}
                </optgroup>
              </select>
            </Field>
            <Field label="Titre">
              <input
                name="titre"
                required
                defaultValue={offre?.titre}
                placeholder="Ex. -15 % sur l’audit énergétique"
                className={INPUT}
              />
            </Field>
            <Field label="Prix">
              <input
                name="prix"
                maxLength={60}
                defaultValue={offre?.prix ?? ""}
                placeholder="Ex. 150 000 Ar, 75 $, Gratuit"
                className={INPUT}
              />
            </Field>
            <Field
              label="Description"
              hint="Conditions, durée, comment en profiter."
            >
              <textarea
                name="desc"
                required
                rows={4}
                defaultValue={offre?.desc}
                className={INPUT}
              />
            </Field>
            <Field
              label="Lien « En profiter »"
              hint="Page de commande, formulaire, offre détaillée. Sans lien, le membre écrit au contact de l’entreprise."
            >
              <input
                name="lien"
                type="text"
                inputMode="url"
                autoComplete="url"
                defaultValue={offre?.lien ?? ""}
                placeholder="exemple.mg/offre-cancham"
                className={INPUT}
              />
            </Field>
            {/* Actualités retirées pour l'instant : l'offre va partout (l'accueil des membres).
                Pour remettre le choix, décommenter le bloc ci-dessous et retirer ce champ caché.
            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className="mb-1.5 block p-0 text-[12.3px] font-semibold text-muted">
                Où afficher l’offre
              </legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(EMPLACEMENTS_OFFRE) as EmplacementOffre[]).map(
                  (e) => (
                    <label
                      key={e}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-s)] border border-line bg-surface px-3 py-2 text-[13.4px] font-semibold text-ink transition-colors hover:border-faint has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
                    >
                      <input
                        type="radio"
                        name="emplacement"
                        value={e}
                        required
                        defaultChecked={(offre?.emplacement ?? "partout") === e}
                        className="accent-[var(--accent)]"
                      />
                      {EMPLACEMENTS_OFFRE[e]}
                    </label>
                  ),
                )}
              </div>
              <span className="mt-1 block text-[11.5px] text-faint">
                Dans le rail des Actualités (quatre offres au plus, les plus
                récentes), sur le tableau de bord des membres (trois), ou aux
                deux endroits.
              </span>
            </fieldset>
            */}
            <input type="hidden" name="emplacement" value="partout" />
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Enregistrement…">
              <Check size={14} /> {offre ? "Enregistrer" : "Publier l’offre"}
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function SupprimerOffreButton({
  offerId,
  titre,
}: {
  offerId: string;
  titre: string;
}) {
  return (
    <Modal
      title="Retirer l’offre"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          aria-label={`Retirer « ${titre} »`}
          title="Retirer"
          className={`${BTN_ICONE} hover:text-accent hover:border-accent`}
        >
          <Trash2 size={15} />
        </button>
      )}
    >
      {(fermer) => (
        <form action={deleteOffer}>
          <input type="hidden" name="offerId" value={offerId} />
          <ModalBody>
            <p className="m-0 text-[13.6px] text-muted">
              « <b className="text-ink">{titre}</b> » ne sera plus proposée aux
              membres.
            </p>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton variant="danger" pendingLabel="Retrait…">
              <Trash2 size={14} /> Retirer
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

const PLAFOND_MO = PLAFOND_FICHIER_MO;

export interface RessourceEditee {
  id: string;
  titre: string;
  description: string | null;
  cat: string;
  type: "gratuit" | "payant";
  prix: number;
  fmt: "pdf" | "docx" | "video" | "image" | "page";
  taille: string;
  pret: boolean;
  pages: number | null;
  cover: string | null;
  dossierId: string | null;
}

export function FormulaireRessource({
  ressource,
  dossiers,
  dossierParDefaut,
}: {
  ressource?: RessourceEditee;
  dossiers: {
    id: string;
    nom: string;
    profondeur: number;
    restreint?: boolean;
  }[];
  dossierParDefaut?: string;
}) {
  const [payant, setPayant] = useState(ressource?.type === "payant");
  const [fichier, setFichier] = useState<File | null>(null);
  const trop = fichier ? fichier.size > PLAFOND_MO * 1024 * 1024 : false;
  const aEnvoyer = useMemo(
    () => (fichier && !trop ? [fichier] : []),
    [fichier, trop],
  );
  const { etats, jetons } = useEnvois(aEnvoyer);
  const envoi = etats[0];

  return (
    <form
      action={enregistrerRessource}
      className="grid gap-4 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px] items-start"
    >
      {ressource ? (
        <input type="hidden" name="resourceId" value={ressource.id} />
      ) : null}

      <Card className="p-6 flex flex-col gap-4 min-w-0">
        <Field label="Titre">
          <input
            name="titre"
            required
            defaultValue={ressource?.titre}
            placeholder="Ex. Guide pratique — Exporter vers le Québec"
            className={INPUT}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
        <Field
          label="Description"
          hint="Facultatif. Ce qu’elle contient et à qui elle sert : la carte en montre les premières lignes."
        >
          <textarea
            name="description"
            rows={3}
            maxLength={600}
            defaultValue={ressource?.description ?? ""}
            placeholder="Ex. Les étapes pour exporter vers le Québec : normes, documents, interlocuteurs."
            className={INPUT}
          />
        </Field>
        <Field
          label="Dossier"
          hint="Où la ranger dans la bibliothèque. Vide, elle reste à la racine. Dans un dossier réservé, seules ses entreprises la voient."
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
        {payant ? (
          <Field
            label="Prix ($ CAD)"
            hint="Le paiement en ligne n’est pas branché : les membres envoient une demande d’achat, visible au tableau de bord."
          >
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
      </Card>

      <div className="flex flex-col gap-4 lg:sticky lg:top-[88px]">
        <Card className="p-6 flex flex-col gap-3">
          <span className="text-[12.3px] font-semibold text-muted">
            Fichier
          </span>
          {ressource ? (
            <p
              className={`m-0 text-[13px] ${ressource.pret ? "text-success-strong" : "text-accent font-semibold"}`}
            >
              {ressource.pret
                ? `Fichier actuel : ${ressource.fmt === "video" ? "vidéo" : ressource.fmt === "image" ? "photo" : `${ressource.fmt.toUpperCase()}, ${ressource.pages} page${(ressource.pages ?? 0) > 1 ? "s" : ""}`} · ${ressource.taille}`
                : "Aucun fichier lisible : les membres ne peuvent pas l’ouvrir."}
            </p>
          ) : null}
          <label
            className={`flex flex-col items-center justify-center gap-2 text-center rounded-[var(--radius-m)] border-2 border-dashed px-4 py-7 cursor-pointer ${
              trop
                ? "border-accent bg-accent-soft"
                : "border-line bg-surface-2 hover:border-faint"
            }`}
          >
            <FileUp size={24} className="text-muted" />
            <span className="text-[13px] font-semibold text-ink">
              {fichier
                ? fichier.name
                : ressource
                  ? "Remplacer le fichier"
                  : "Choisir le fichier"}
            </span>
            <span
              className={`text-[11.8px] ${trop ? "text-accent font-semibold" : "text-faint"}`}
            >
              {trop
                ? `Trop lourd : ${PLAFOND_MO} Mo au plus.`
                : `PDF, DOCX, vidéo MP4 ou photo · ${PLAFOND_MO} Mo au plus`}
            </span>
            <input
              type="file"
              name={jetons ? undefined : "fichier"}
              accept="application/pdf,.docx,video/mp4,image/jpeg,image/png,image/webp"
              required={!ressource}
              className="sr-only"
              onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
            />
            {envoi ? <BarreEnvoi envoi={envoi} /> : null}
          </label>
          <JetonsEnvoyes name="fichier" jetons={jetons} />
          <p className="m-0 text-[11.8px] text-faint">
            Les documents sont convertis en pages images pour la lecture
            protégée : comptez quelques secondes, un peu plus pour un DOCX.
          </p>
          <CouvertureRessource fichier={fichier} actuelle={ressource?.cover} />
        </Card>

        <SubmitButton
          pendingLabel="Préparation du fichier…"
          className="w-full"
          disabled={trop}
        >
          <Check size={15} />{" "}
          {ressource ? "Enregistrer les modifications" : "Ajouter la ressource"}
        </SubmitButton>
      </div>
    </form>
  );
}

function BarreEnvoi({ envoi }: { envoi: Envoi }) {
  const pct = pourcentage(envoi);
  return (
    <span
      role="status"
      aria-live="polite"
      className="mt-1 block w-full max-w-[260px]"
    >
      <span className="flex items-center justify-between text-[12px] font-semibold">
        <span
          className={
            envoi.erreur
              ? "text-accent"
              : envoi.termine
                ? "text-success-strong"
                : "text-muted"
          }
        >
          {envoi.erreur
            ? "Envoi interrompu — il repartira à l’enregistrement"
            : envoi.termine
              ? "Fichier prêt"
              : "Envoi…"}
        </span>
        {envoi.erreur ? null : (
          <span className="tabular-nums text-ink">{pct} %</span>
        )}
      </span>
      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-line">
        <span
          className={`block h-full rounded-full transition-[width] duration-200 ${envoi.termine ? "bg-success" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  );
}

export function SupprimerRessourceButton({
  resourceId,
  titre,
}: {
  resourceId: string;
  titre: string;
}) {
  const [enCours, demarrer] = useTransition();
  return (
    <Modal
      title="Retirer la ressource"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          aria-label={`Retirer « ${titre} »`}
          title="Retirer"
          className={`${BTN_ICONE} hover:text-accent hover:border-accent`}
        >
          <Trash2 size={15} />
        </button>
      )}
    >
      {(fermer) => (
        <>
          <ModalBody>
            <p className="m-0 text-[13.6px] text-muted">
              « <b className="text-ink">{titre}</b> » sera retirée de la
              bibliothèque, fichier et commentaires compris.
            </p>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <button
              type="button"
              disabled={enCours}
              onClick={() =>
                demarrer(async () => {
                  const donnees = new FormData();
                  donnees.set("resourceId", resourceId);
                  await deleteResource(donnees);
                })
              }
              className="inline-flex cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-[var(--radius-s)] border border-transparent bg-bad px-[15px] py-[9px] text-[13.4px] font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              {enCours ? (
                <>
                  <LoaderCircle
                    size={14}
                    className="animate-spin"
                    aria-hidden
                  />{" "}
                  Retrait…
                </>
              ) : (
                <>
                  <Trash2 size={14} /> Retirer
                </>
              )}
            </button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

const MAX_PHOTOS = 10;
const POIDS_MAX_ENVOI = PLAFOND_FICHIER;

type PhotoEditee =
  | { cle: string; type: "existante"; url: string }
  | { cle: string; type: "nouvelle"; fichier: File; apercu: string };

function ChampPhotosActualite({ actuelles }: { actuelles: string[] }) {
  const [photos, setPhotos] = useState<PhotoEditee[]>(() =>
    actuelles.map((url) => ({ cle: `e:${url}`, type: "existante", url })),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const champ = useRef<HTMLInputElement>(null);

  const nouvelles = useMemo(
    () =>
      photos.filter(
        (p): p is Extract<PhotoEditee, { type: "nouvelle" }> =>
          p.type === "nouvelle",
      ),
    [photos],
  );
  const poids = nouvelles.reduce((n, p) => n + p.fichier.size, 0);
  const fichiersNouveaux = useMemo(
    () => nouvelles.map((p) => p.fichier),
    [nouvelles],
  );
  const { etats, jetons } = useEnvois(fichiersNouveaux);

  useEffect(() => {
    if (!champ.current) return;
    const dt = new DataTransfer();
    nouvelles.forEach((p) => dt.items.add(p.fichier));
    champ.current.files = dt.files;
  }, [nouvelles]);

  const ordre = photos.map((p) =>
    p.type === "existante" ? `e:${p.url}` : `n:${nouvelles.indexOf(p)}`,
  );

  const ajouter = (liste: FileList | null) => {
    if (!liste) return;
    setErreur(null);
    const images = Array.from(liste).filter((f) => f.type.startsWith("image/"));
    if (images.length < liste.length)
      setErreur("Seules les images sont acceptées.");
    setPhotos((avant) => {
      const place = MAX_PHOTOS - avant.length;
      if (images.length > place)
        setErreur(`${MAX_PHOTOS} photos au plus par publication.`);
      return [
        ...avant,
        ...images.slice(0, Math.max(0, place)).map((fichier, i) => ({
          cle: `n:${Date.now()}-${i}-${fichier.name}`,
          type: "nouvelle" as const,
          fichier,
          apercu: URL.createObjectURL(fichier),
        })),
      ];
    });
  };

  const deplacer = (i: number, vers: number) =>
    setPhotos((l) => {
      if (vers < 0 || vers >= l.length) return l;
      const copie = [...l];
      const [p] = copie.splice(i, 1);
      copie.splice(vers, 0, p);
      return copie;
    });

  return (
    <div>
      <input type="hidden" name="ordre" value={JSON.stringify(ordre)} />
      <input
        ref={champ}
        type="file"
        name={jetons ? undefined : "images"}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <JetonsEnvoyes name="images" jetons={jetons} />

      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="text-[12.3px] font-semibold text-muted">Photos</span>
        <span className="text-[11.8px] text-faint tabular-nums">
          {photos.length} / {MAX_PHOTOS}
        </span>
      </div>

      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((p, i) => (
          <div
            key={p.cle}
            className="relative aspect-[4/3] rounded-[var(--radius-s)] overflow-hidden border border-line bg-surface-2 group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.type === "existante" ? p.url : p.apercu}
              alt=""
              className="w-full h-full object-cover"
            />
            {p.type === "nouvelle" &&
            etats[nouvelles.indexOf(p)] &&
            !etats[nouvelles.indexOf(p)]!.masque ? (
              <VoileEnvoi envoi={etats[nouvelles.indexOf(p)]!} />
            ) : null}
            {i === 0 ? (
              <span className="absolute top-1.5 left-1.5 rounded-full bg-accent text-white text-[10.5px] font-bold px-2 py-0.5">
                Couverture
              </span>
            ) : null}
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 p-1.5 bg-gradient-to-t from-[#0f1d2c]/80 to-transparent">
              <span className="flex gap-1">
                <BoutonPhoto
                  libelle="Vers la gauche"
                  onClick={() => deplacer(i, i - 1)}
                  desactive={i === 0}
                >
                  <ChevronLeft size={14} />
                </BoutonPhoto>
                <BoutonPhoto
                  libelle="Vers la droite"
                  onClick={() => deplacer(i, i + 1)}
                  desactive={i === photos.length - 1}
                >
                  <ChevronRight size={14} />
                </BoutonPhoto>
              </span>
              <span className="flex gap-1">
                {i > 0 ? (
                  <BoutonPhoto
                    libelle="Mettre en couverture"
                    onClick={() => deplacer(i, 0)}
                  >
                    <Star size={13} />
                  </BoutonPhoto>
                ) : null}
                <BoutonPhoto
                  libelle="Retirer la photo"
                  onClick={() =>
                    setPhotos((l) => l.filter((x) => x.cle !== p.cle))
                  }
                >
                  <X size={14} />
                </BoutonPhoto>
              </span>
            </span>
          </div>
        ))}

        {photos.length < MAX_PHOTOS ? (
          <label className="aspect-[4/3] rounded-[var(--radius-s)] border-2 border-dashed border-line bg-surface-2 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer text-muted hover:border-faint hover:text-ink">
            <ImagePlus size={22} />
            <span className="text-[12.5px] font-semibold">
              {photos.length
                ? "Ajouter des photos"
                : "Ajouter une ou plusieurs photos"}
            </span>
            <input
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
        ) : null}
      </div>

      <p
        className={`m-0 mt-1.5 text-[11.8px] ${erreur || poids > POIDS_MAX_ENVOI ? "text-accent font-semibold" : "text-faint"}`}
      >
        {poids > POIDS_MAX_ENVOI
          ? `Les nouvelles photos dépassent ${PLAFOND_FICHIER_MO} Mo à elles toutes : envoyez-en moins à la fois.`
          : (erreur ??
            "La première photo sert de couverture dans le fil. Sans photo, un bandeau aux couleurs de la chambre la remplace.")}
      </p>
    </div>
  );
}

function BoutonPhoto({
  libelle,
  onClick,
  desactive = false,
  children,
}: {
  libelle: string;
  onClick: () => void;
  desactive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desactive}
      aria-label={libelle}
      title={libelle}
      className="w-7 h-7 rounded-full bg-white/90 text-[#0f1d2c] flex items-center justify-center cursor-pointer border-0 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
