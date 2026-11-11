"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  Check,
  ChevronRight,
  Folder,
  FolderLock,
  FolderPlus,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { INPUT } from "@/components/champ-style";
import { CancelButton, ChampPhoto, Field, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import { Card } from "@/components/ui";
import type { MembreChoisissable } from "@/components/forms/BibliothequeOutils";
import { ChoixEntreprises } from "@/components/forms/ChoixEntreprises";
import {
  creerDossier,
  deplacerDossier,
  reglerAccesDossier,
  modifierDossier,
  supprimerDossier,
} from "@/lib/actions/content";
import type { DossierRessource, Space } from "@/lib/types";

export type Arborescence = { id: string; nom: string; profondeur: number }[];

const decalage = (n: number) => `${"  ".repeat(n)}${n ? "└ " : ""}`;

function ChampAccesDossier({
  membres,
  restreint = false,
  acces = [],
}: {
  membres: MembreChoisissable[];
  restreint?: boolean;
  acces?: string[];
}) {
  const [personnalise, setPersonnalise] = useState(restreint);
  return (
    <>
      <Field
        label="Accès"
        hint={
          personnalise
            ? undefined
            : "Tous les membres à jour voient ce dossier."
        }
      >
        <select
          name="acces"
          value={personnalise ? "personnalise" : "tous"}
          onChange={(e) => setPersonnalise(e.target.value === "personnalise")}
          className={INPUT}
        >
          <option value="tous">Tous les membres</option>
          <option value="personnalise">
            Personnalisé — entreprises choisies
          </option>
        </select>
      </Field>
      {personnalise ? (
        <ChoixEntreprises membres={membres} initiales={acces} />
      ) : null}
    </>
  );
}

function ChampsPresentation({ dossier: d }: { dossier?: DossierRessource }) {
  return (
    <>
      <ChampPhoto
        name="cover"
        retirer="retirerCover"
        apercu={d?.cover}
        libelle="Couverture"
        aide="Facultatif. L’image du dossier, en tête de sa page. Paysage de préférence."
      />
      <fieldset className="m-0 flex flex-col gap-3.5 rounded-[var(--radius-m)] border border-line p-4">
        <legend className="px-1.5 text-[12.3px] font-semibold text-muted">
          Auteur
        </legend>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Nom" hint="Vide : le dossier n’affiche pas d’auteur.">
            <input
              name="auteurNom"
              maxLength={120}
              defaultValue={d?.auteur?.nom ?? ""}
              placeholder="Ex. Alice Ratisbonne"
              className={INPUT}
            />
          </Field>
          <Field label="Fonction">
            <input
              name="auteurRole"
              maxLength={160}
              defaultValue={d?.auteur?.role ?? ""}
              placeholder="Ex. Directrice exécutive, CanCham"
              className={INPUT}
            />
          </Field>
        </div>
        <Field label="Présentation">
          <textarea
            name="auteurBio"
            rows={3}
            maxLength={800}
            defaultValue={d?.auteur?.bio ?? ""}
            placeholder="Quelques lignes sur son parcours, et ce qu’elle ou il apporte à ce dossier."
            className={INPUT}
          />
        </Field>
        <ChampPhoto
          name="auteurPhoto"
          retirer="retirerAuteurPhoto"
          apercu={d?.auteur?.photo}
          libelle="Portrait"
          aide="Facultatif. Un portrait cadré sur le visage."
          rond
        />
      </fieldset>
    </>
  );
}

export function BoutonNouveauDossier({
  parentId,
  membres,
}: {
  parentId: string | null;
  membres: MembreChoisissable[];
}) {
  return (
    <Modal
      wide
      title="Nouveau dossier"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          className="btn-contour btn-contour-sm"
        >
          <FolderPlus size={15} /> Nouveau dossier
        </button>
      )}
    >
      {(fermer) => (
        <form action={creerDossier}>
          {parentId ? (
            <input type="hidden" name="parent" value={parentId} />
          ) : null}
          <ModalBody>
            <Field
              label="Nom du dossier"
              hint={
                parentId
                  ? "Il sera rangé dans le dossier ouvert."
                  : "Il sera rangé à la racine de la bibliothèque."
              }
            >
              <input
                name="nom"
                required
                maxLength={80}
                autoFocus
                placeholder="Ex. Missions économiques"
                className={INPUT}
              />
            </Field>
            <ChampAccesDossier membres={membres} />
            <ChampsPresentation />
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Création…">
              <FolderPlus size={15} /> Créer le dossier
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function CarteDossier({
  dossier: d,
  space,
  admin,
  arborescence,
  membres,
}: {
  dossier: DossierRessource;
  space: Space;
  admin: boolean;
  arborescence: Arborescence;
  membres: MembreChoisissable[];
}) {
  const contenu = [
    d.dossiers ? `${d.dossiers} dossier${d.dossiers > 1 ? "s" : ""}` : null,
    d.ressources
      ? `${d.ressources} ressource${d.ressources > 1 ? "s" : ""}`
      : null,
  ].filter(Boolean);
  const reserve = !d.restreint
    ? null
    : admin
      ? `Réservé à ${d.acces.length} entreprise${d.acces.length > 1 ? "s" : ""}`
      : "Réservé à votre entreprise";
  const Icone = d.restreint ? FolderLock : Folder;

  return (
    <Card className="relative flex min-h-[96px] items-stretch overflow-hidden p-0 transition-shadow hover:shadow-[0_12px_28px_-20px_rgba(15,29,44,0.45)]">
      <span className="m-3 flex w-[70px] shrink-0 items-center justify-center text-accent/65">
        <Icone
          size={32}
          fill={d.restreint ? "none" : "currentColor"}
          strokeWidth={d.restreint ? 1.8 : 0}
        />
      </span>

      <div className="flex min-w-0 flex-1 flex-col justify-center py-3 pl-1 pr-10">
        <Link
          href={`/${space}/ressources?dossier=${d.id}`}
          className="flex min-w-0 items-center gap-2 no-underline after:absolute after:inset-0"
        >
          <span className="truncate text-[14.8px] font-semibold text-ink">
            {d.nom}
          </span>
        </Link>
        <span className="mt-1 text-[12.6px] text-muted">
          {contenu.length ? contenu.join(" · ") : "Vide"}
        </span>
        {reserve ? (
          <span className="mt-0.5 text-[11.8px] font-semibold text-warn">
            {reserve}
          </span>
        ) : null}
      </div>

      {admin ? (
        <div className="absolute right-1.5 top-1.5 z-10">
          <MenuDossier
            dossier={d}
            arborescence={arborescence}
            membres={membres}
          />
        </div>
      ) : null}
      <ChevronRight
        size={17}
        aria-hidden
        className="pointer-events-none absolute bottom-3 right-3 text-ink"
      />
    </Card>
  );
}

function MenuDossier({
  dossier: d,
  arborescence,
  membres,
}: {
  dossier: DossierRessource;
  arborescence: Arborescence;
  membres: MembreChoisissable[];
}) {
  type Fenetre = "menu" | "acces" | "reglages" | "supprimer";
  const [fenetre, setFenetre] = useState<Fenetre | null>(null);
  const fermer = (laquelle: Fenetre) => () =>
    setFenetre((f) => (f === laquelle ? null : f));

  return (
    <>
      <button
        type="button"
        onClick={() => setFenetre("menu")}
        aria-label={`Actions sur le dossier « ${d.nom} »`}
        title="Actions"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius-s)] border-0 bg-transparent text-ink hover:bg-surface-2"
      >
        <MoreVertical size={17} />
      </button>

      <Modal
        title="Que faire de ce dossier ?"
        ouvert={fenetre === "menu"}
        onFermer={fermer("menu")}
      >
        {() => (
          <>
            <ModalBody>
              <p className="m-0 text-[13.4px] text-muted">{d.nom}</p>
              <div className="grid gap-2">
                <ChoixDossier
                  icone={<Users size={16} />}
                  titre="Qui voit ce dossier"
                  detail={
                    d.restreint
                      ? `Réservé à ${d.acces.length} entreprise${d.acces.length > 1 ? "s" : ""}.`
                      : "Ouvert à tous les membres."
                  }
                  onClick={() => setFenetre("acces")}
                />
                <ChoixDossier
                  icone={<Pencil size={16} />}
                  titre="Réglages"
                  detail="Nom, couverture, auteur, rangement."
                  onClick={() => setFenetre("reglages")}
                />
                <ChoixDossier
                  icone={<Trash2 size={16} />}
                  titre="Supprimer"
                  detail="Ce qu’il contient remonte d’un niveau ; aucun document n’est effacé."
                  onClick={() => setFenetre("supprimer")}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <CancelButton onClick={fermer("menu")} />
            </ModalFooter>
          </>
        )}
      </Modal>

      <AccesDossier
        dossier={d}
        membres={membres}
        ouvert={fenetre === "acces"}
        onFermer={fermer("acces")}
      />
      <ReglagesDossier
        dossier={d}
        arborescence={arborescence}
        ouvert={fenetre === "reglages"}
        onFermer={fermer("reglages")}
      />
      <SupprimerDossier
        dossier={d}
        ouvert={fenetre === "supprimer"}
        onFermer={fermer("supprimer")}
      />
    </>
  );
}

function ChoixDossier({
  icone,
  titre,
  detail,
  onClick,
}: {
  icone: ReactNode;
  titre: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-m)] border border-line bg-surface px-4 py-3 text-left hover:border-faint hover:bg-surface-2"
    >
      <span className="mt-px shrink-0 text-accent">{icone}</span>
      <span>
        <span className="block text-[14px] font-semibold text-ink">
          {titre}
        </span>
        <span className="block text-[12.4px] text-muted">{detail}</span>
      </span>
    </button>
  );
}

interface Pilotage {
  ouvert?: boolean;
  onFermer?: () => void;
}

const BTN_ICONE =
  "flex h-8 w-8 items-center justify-center rounded-[var(--radius-s)] border border-line bg-surface text-muted cursor-pointer";

export function CommandesDossier({
  dossier,
  arborescence,
  membres,
}: {
  dossier: DossierRessource;
  arborescence: Arborescence;
  membres: MembreChoisissable[];
}) {
  return (
    <>
      <AccesDossier dossier={dossier} membres={membres} />
      <ReglagesDossier dossier={dossier} arborescence={arborescence} />
      <SupprimerDossier dossier={dossier} />
    </>
  );
}

function AccesDossier({
  dossier: d,
  membres,
  ouvert,
  onFermer,
}: {
  dossier: DossierRessource;
  membres: MembreChoisissable[];
} & Pilotage) {
  return (
    <Modal
      title="Qui voit ce dossier"
      largeur="max-w-[620px]"
      ouvert={ouvert}
      onFermer={onFermer}
      trigger={
        ouvert !== undefined
          ? undefined
          : (ouvrir) => (
              <button
                type="button"
                onClick={ouvrir}
                aria-label={`Qui voit « ${d.nom} »`}
                title="Qui voit ce dossier"
                className={`${BTN_ICONE} hover:border-faint hover:text-ink ${d.restreint ? "border-warn text-warn" : ""}`}
              >
                <Users size={14} />
              </button>
            )
      }
    >
      {(fermer) => (
        <form action={reglerAccesDossier}>
          <input type="hidden" name="dossierId" value={d.id} />
          <ModalBody>
            <p className="m-0 text-[13.4px] text-muted">
              <b className="text-ink">{d.nom}</b> — l’accès vaut pour tout ce
              que le dossier contient : ses ressources et ses sous-dossiers.
            </p>
            <ChampAccesDossier
              membres={membres}
              restreint={d.restreint}
              acces={d.acces}
            />
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Enregistrement…">
              <Check size={15} /> Enregistrer l’accès
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

function ReglagesDossier({
  dossier: d,
  arborescence,
  ouvert,
  onFermer,
}: {
  dossier: DossierRessource;
  arborescence: Arborescence;
} & Pilotage) {
  return (
    <Modal
      wide
      title="Réglages du dossier"
      ouvert={ouvert}
      onFermer={onFermer}
      trigger={
        ouvert !== undefined
          ? undefined
          : (ouvrir) => (
              <button
                type="button"
                onClick={ouvrir}
                aria-label={`Réglages de « ${d.nom} »`}
                title="Nom, couverture, auteur, rangement"
                className={`${BTN_ICONE} hover:border-faint hover:text-ink`}
              >
                <Pencil size={14} />
              </button>
            )
      }
    >
      {(fermer) => (
        <>
          <form action={modifierDossier}>
            <input type="hidden" name="dossierId" value={d.id} />
            <ModalBody>
              <Field label="Nom">
                <input
                  name="nom"
                  required
                  maxLength={80}
                  defaultValue={d.nom}
                  className={INPUT}
                />
              </Field>
              <ChampsPresentation dossier={d} />
            </ModalBody>
            <ModalFooter>
              <CancelButton onClick={fermer} />
              <SubmitButton sm pendingLabel="Enregistrement…">
                <Check size={14} /> Enregistrer
              </SubmitButton>
            </ModalFooter>
          </form>

          <form action={deplacerDossier} className="border-t border-line">
            <input type="hidden" name="dossierId" value={d.id} />
            <ModalBody>
              <Field
                label="Ranger dans"
                hint="Un dossier ne peut pas être rangé dans lui-même."
              >
                <select
                  name="parent"
                  defaultValue={d.parentId ?? ""}
                  className={INPUT}
                >
                  <option value="">Racine de la bibliothèque</option>
                  {arborescence
                    .filter((x) => x.id !== d.id)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {decalage(x.profondeur)}
                        {x.nom}
                      </option>
                    ))}
                </select>
              </Field>
            </ModalBody>
            <ModalFooter>
              <SubmitButton sm variant="line" pendingLabel="Déplacement…">
                Déplacer
              </SubmitButton>
            </ModalFooter>
          </form>
        </>
      )}
    </Modal>
  );
}

function SupprimerDossier({
  dossier: d,
  ouvert,
  onFermer,
}: { dossier: DossierRessource } & Pilotage) {
  const contenu = d.dossiers + d.ressources;
  return (
    <Modal
      title="Supprimer le dossier"
      ouvert={ouvert}
      onFermer={onFermer}
      trigger={
        ouvert !== undefined
          ? undefined
          : (ouvrir) => (
              <button
                type="button"
                onClick={ouvrir}
                aria-label={`Supprimer « ${d.nom} »`}
                title="Supprimer"
                className={`${BTN_ICONE} hover:border-accent hover:text-accent`}
              >
                <Trash2 size={14} />
              </button>
            )
      }
    >
      {(fermer) => (
        <form action={supprimerDossier}>
          <input type="hidden" name="dossierId" value={d.id} />
          <ModalBody>
            <p className="m-0 text-[13.8px] text-muted">
              Le dossier <b className="text-ink">{d.nom}</b> sera supprimé.
              {contenu ? (
                <>
                  {" "}
                  Ce qu’il contient — {contenu} élément
                  {contenu > 1 ? "s" : ""} — remonte d’un niveau. Aucun document
                  n’est effacé.
                </>
              ) : (
                " Il est vide."
              )}
              {d.restreint && contenu ? (
                <>
                  {" "}
                  <b className="text-ink">Ce dossier est réservé</b> : une fois
                  remonté, son contenu suit l’accès du dossier qui le reçoit.
                </>
              ) : null}
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
