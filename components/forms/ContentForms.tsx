"use client";

import Link from "next/link";
import { FenetreMoyens } from "@/components/paiement/FenetreMoyens";
import type { ModeReglement } from "@/lib/modes-reglement";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Pencil,
  Check,
  PlayCircle,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { INPUT } from "@/components/champ-style";
import { CancelButton, ChampPhoto, Field, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import {
  deleteService,
  deplacerService,
  downloadResource,
  saveService,
} from "@/lib/actions/content";
import { estCheminFerme, normaliserLien } from "@/lib/liens";
import type { CanchamService, Space } from "@/lib/types";

export function DownloadResourceButton({
  resourceId,
  space,
  accessible,
  video,
  achat,
}: {
  resourceId: string;
  space: Space;
  accessible: boolean;
  video: boolean;
  achat?: { titre: string; somme: string; modes: ModeReglement[] };
}) {
  if (accessible || space === "admin") {
    return (
      <Link
        href={`/${space}/ressources/${resourceId}`}
        className="w-full inline-flex items-center justify-center gap-[7px] rounded-[var(--radius-s)] font-semibold border border-line bg-transparent text-ink no-underline hover:border-faint hover:bg-surface-2 text-[12.4px] px-[11px] py-1.5"
      >
        {video ? <PlayCircle size={13} /> : <BookOpen size={13} />}
        {video ? "Regarder" : "Lire"}
      </Link>
    );
  }

  if (achat?.modes.length) {
    return (
      <FenetreMoyens
        achat={{
          type: "ressource",
          id: resourceId,
          titre: achat.titre,
          somme: achat.somme,
        }}
        modes={achat.modes}
        declencheur={
          <>
            <ShoppingCart size={13} /> Acheter
          </>
        }
        classeDeclencheur="w-full inline-flex cursor-pointer items-center justify-center gap-[7px] rounded-[var(--radius-s)] font-semibold border border-line bg-transparent text-ink hover:border-faint hover:bg-surface-2 text-[12.4px] px-[11px] py-1.5"
      />
    );
  }

  return (
    <form action={downloadResource} className="w-full">
      <input type="hidden" name="resourceId" value={resourceId} />
      <input type="hidden" name="space" value={space} />
      <SubmitButton
        sm
        variant="line"
        pendingLabel="…"
        className="w-full justify-center"
      >
        <ShoppingCart size={13} /> Acheter
      </SubmitButton>
    </form>
  );
}

export function ServiceFormButton({
  service,
  rendezvous = [],
}: {
  service?: CanchamService;
  rendezvous?: { titre: string; lien: string }[];
}) {
  const edition = !!service;
  const suggestions = `liens-rendezvous-${service?.id ?? "nouveau"}`;
  return (
    <Modal
      title={edition ? "Modifier le service" : "Ajouter un service"}
      trigger={(ouvrir) =>
        edition ? (
          <button
            type="button"
            onClick={ouvrir}
            className="btn-contour btn-contour-sm text-ink hover:bg-surface-2"
          >
            <Pencil size={13} /> Modifier
          </button>
        ) : (
          <button
            type="button"
            onClick={ouvrir}
            className="btn-action btn-action-sm"
          >
            <Plus size={15} /> Nouveau service
          </button>
        )
      }
    >
      {(fermer) => (
        <form action={saveService}>
          {service ? (
            <input type="hidden" name="serviceId" value={service.id} />
          ) : null}
          <ModalBody>
            <ChampPhoto
              name="image"
              retirer="retirerImage"
              apercu={service?.image}
              libelle="Photo de couverture"
              aide="En tête de la carte vue par les membres. Paysage de préférence ; sans photo, la carte garde un dégradé à la couleur du service."
            />
            <Field label="Titre">
              <input
                type="text"
                name="titre"
                required
                defaultValue={service?.titre}
                placeholder="Ex. Accompagnement personnalisé à l’export"
                className={INPUT}
              />
            </Field>
            <Field label="Description">
              <textarea
                name="desc"
                rows={3}
                defaultValue={service?.desc}
                className={INPUT}
              />
            </Field>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Type">
                <select
                  name="type"
                  className={INPUT}
                  defaultValue={service?.type ?? "gratuit"}
                >
                  <option value="gratuit">Gratuit</option>
                  <option value="payant">Payant</option>
                </select>
              </Field>
              <Field
                label="Tarif ($ CAD)"
                hint="Ignoré si le service est gratuit."
              >
                <input
                  type="number"
                  name="prix"
                  min={0}
                  defaultValue={service?.prix ?? 100000}
                  className={INPUT}
                />
              </Field>
            </div>
            <Field
              label="Lien"
              hint={
                rendezvous.length
                  ? "Facultatif : où mène le bouton du service. Collez le lien d’un rendez-vous, ou choisissez-en un dans la liste. Sans lien, le bouton envoie la demande à l’équipe."
                  : "Facultatif : où mène le bouton du service — le lien d’un rendez-vous, une page, un site. Sans lien, le bouton envoie la demande à l’équipe."
              }
            >
              <input
                type="text"
                name="lien"
                inputMode="url"
                maxLength={500}
                defaultValue={service?.lien ?? ""}
                placeholder="Ex. le lien d’un type de rendez-vous"
                list={rendezvous.length ? suggestions : undefined}
                onChange={(e) => {
                  const v = e.currentTarget.value.trim();
                  const lien = v
                    ? normaliserLien(v, [window.location.origin])
                    : null;
                  e.currentTarget.setCustomValidity(
                    !v
                      ? ""
                      : !lien
                        ? "Collez une adresse complète (https://…) ou le lien d’un rendez-vous."
                        : estCheminFerme(lien)
                          ? "Ce lien mène à l’espace de l’équipe : les membres ne peuvent pas l’ouvrir."
                          : "",
                  );
                }}
                className={INPUT}
              />
              {rendezvous.length ? (
                <datalist id={suggestions}>
                  {rendezvous.map((r) => (
                    <option key={r.lien} value={r.lien}>
                      Rendez-vous : {r.titre}
                    </option>
                  ))}
                </datalist>
              ) : null}
            </Field>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Enregistrement…">
              <Check size={14} />{" "}
              {edition ? "Enregistrer" : "Publier le service"}
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function DeleteServiceButton({
  serviceId,
  titre,
}: {
  serviceId: string;
  titre: string;
}) {
  return (
    <Modal
      title="Retirer le service"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          aria-label={`Retirer « ${titre} »`}
          title="Retirer"
          className="w-9 h-9 rounded-[var(--radius-s)] border border-line bg-surface flex items-center justify-center cursor-pointer text-muted hover:text-accent hover:border-accent"
        >
          <Trash2 size={15} />
        </button>
      )}
    >
      {(fermer) => (
        <form action={deleteService}>
          <input type="hidden" name="serviceId" value={serviceId} />
          <ModalBody>
            <p className="m-0 text-[13.6px] text-muted">
              « <b className="text-ink">{titre}</b> » ne sera plus proposé aux
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

export function DeplacerServiceButton({
  serviceId,
  sens,
  desactive,
}: {
  serviceId: string;
  sens: "haut" | "bas";
  desactive: boolean;
}) {
  return (
    <form action={deplacerService}>
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="sens" value={sens} />
      <SubmitButton
        sm
        variant="line"
        disabled={desactive}
        aria-label={sens === "haut" ? "Monter" : "Descendre"}
        title={sens === "haut" ? "Monter" : "Descendre"}
        className="!px-2 disabled:opacity-35"
      >
        {sens === "haut" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
      </SubmitButton>
    </form>
  );
}
