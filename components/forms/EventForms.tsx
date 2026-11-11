"use client";

import { useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  LogIn,
  Plus,
  TicketCheck,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { INPUT } from "@/components/champ-style";
import { CancelButton, Field, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import {
  addAttendee,
  cancelRegistration,
  deleteEvent,
  registerForEvent,
  retirerParticipant,
  toggleAttendance,
  validerInscription,
} from "@/lib/actions/events";
import { fmtMoney } from "@/lib/format";
import type { ModeReglement } from "@/lib/modes-reglement";
import type { CanchamEvent } from "@/lib/types";

const BTN_PRIMARY = "btn-action btn-action-sm";

export interface ContactInscrivable {
  id: string;
  nom: string;
  fonction: string;
}

export function RegisterButton({
  event,
  entreprise,
  contacts,
  moi,
  coordonnees,
  modesPaiement = [],
  libelle = "S’inscrire",
}: {
  event: CanchamEvent;
  entreprise: string;
  contacts: ContactInscrivable[];
  moi: string;
  coordonnees: { email: string; telephone?: string | null };
  modesPaiement?: ModeReglement[];
  libelle?: string;
}) {
  const restantes = event.cap - event.inscrits;
  const paiementEnLigne = event.payant && modesPaiement.length > 0;
  return (
    <Modal
      title="Inscription à l’événement"
      trigger={(ouvrir) => (
        <button
          onClick={ouvrir}
          className={`${BTN_PRIMARY} justify-center text-[13.4px] px-[18px] py-[10px]`}
        >
          {libelle}
        </button>
      )}
    >
      {(fermer) => (
        <form action={registerForEvent}>
          <input type="hidden" name="eventId" value={event.id} />
          <ModalBody>
            <div>
              <div className="font-semibold text-[15px]">{event.titre}</div>
              <div className="text-[12.5px] text-muted">
                {event.lieu} · {restantes} place{restantes > 1 ? "s" : ""}{" "}
                restante{restantes > 1 ? "s" : ""}
              </div>
            </div>
            <Field label="Nom de l’entreprise">
              <select
                name="entreprise"
                defaultValue={entreprise}
                className={INPUT}
              >
                <option value={entreprise}>{entreprise}</option>
              </select>
            </Field>
            <ChoixRepresentants
              contacts={contacts}
              moi={moi}
              restantes={restantes}
            />
            <ChampsCoordonnees
              email={coordonnees.email}
              telephone={coordonnees.telephone}
            />
            {event.payant ? (
              <p className="text-[13px] text-warn bg-warn-soft rounded-[var(--radius-s)] px-3.5 py-3 m-0">
                <b>Événement payant · {fmtMoney(event.prix)} par personne</b>
                <br />
                {paiementEnLigne
                  ? "Une facture est générée à l’inscription. Vous choisirez votre moyen de paiement à l’écran suivant."
                  : "Une facture sera générée à l’inscription, réglable auprès de l’équipe."}
              </p>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Inscription…">
              {paiementEnLigne ? (
                <>
                  Suivant <ArrowRight size={14} />
                </>
              ) : (
                <>
                  <Check size={14} /> Confirmer l’inscription
                </>
              )}
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function ChampsCoordonnees({
  email = "",
  telephone = "",
}: {
  email?: string;
  telephone?: string | null;
}) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2">
      <Field label="Téléphone">
        <input
          type="tel"
          name="telephone"
          required
          defaultValue={telephone ?? ""}
          autoComplete="tel"
          placeholder="+261 34 00 000 00"
          className={INPUT}
        />
      </Field>
      <Field label="E-mail">
        <input
          type="email"
          name="email"
          required
          defaultValue={email}
          autoComplete="email"
          placeholder="nom@entreprise.mg"
          className={INPUT}
        />
      </Field>
    </div>
  );
}

function ChoixRepresentants({
  contacts,
  moi,
  restantes,
}: {
  contacts: ContactInscrivable[];
  moi: string;
  restantes: number;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [choisis, setChoisis] = useState<string[]>(() =>
    contacts.some((c) => c.id === moi)
      ? [moi]
      : contacts[0]
        ? [contacts[0].id]
        : [],
  );
  const cadre = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const ailleurs = (e: PointerEvent) => {
      if (!cadre.current?.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("pointerdown", ailleurs);
    return () => document.removeEventListener("pointerdown", ailleurs);
  }, [ouvert]);

  const basculer = (id: string) =>
    setChoisis((c) =>
      c.includes(id) ? c.filter((x) => x !== id) : [...c, id],
    );
  const noms = contacts.filter((c) => choisis.includes(c.id)).map((c) => c.nom);
  const trop = choisis.length > restantes;

  return (
    <div className="block">
      <span
        id="etiquette-representants"
        className="block text-[12.8px] font-semibold text-ink mb-1.5"
      >
        Nom du représentant{" "}
        <span className="font-normal text-muted">
          (vous pouvez en choisir plusieurs)
        </span>
      </span>
      <div ref={cadre} className="relative">
        <button
          type="button"
          onClick={() => setOuvert((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={ouvert}
          aria-labelledby="etiquette-representants"
          className={`${INPUT} flex items-center justify-between gap-2 text-left cursor-pointer`}
        >
          <span className={`truncate ${noms.length ? "" : "text-faint"}`}>
            {noms.length ? noms.join(", ") : "Choisir parmi vos contacts…"}
          </span>
          <ChevronDown
            size={16}
            aria-hidden
            className={`shrink-0 text-muted transition-transform ${ouvert ? "rotate-180" : ""}`}
          />
        </button>
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby="etiquette-representants"
          hidden={!ouvert}
          className="mt-1 max-h-[240px] overflow-y-auto rounded-[var(--radius-s)] border border-line bg-surface shadow-[0_8px_24px_-14px_rgba(15,29,44,0.35)] py-1"
        >
          {contacts.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-surface-2"
            >
              <input
                type="checkbox"
                name="representant"
                value={c.id}
                checked={choisis.includes(c.id)}
                onChange={() => basculer(c.id)}
                className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
              />
              <span className="min-w-0">
                <span className="block text-[13.4px] font-semibold text-ink truncate">
                  {c.nom}
                  {c.id === moi ? (
                    <span className="font-normal text-muted"> (vous)</span>
                  ) : null}
                </span>
                <span className="block text-[11.8px] text-muted truncate">
                  {c.fonction}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <span
        className={`block text-[11.8px] mt-1 ${trop || !choisis.length ? "text-bad" : "text-faint"}`}
      >
        {!choisis.length
          ? "Choisissez au moins une personne."
          : trop
            ? `Il ne reste que ${restantes} place${restantes > 1 ? "s" : ""}.`
            : `${choisis.length} personne${choisis.length > 1 ? "s" : ""} inscrite${choisis.length > 1 ? "s" : ""}, chacune avec son QR code.`}
      </span>
    </div>
  );
}

export function CancelRegistrationButton({ eventId }: { eventId: string }) {
  return (
    <form action={cancelRegistration}>
      <input type="hidden" name="eventId" value={eventId} />
      <SubmitButton
        sm
        variant="ghost"
        pendingLabel="Annulation…"
        className="text-bad w-full justify-center"
      >
        <X size={13} /> Annuler mon inscription
      </SubmitButton>
    </form>
  );
}

export function DeleteEventButton({
  eventId,
  titre,
}: {
  eventId: string;
  titre: string;
}) {
  return (
    <Modal
      title="Supprimer l’événement"
      trigger={(ouvrir) => (
        <button
          onClick={ouvrir}
          className="inline-flex items-center gap-[7px] rounded-[var(--radius-s)] font-semibold cursor-pointer border border-transparent bg-transparent text-bad hover:bg-surface-2 text-[12.4px] px-[11px] py-1.5"
        >
          <Trash2 size={13} /> Supprimer
        </button>
      )}
    >
      {(fermer) => (
        <form action={deleteEvent}>
          <input type="hidden" name="eventId" value={eventId} />
          <ModalBody>
            <p className="text-[13.6px] text-muted m-0">
              « <b className="text-ink">{titre}</b> » sera supprimé avec ses
              inscriptions et sa liste de présence. L’opération est consignée au
              journal.
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

export function AttendanceButton({
  attendeeId,
  eventId,
  statut,
  retour,
}: {
  attendeeId: string;
  eventId: string;
  statut: "confirme" | "present" | "absent";
  retour?: string;
}) {
  return (
    <form
      action={toggleAttendance}
      className="inline-flex rounded-[var(--radius-s)] border border-line overflow-hidden shrink-0 divide-x divide-line"
    >
      <input type="hidden" name="attendeeId" value={attendeeId} />
      <input type="hidden" name="eventId" value={eventId} />
      {retour ? <input type="hidden" name="retour" value={retour} /> : null}
      <BoutonPresence valeur="present" actif={statut === "present"} />
      <BoutonPresence valeur="absent" actif={statut === "absent"} />
    </form>
  );
}

function BoutonPresence({
  valeur,
  actif,
}: {
  valeur: "present" | "absent";
  actif: boolean;
}) {
  const { pending } = useFormStatus();
  const present = valeur === "present";
  return (
    <button
      type="submit"
      name="statut"
      value={valeur}
      disabled={pending || actif}
      aria-pressed={actif}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.6px] font-semibold whitespace-nowrap transition-colors ${
        actif
          ? present
            ? "bg-success-soft text-success-strong"
            : "bg-bad-soft text-bad"
          : "bg-surface text-muted cursor-pointer hover:bg-surface-2 hover:text-ink disabled:opacity-60 disabled:cursor-default"
      }`}
    >
      {present ? <Check size={13} /> : <X size={13} />}
      {present ? "Présent" : "Absent"}
    </button>
  );
}

export function ValiderInscriptionButton({
  attendeeId,
  eventId,
  nom,
  retour,
}: {
  attendeeId: string;
  eventId: string;
  nom: string;
  retour?: string;
}) {
  return (
    <Modal
      title="Valider l’inscription"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          className="inline-flex items-center gap-1.5 shrink-0 rounded-[var(--radius-s)] border border-line bg-transparent text-ink px-2.5 py-1.5 text-[12.4px] font-semibold cursor-pointer hover:border-faint hover:bg-surface-2"
        >
          <TicketCheck size={14} /> Valider
        </button>
      )}
    >
      {(fermer) => (
        <form action={validerInscription}>
          <input type="hidden" name="attendeeId" value={attendeeId} />
          <input type="hidden" name="eventId" value={eventId} />
          {retour ? <input type="hidden" name="retour" value={retour} /> : null}
          <ModalBody>
            <p className="text-[13.6px] text-muted m-0">
              Le règlement de <b className="text-ink">{nom}</b> est bien
              constaté ? L’inscription passe « inscrite » — tous ses
              représentants avec elle — et les billets partent aussitôt par
              e-mail, avec leur QR code d’entrée.
            </p>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Validation…">
              <TicketCheck size={14} /> Valider et envoyer les billets
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function RetirerParticipantButton({
  attendeeId,
  eventId,
  nom,
  retour,
}: {
  attendeeId: string;
  eventId: string;
  nom: string;
  retour?: string;
}) {
  return (
    <Modal
      title="Retirer de la liste"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          aria-label={`Retirer ${nom}`}
          title="Retirer de la liste"
          className="w-8 h-8 rounded-[var(--radius-s)] border border-transparent bg-transparent text-faint flex items-center justify-center cursor-pointer hover:text-accent hover:border-line"
        >
          <Trash2 size={14} />
        </button>
      )}
    >
      {(fermer) => (
        <form action={retirerParticipant}>
          <input type="hidden" name="attendeeId" value={attendeeId} />
          <input type="hidden" name="eventId" value={eventId} />
          {retour ? <input type="hidden" name="retour" value={retour} /> : null}
          <ModalBody>
            <p className="text-[13.6px] text-muted m-0">
              Retirer <b className="text-ink">{nom}</b> de la liste d’accueil ?
              Une inscription faite depuis l’espace membre reste enregistrée
              côté membre.
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

export function AddAttendeeButton({
  eventId,
  membres,
  retour,
}: {
  eventId: string;
  membres: { id: string; nom: string; contact: string; email: string }[];
  retour?: string;
}) {
  return (
    <Modal
      title="Inscrire quelqu’un"
      trigger={(ouvrir) => (
        <button
          onClick={ouvrir}
          className={`${BTN_PRIMARY} text-[12.4px] px-[11px] py-1.5`}
        >
          <UserPlus size={14} /> Inscrire quelqu’un
        </button>
      )}
    >
      {(fermer) => (
        <form action={addAttendee}>
          <input type="hidden" name="eventId" value={eventId} />
          {retour ? <input type="hidden" name="retour" value={retour} /> : null}
          <ModalBody>
            <Field label="Nom">
              <input
                type="text"
                name="nom"
                required
                placeholder="Nom complet"
                className={INPUT}
              />
            </Field>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Entreprise">
                <input
                  type="text"
                  name="entreprise"
                  list="membres-connus"
                  placeholder="Ex. Participant individuel"
                  className={INPUT}
                />
                <datalist id="membres-connus">
                  {membres.map((m) => (
                    <option key={m.id} value={m.nom} />
                  ))}
                </datalist>
              </Field>
              <Field label="Courriel">
                <input
                  type="email"
                  name="email"
                  placeholder="contact@exemple.mg"
                  className={INPUT}
                />
              </Field>
            </div>
            <p className="text-[12px] text-faint m-0">
              Pour une personne qui se présente sans inscription préalable,
              utilisez « Arrivée directe » : elle est enregistrée comme présente
              immédiatement.
            </p>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton
              name="direct"
              value="1"
              variant="line"
              pendingLabel="…"
            >
              <LogIn size={14} /> Arrivée directe
            </SubmitButton>
            <SubmitButton pendingLabel="Inscription…">
              <Plus size={14} /> Inscrire
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
