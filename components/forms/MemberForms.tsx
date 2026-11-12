"use client";

import {
  Bell,
  Check,
  CreditCard,
  ImagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { OptionsFormules } from "@/components/OptionsFormules";
import { OptionsSecteurs } from "@/components/OptionsSecteurs";
import { PAYS } from "@/lib/accueil";
import { useId, useState, type KeyboardEvent } from "react";
import { Modal } from "@/components/Modal";
import { INPUT } from "@/components/champ-style";
import { CancelButton, Field, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import { modifierDateReglement } from "@/lib/actions/factures";
import {
  addContact,
  ajouterService,
  donnerAcces,
  modifierService,
  supprimerService,
  createMember,
  removeContact,
  updateContact,
  deleteMember,
  modifierDateAdhesion,
  modifierFormule,
  registerPayment,
  reconsidererCandidature,
  rejectCandidature,
  renvoyerInvitation,
  sendReminder,
  updateMemberProfile,
  ajouterBesoin,
} from "@/lib/actions/members";
import {
  BESOINS_PAR_FICHE,
  fmtMontant,
  libelleFormule,
  PHOTOS_PAR_PRODUIT,
  type Formule,
} from "@/lib/membership";
import type { Contact, Produit } from "@/lib/types";
import { EntreeFichier } from "@/components/EnvoisSuivis";

const BTN_PRIMARY = "btn-action btn-action-sm";
const BTN_LINE =
  "inline-flex items-center gap-[7px] rounded-[var(--radius-s)] font-semibold cursor-pointer border border-line bg-transparent text-ink hover:bg-surface-2";
const BTN_DANGER =
  "w-full justify-center inline-flex items-center gap-[7px] rounded-[var(--radius-s)] font-semibold cursor-pointer border border-bad-soft bg-transparent text-bad hover:bg-surface-2 text-[12.4px] px-[11px] py-1.5";

export function AddMemberButton({ formules }: { formules: Formule[] }) {
  return (
    <Modal
      title="Ajouter un membre"
      trigger={(ouvrir) => (
        <button
          onClick={ouvrir}
          className={`${BTN_PRIMARY} text-[13.4px] px-[15px] py-[9px]`}
        >
          <Plus size={15} /> Ajouter un membre
        </button>
      )}
    >
      {(fermer) => (
        <form action={createMember}>
          <ModalBody>
            <Field label="Type de membre">
              <select name="type" className={INPUT} defaultValue="morale">
                <option value="morale">Entreprise (personne morale)</option>
                <option value="physique">
                  Indépendant (personne physique)
                </option>
              </select>
            </Field>
            <Field
              label="Nom de l’entreprise"
              hint="Pour un indépendant, laissez vide pour reprendre le nom de la personne."
            >
              <input
                type="text"
                name="nom"
                placeholder="Ex. Zafy Design"
                className={INPUT}
              />
            </Field>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Secteur d’activité">
                <select name="secteur" defaultValue="" className={INPUT}>
                  <OptionsSecteurs />
                </select>
              </Field>
              <Field label="Ville">
                <input
                  type="text"
                  name="ville"
                  placeholder="Antananarivo"
                  className={INPUT}
                />
              </Field>
            </div>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Représentant / contact clé">
                <input
                  type="text"
                  name="rep"
                  placeholder="Nom complet"
                  className={INPUT}
                />
              </Field>
              <Field label="Fonction">
                <input
                  type="text"
                  name="repTitre"
                  placeholder="Ex. Directrice Générale"
                  className={INPUT}
                />
              </Field>
            </div>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field
                label="Courriel"
                hint="Son accès lui sera envoyé ici, par « Envoyer l’accès »."
              >
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="contact@entreprise.mg"
                  className={INPUT}
                />
              </Field>
              <Field label="Téléphone">
                <input
                  type="tel"
                  name="tel"
                  placeholder="+261 3…"
                  className={INPUT}
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                name="desc"
                rows={3}
                placeholder="Courte description de l’activité…"
                className={INPUT}
              />
            </Field>
            <Field
              label="Formule d’adhésion"
              hint="Elle fixe le montant attendu et la devise de ses factures. Laissée à définir, aucune cotisation n’est réclamée."
            >
              <select name="formule" className={INPUT} defaultValue="">
                <OptionsFormules formules={formules} vide="À définir — le membre choisira" />
              </select>
            </Field>
            <Field label="Statut à la création">
              <select name="statut" className={INPUT} defaultValue="en_attente">
                <option value="a_jour">À jour (adhésion payée)</option>
                <option value="en_attente">En attente de paiement</option>
              </select>
            </Field>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Ajout…">
              <Plus size={14} /> Ajouter le membre
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function RegisterPaymentButton({
  memberId,
  premier,
  nom,
  formule,
}: {
  memberId: string;
  premier: boolean;
  nom: string;
  formule: Formule | null;
}) {
  const aujourdhui = new Date().toISOString().slice(0, 10);

  if (!formule) {
    return (
      <Modal
        title="Enregistrer le paiement"
        trigger={(ouvrir) => (
          <button
            onClick={ouvrir}
            className={`${BTN_PRIMARY} w-full justify-center text-[12.4px] px-[11px] py-1.5`}
          >
            <CreditCard size={14} /> Enregistrer le paiement
          </button>
        )}
      >
        {(fermer) => (
          <>
            <ModalBody>
              <p className="m-0 text-[14px]">
                Aucune formule n’est encore choisie pour <strong>{nom}</strong>.
              </p>
              <p className="m-0 text-[13px] text-muted">
                C’est elle qui donne le montant attendu et la devise de la
                facture. Choisissez-la d’abord — le crayon à côté de « Formule
                », plus haut sur cette fiche — puis revenez enregistrer le
                règlement.
              </p>
            </ModalBody>
            <ModalFooter>
              <CancelButton onClick={fermer} />
            </ModalFooter>
          </>
        )}
      </Modal>
    );
  }

  const { montant, devise } = formule;
  return (
    <Modal
      title="Enregistrer le paiement"
      trigger={(ouvrir) => (
        <button
          onClick={ouvrir}
          className={`${BTN_PRIMARY} w-full justify-center text-[12.4px] px-[11px] py-1.5`}
        >
          <CreditCard size={14} />{" "}
          {premier ? "Enregistrer le paiement" : "Enregistrer un règlement"}
        </button>
      )}
    >
      {(fermer) => (
        <form action={registerPayment}>
          <input type="hidden" name="memberId" value={memberId} />
          <ModalBody>
            <p className="text-[13px] text-muted m-0">
              {premier
                ? `Confirmez le règlement de la cotisation pour activer l’accès complet de ${nom}.`
                : `Enregistrez un règlement pour ${nom}.`}
            </p>
            <Field label="Mode de paiement">
              <select name="mode" className={INPUT} defaultValue="Espèces">
                <option>Espèces</option>
                <option>Virement bancaire</option>
                <option>Mobile Money</option>
                <option>Chèque</option>
              </select>
            </Field>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field
                label={`Montant (${devise === "CAD" ? "$ CAD" : "Ariary"})`}
                hint={`${libelleFormule(formule)} : ${fmtMontant(montant, devise)} par an`}
              >
                <input
                  type="number"
                  name="montant"
                  defaultValue={montant}
                  className={INPUT}
                />
                <input type="hidden" name="devise" value={devise} />
              </Field>
              <Field label="Date du paiement">
                <input
                  type="date"
                  name="date"
                  defaultValue={aujourdhui}
                  className={INPUT}
                />
              </Field>
            </div>
            <Field label="Note interne (optionnel)">
              <input
                type="text"
                name="note"
                placeholder="Ex. reçu remis en main propre"
                className={INPUT}
              />
            </Field>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Enregistrement…">
              <Check size={14} /> Confirmer le paiement
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function AccederButton({
  memberId,
  nom,
  candidature = false,
  renvoi = false,
  retour,
  large = false,
}: {
  memberId: string;
  nom: string;
  candidature?: boolean;
  renvoi?: boolean;
  retour: string;
  large?: boolean;
}) {
  const champs = (
    <>
      <input type="hidden" name="memberId" value={memberId} />
      <input type="hidden" name="retour" value={retour} />
    </>
  );
  const largeur = large ? "w-full justify-center" : "";

  if (!candidature) {
    return (
      <form action={donnerAcces} className={large ? "w-full" : ""}>
        {champs}
        <SubmitButton
          sm
          variant={renvoi ? "line" : "primary"}
          pendingLabel="Envoi…"
          className={`${largeur} whitespace-nowrap`}
          title={
            renvoi
              ? "Renvoyer le lien pour créer son mot de passe"
              : "Envoyer le lien pour créer son mot de passe"
          }
        >
          <Send size={13} /> {renvoi ? "Renvoyer" : "Envoyer l’accès"}
        </SubmitButton>
      </form>
    );
  }

  return (
    <Modal
      title="Valider la demande et donner l’accès"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          className={`btn-action btn-action-sm whitespace-nowrap ${largeur}`}
        >
          <Check size={14} /> Envoyer l’accès
        </button>
      )}
    >
      {(fermer) => (
        <form action={donnerAcces}>
          {champs}
          <ModalBody>
            <p className="text-[13.6px] text-muted m-0">
              La demande de <b className="text-ink">{nom}</b> sera validée :
              elle passe en adhésion, en attente du règlement de la cotisation.
              Son contact reçoit un e-mail pour créer son mot de passe et se
              connecter.
            </p>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Envoi…">
              <Check size={14} /> Valider et envoyer l’accès
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function RejectButton({
  memberId,
  nom,
}: {
  memberId: string;
  nom: string;
}) {
  return (
    <Modal
      title="Refuser la demande"
      trigger={(ouvrir) => (
        <button onClick={ouvrir} className={BTN_DANGER}>
          <X size={14} /> Refuser la demande
        </button>
      )}
    >
      {(fermer) => (
        <form action={rejectCandidature}>
          <input type="hidden" name="memberId" value={memberId} />
          <ModalBody>
            <p className="text-[13.6px] text-muted m-0">
              La demande de <b className="text-ink">{nom}</b> passe en « refusée
              ». Le dossier reste au back-office, sous l’onglet du même nom :
              rien n’en paraît côté membre, et son auteur ne peut pas ouvrir de
              session. Vous pourrez revenir sur ce refus, ou supprimer la fiche
              pour de bon.
            </p>
            <Field
              label="Commentaire"
              hint="Visible de l’équipe seulement : le demandeur ne le reçoit pas."
            >
              <textarea
                name="commentaire"
                required
                maxLength={2000}
                rows={4}
                placeholder="Pourquoi cette demande n’est pas validée…"
                className={`${INPUT} resize-y`}
              />
            </Field>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton variant="danger" pendingLabel="Refus…">
              <X size={14} /> Refuser la demande
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function ReconsidererButton({
  memberId,
  nom,
}: {
  memberId: string;
  nom: string;
}) {
  return (
    <Modal
      title="Reconsidérer la demande"
      trigger={(ouvrir) => (
        <button onClick={ouvrir} className="btn-contour btn-contour-sm">
          <RotateCcw size={14} /> Reconsidérer
        </button>
      )}
    >
      {(fermer) => (
        <form action={reconsidererCandidature}>
          <input type="hidden" name="memberId" value={memberId} />
          <ModalBody>
            <p className="m-0 text-[13.6px] text-muted">
              La demande de <b className="text-ink">{nom}</b> repasse à
              l’examen, avec tout ce qu’elle contenait. Vous pourrez la valider
              ou la refuser de nouveau.
            </p>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="…">
              <RotateCcw size={14} /> Remettre à l’examen
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function ReminderButton({ memberId }: { memberId: string }) {
  return (
    <form action={sendReminder}>
      <input type="hidden" name="memberId" value={memberId} />
      <SubmitButton
        sm
        variant="line"
        pendingLabel="Envoi…"
        className="w-full justify-center"
      >
        <Bell size={14} /> Envoyer une relance
      </SubmitButton>
    </form>
  );
}

export function RenvoyerInvitationButton({
  contactId,
  retour,
}: {
  contactId: string;
  retour: string;
}) {
  return (
    <form action={renvoyerInvitation}>
      <input type="hidden" name="contactId" value={contactId} />
      <input type="hidden" name="retour" value={retour} />
      <SubmitButton
        sm
        variant="line"
        pendingLabel="Envoi…"
        title="Jamais connecté : renvoyer le lien pour choisir son mot de passe"
      >
        <Send size={13} /> Renvoyer l’invitation
      </SubmitButton>
    </form>
  );
}

export function DeleteMemberButton({
  memberId,
  nom,
}: {
  memberId: string;
  nom: string;
}) {
  return (
    <Modal
      title="Supprimer ce membre"
      trigger={(ouvrir) => (
        <button onClick={ouvrir} className={BTN_DANGER}>
          <Trash2 size={14} /> Supprimer ce membre
        </button>
      )}
    >
      {(fermer) => (
        <form action={deleteMember}>
          <input type="hidden" name="memberId" value={memberId} />
          <ModalBody>
            <p className="text-[13.6px] text-muted m-0">
              <b className="text-ink">{nom}</b> sera retiré de l’annuaire avec
              ses produits, ses inscriptions et ses accès. Ses factures, pièces
              comptables, restent dans les paiements, à son nom.
            </p>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton variant="danger" pendingLabel="Suppression…">
              <Trash2 size={14} /> Supprimer définitivement
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function EditProfileButton({
  memberId,
  nom,
  independant = false,
  ville,
  pays = null,
  motivation = null,
  activite,
  desc,
  besoins,
  interets,
  secteur,
  siteweb = null,
  cover = null,
  logo = null,
  retour = "/membre/profil",
}: {
  memberId: string;
  nom: string;
  independant?: boolean;
  ville: string;
  pays?: string | null;
  motivation?: string | null;
  secteur: string;
  activite: string;
  desc: string;
  besoins?: string;
  interets?: string;
  siteweb?: string | null;
  cover?: string | null;
  logo?: string | null;
  retour?: string;
}) {
  const titre = retour.startsWith("/admin")
    ? "Modifier la fiche"
    : "Modifier ma fiche";
  return (
    <Modal
      wide
      title={titre}
      trigger={(ouvrir) => (
        <button
          onClick={ouvrir}
          className={`${BTN_LINE} text-[12.4px] px-[11px] py-1.5`}
        >
          <Pencil size={13} /> {titre}
        </button>
      )}
    >
      {(fermer) => (
        <form action={updateMemberProfile}>
          <input type="hidden" name="memberId" value={memberId} />
          <input type="hidden" name="retour" value={retour} />
          <ModalBody>
            <Field
              label={independant ? "Nom affiché" : "Nom de l’entreprise"}
              hint="Tel qu’il apparaît dans l’annuaire et sur vos prochaines factures."
            >
              <input
                type="text"
                name="nom"
                required
                maxLength={120}
                defaultValue={nom}
                autoComplete="organization"
                className={INPUT}
              />
            </Field>
            <div className="grid gap-3.5 md:grid-cols-3">
              <Field label="Secteur d’activité">
                <select name="secteur" defaultValue={secteur} className={INPUT}>
                  <OptionsSecteurs actuel={secteur} />
                </select>
              </Field>
              <Field label="Ville">
                <input
                  type="text"
                  name="ville"
                  required
                  maxLength={80}
                  defaultValue={ville}
                  autoComplete="address-level2"
                  className={INPUT}
                />
              </Field>
              <Field label="Pays">
                <select
                  name="pays"
                  defaultValue={pays ?? "Madagascar"}
                  className={INPUT}
                >
                  {PAYS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                  {pays && !(PAYS as readonly string[]).includes(pays) ? (
                    <option value={pays}>{pays}</option>
                  ) : null}
                </select>
              </Field>
            </div>
            <Field
              label="Site web"
              hint="Facultatif. Par exemple : monentreprise.mg"
            >
              <input
                type="text"
                name="siteweb"
                inputMode="url"
                autoComplete="url"
                defaultValue={siteweb ?? ""}
                placeholder="www.monentreprise.mg"
                className={INPUT}
              />
            </Field>
            <Field label="Activité (description courte)">
              <input
                type="text"
                name="activite"
                defaultValue={activite}
                className={INPUT}
              />
            </Field>
            <Field label="Description détaillée">
              <textarea
                name="desc"
                rows={4}
                defaultValue={desc}
                className={INPUT}
              />
            </Field>
            <ChampBesoins
              initial={[besoins, interets].filter(Boolean).join("\n")}
            />
            <Field
              label="Motivation à rejoindre CanCham"
              hint="Ce que vous attendez de la chambre. L’équipe la lit en examinant votre adhésion."
            >
              <textarea
                name="motivation"
                rows={3}
                maxLength={1000}
                defaultValue={motivation ?? ""}
                className={INPUT}
              />
            </Field>
            <div className="grid gap-3.5 md:grid-cols-2">
              <ChampImage
                name="cover"
                label="Photo de couverture"
                hint="Le bandeau en tête de votre fiche. Format paysage."
                apercu={cover}
                ratio="aspect-[16/6]"
              />
              <ChampImage
                name="logo"
                label="Logo"
                hint="Sur fond transparent de préférence (PNG)."
                apercu={logo}
                ratio="aspect-[16/6]"
                contain
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Enregistrement…">
              <Check size={14} /> Enregistrer
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

function ChampBesoins({ initial }: { initial: string }) {
  const titre = useId();
  const [lignes, setLignes] = useState(() => {
    const saisies = initial
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
    return (saisies.length ? saisies : [""]).map((texte, id) => ({
      id,
      texte,
    }));
  });
  const [nouvelle, setNouvelle] = useState<number | null>(null);

  const champ = (id: number) => `${titre}-${id}`;
  const prochain = () => Math.max(-1, ...lignes.map((l) => l.id)) + 1;
  const plein = lignes.length >= BESOINS_PAR_FICHE;

  const ajouter = () => {
    const vide = lignes.find((l) => !l.texte.trim());
    if (vide) {
      document.getElementById(champ(vide.id))?.focus();
      return;
    }
    if (plein) return;
    const id = prochain();
    setLignes([...lignes, { id, texte: "" }]);
    setNouvelle(id);
  };

  const retirer = (id: number) => {
    const reste = lignes.filter((l) => l.id !== id);
    setLignes(reste.length ? reste : [{ id: prochain(), texte: "" }]);
  };

  const ecrire = (id: number, valeur: string) => {
    const [premiere, ...suite] = valeur.split(/\r?\n/);
    let suivant = prochain();
    setLignes(
      lignes.flatMap((l) =>
        l.id !== id
          ? [l]
          : [
              { id, texte: premiere },
              ...suite
                .filter((t) => t.trim())
                .map((texte) => ({ id: suivant++, texte })),
            ],
      ),
    );
  };

  const touche = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    ajouter();
  };

  return (
    <div role="group" aria-labelledby={titre}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span id={titre} className="text-[12.3px] font-semibold text-muted">
          Besoins actuels
        </span>
        <button
          type="button"
          onClick={ajouter}
          disabled={plein}
          className={`${BTN_LINE} text-[12.4px] px-[11px] py-1.5 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <Plus size={14} /> Ajouter
        </button>
      </div>
      <input
        type="hidden"
        name="besoins"
        value={lignes
          .map((l) => l.texte.trim())
          .filter(Boolean)
          .join("\n")}
      />
      <div className="flex flex-col gap-2">
        {lignes.map((l, i) => (
          <div key={l.id} className="flex items-start gap-2">
            <div className="grid min-w-0 flex-1">
              <div
                aria-hidden
                className={`${INPUT} invisible whitespace-pre-wrap break-words [grid-area:1/1]`}
              >
                {`${l.texte} `}
              </div>
              <textarea
                id={champ(l.id)}
                rows={1}
                value={l.texte}
                onChange={(e) => ecrire(l.id, e.target.value)}
                onKeyDown={touche}
                autoFocus={l.id === nouvelle}
                aria-label={`Besoin ${i + 1}`}
                placeholder="Ex. Un distributeur bio établi au Québec"
                className={`${INPUT} resize-none overflow-hidden [grid-area:1/1]`}
              />
            </div>
            <button
              type="button"
              onClick={() => retirer(l.id)}
              aria-label={`Retirer le besoin ${i + 1}`}
              title="Retirer"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-s)] border border-line bg-transparent text-muted hover:bg-surface-2 hover:text-bad"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <span className="mt-1 block text-[11.5px] text-faint">
        Ce que vous recherchez : partenaires, distributeurs, financement… Chaque
        besoin devient un tiret sur votre fiche.
        {plein ? ` ${BESOINS_PAR_FICHE} besoins au plus.` : null}
      </span>
    </div>
  );
}

export function AddContactButton({
  memberId,
  retour = "/membre/profil",
}: {
  memberId: string;
  retour?: string;
}) {
  return (
    <Modal
      title="Ajouter un contact"
      trigger={(ouvrir) => (
        <button
          onClick={ouvrir}
          className={`${BTN_LINE} text-[12.4px] px-[11px] py-1.5`}
        >
          <Plus size={14} /> Ajouter un contact
        </button>
      )}
    >
      {(fermer) => (
        <form action={addContact}>
          <input type="hidden" name="memberId" value={memberId} />
          <input type="hidden" name="retour" value={retour} />
          <ModalBody>
            <Field label="Nom et prénom">
              <input type="text" name="nom" required className={INPUT} />
            </Field>
            <Field label="Fonction" hint="Par exemple : Responsable export.">
              <input
                type="text"
                name="fonction"
                placeholder="Contact"
                className={INPUT}
              />
            </Field>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field
                label="Courriel"
                hint="Il recevra un lien pour choisir son mot de passe."
              >
                <input type="email" name="email" required className={INPUT} />
              </Field>
              <Field label="Téléphone">
                <input
                  type="tel"
                  name="tel"
                  placeholder="+261 34 00 000 00"
                  className={INPUT}
                />
              </Field>
            </div>
            <div className="max-w-[180px]">
              <ChampImage
                name="photo"
                label="Portrait"
                hint="Facultatif. À défaut, les initiales font l’avatar."
                apercu={null}
                ratio="aspect-square"
                rond
              />
            </div>
            <label className="flex items-start gap-2.5 mt-1 cursor-pointer">
              <input
                type="checkbox"
                name="principal"
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span className="text-[12.8px] text-muted">
                <b className="text-ink font-semibold">
                  Faire de cette personne le contact principal.
                </b>{" "}
                C’est elle que la chambre joindra en premier. L’ancien référent
                perd ce rôle, sans quitter la liste.
              </span>
            </label>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Ajout…">
              <Check size={14} /> Ajouter
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function RemoveContactButton({
  contactId,
  nom,
  retour = "/membre/profil",
}: {
  contactId: string;
  nom: string;
  retour?: string;
}) {
  return (
    <Modal
      title="Retirer ce contact"
      trigger={(ouvrir) => (
        <button
          onClick={ouvrir}
          aria-label={`Retirer ${nom}`}
          className="w-7 h-7 rounded-md border border-line bg-transparent text-faint flex items-center justify-center cursor-pointer transition-colors hover:border-bad-soft hover:text-bad shrink-0"
        >
          <Trash2 size={13} />
        </button>
      )}
    >
      {(fermer) => (
        <form action={removeContact}>
          <input type="hidden" name="contactId" value={contactId} />
          <input type="hidden" name="retour" value={retour} />
          <ModalBody>
            <p className="m-0 text-[13.6px] leading-relaxed">
              Retirer <b>{nom}</b> des contacts de l’entreprise ? La chambre ne
              pourra plus la joindre par cette fiche.
            </p>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Retrait…" variant="danger">
              <Trash2 size={14} /> Retirer
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

function ChampImage({
  name,
  label,
  hint,
  apercu,
  ratio,
  contain = false,
  rond = false,
}: {
  name: string;
  label: string;
  hint?: string;
  apercu: string | null;
  ratio: string;
  contain?: boolean;
  rond?: boolean;
}) {
  const [choisi, setChoisi] = useState<string | null>(null);

  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-col gap-2">
        <div
          className={`${ratio} w-full border border-line bg-surface-2 overflow-hidden flex items-center justify-center ${
            rond ? "rounded-full" : "rounded-[var(--radius-s)]"
          }`}
        >
          {apercu ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={apercu}
              alt=""
              className={`w-full h-full ${contain ? "object-contain p-2" : "object-cover"}`}
            />
          ) : (
            <span className="text-[11.5px] text-faint">Aucune image</span>
          )}
        </div>

        <label
          className={`${BTN_LINE} text-[12.2px] px-[11px] py-1.5 justify-center`}
        >
          <ImagePlus size={14} />
          {choisi ? "Changer" : apercu ? "Remplacer" : "Choisir une image"}
          <EntreeFichier
            name={name}
            accept="image/*"
            className="sr-only"
            onChange={(e) => setChoisi(e.target.files?.[0]?.name ?? null)}
          />
        </label>

        {choisi ? (
          <span className="text-[11.5px] text-success-strong truncate">
            {choisi}
          </span>
        ) : null}
      </div>
    </Field>
  );
}

export function EditContactButton({
  contact,
  seul,
  retour = "/membre/profil",
}: {
  contact: Contact;
  seul: boolean;
  retour?: string;
}) {
  return (
    <Modal
      title="Modifier le contact"
      trigger={(ouvrir) => (
        <button
          onClick={ouvrir}
          aria-label={`Modifier ${contact.nom}`}
          className="w-7 h-7 rounded-md border border-line bg-transparent text-faint flex items-center justify-center cursor-pointer transition-colors hover:border-accent hover:text-accent shrink-0"
        >
          <Pencil size={13} />
        </button>
      )}
    >
      {(fermer) => (
        <form action={updateContact}>
          <input type="hidden" name="contactId" value={contact.id} />
          <input type="hidden" name="retour" value={retour} />
          <ModalBody>
            <div className="flex gap-4 items-start">
              <div className="w-[120px] shrink-0">
                <ChampImage
                  name="photo"
                  label="Portrait"
                  apercu={contact.photo}
                  ratio="aspect-square"
                  rond
                />
              </div>
              <div className="flex-1 flex flex-col gap-3.5 min-w-0">
                <Field label="Nom et prénom">
                  <input
                    type="text"
                    name="nom"
                    defaultValue={contact.nom}
                    required
                    className={INPUT}
                  />
                </Field>
                <Field label="Fonction">
                  <input
                    type="text"
                    name="fonction"
                    defaultValue={contact.fonction}
                    className={INPUT}
                  />
                </Field>
              </div>
            </div>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Courriel">
                <input
                  type="email"
                  name="email"
                  defaultValue={contact.email}
                  required
                  className={INPUT}
                />
              </Field>
              <Field label="Téléphone">
                <input
                  type="tel"
                  name="tel"
                  defaultValue={contact.tel ?? ""}
                  className={INPUT}
                />
              </Field>
            </div>
            <label className="flex items-start gap-2.5 mt-1 cursor-pointer">
              <input
                type="checkbox"
                name="principal"
                defaultChecked={contact.principal}
                disabled={seul}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span className="text-[12.8px] text-muted">
                <b className="text-ink font-semibold">Contact principal.</b>{" "}
                {seul
                  ? "Seul contact de l’entreprise, cette personne le reste tant qu’une autre n’a pas été ajoutée."
                  : "L’ancien référent perd ce rôle, sans quitter la liste."}
              </span>
            </label>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Enregistrement…">
              <Check size={14} /> Enregistrer
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

function ChampGalerie({ actuelles }: { actuelles: string[] }) {
  const [retirees, setRetirees] = useState<Set<string>>(new Set());
  const [ajoutees, setAjoutees] = useState(0);

  const restantes = actuelles.length - retirees.size;
  const place = Math.max(0, PHOTOS_PAR_PRODUIT - restantes);

  const basculer = (url: string) =>
    setRetirees((avant) => {
      const apres = new Set(avant);
      if (apres.has(url)) apres.delete(url);
      else apres.add(url);
      return apres;
    });

  return (
    <Field
      label={`Photos (${restantes}/${PHOTOS_PAR_PRODUIT})`}
      hint={
        actuelles.length
          ? "Cliquez sur une photo pour la retirer. La première sert de vignette."
          : undefined
      }
    >
      <div className="flex flex-col gap-2">
        {actuelles.length ? (
          <div className="grid grid-cols-3 gap-1.5">
            {actuelles.map((url, n) => {
              const retiree = retirees.has(url);
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => basculer(url)}
                  aria-pressed={retiree}
                  aria-label={
                    retiree
                      ? `Garder la photo ${n + 1}`
                      : `Retirer la photo ${n + 1}`
                  }
                  className="relative aspect-square rounded-md overflow-hidden border border-line cursor-pointer p-0 bg-surface-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className={`w-full h-full object-cover transition-opacity ${
                      retiree ? "opacity-25 grayscale" : ""
                    }`}
                  />
                  {retiree ? (
                    <>
                      <span className="absolute inset-0 flex items-center justify-center text-bad">
                        <X size={22} strokeWidth={3} />
                      </span>
                      <input type="hidden" name="retirer" value={url} />
                    </>
                  ) : null}
                  {n === 0 && !retiree ? (
                    <span className="absolute bottom-0.5 left-0.5 text-[9px] font-bold uppercase tracking-wide bg-[#0f1d2c]/70 text-white rounded px-1">
                      Vignette
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="aspect-[4/3] rounded-[var(--radius-s)] border border-dashed border-line bg-surface-2 flex items-center justify-center text-[11.5px] text-faint">
            Aucune photo
          </div>
        )}

        {place > 0 ? (
          <label
            className={`${BTN_LINE} text-[12.2px] px-[11px] py-1.5 justify-center`}
          >
            <ImagePlus size={14} />
            {ajoutees
              ? `${ajoutees} photo${ajoutees > 1 ? "s" : ""} choisie${ajoutees > 1 ? "s" : ""}`
              : "Ajouter des photos"}
            <EntreeFichier
              name="photos"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => setAjoutees(e.target.files?.length ?? 0)}
            />
          </label>
        ) : (
          <span className="text-[11.5px] text-faint text-center">
            Galerie complète. Retirez une photo pour en ajouter.
          </span>
        )}

        {ajoutees > place ? (
          <span className="text-[11.5px] text-warn">
            Seules les {place} premières seront gardées.
          </span>
        ) : null}
      </div>
    </Field>
  );
}

function ChampsService({ produit }: { produit?: Produit }) {
  return (
    <>
      <div className="grid gap-3.5 grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_180px]">
        <Field label="Titre">
          <input
            type="text"
            name="label"
            required
            defaultValue={produit?.label}
            placeholder="Ex. Huile essentielle de ravintsara"
            className={INPUT}
          />
        </Field>
        <Field label="Nature">
          <select
            name="type"
            defaultValue={produit?.type ?? "service"}
            className={INPUT}
          >
            <option value="service">Service</option>
            <option value="produit">Produit</option>
          </select>
        </Field>
      </div>
      <Field
        label="Prix indicatif"
        hint="Facultatif. En clair : « 25 000 Ar le flacon », « À partir de 300 $ », « Sur devis »."
      >
        <input
          type="text"
          name="prix"
          defaultValue={produit?.prix ?? ""}
          className={INPUT}
        />
      </Field>
      <Field
        label="Description"
        hint="Ce que l’offre comprend, pour qui, à quelles conditions, délais."
      >
        <textarea
          name="description"
          rows={5}
          defaultValue={produit?.description ?? ""}
          className={INPUT}
        />
      </Field>
      <ChampGalerie actuelles={produit?.photos ?? []} />
    </>
  );
}

export function AjouterBesoinButton({
  memberId,
  retour = "/membre/profil",
}: {
  memberId: string;
  retour?: string;
}) {
  return (
    <Modal
      title="Ajouter un besoin"
      trigger={(ouvrir) => (
        <button
          onClick={ouvrir}
          className={`${BTN_LINE} text-[12.4px] px-[11px] py-1.5`}
        >
          <Plus size={14} /> Ajouter
        </button>
      )}
    >
      {(fermer) => (
        <form action={ajouterBesoin}>
          <input type="hidden" name="memberId" value={memberId} />
          <input type="hidden" name="retour" value={retour} />
          <ModalBody>
            <Field
              label="Ce que vous recherchez"
              hint="Une phrase : elle devient un tiret sous « Recherche actuellement »."
            >
              <input
                type="text"
                name="besoin"
                required
                maxLength={200}
                autoFocus
                placeholder="Ex. Un distributeur bio établi au Québec"
                className={INPUT}
              />
            </Field>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Ajout…">
              <Check size={14} /> Ajouter
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function AjouterServiceButton({
  memberId,
  retour = "/membre/profil",
}: {
  memberId: string;
  retour?: string;
}) {
  return (
    <Modal
      wide
      title="Ajouter une offre"
      trigger={(ouvrir) => (
        <button
          onClick={ouvrir}
          className={`${BTN_LINE} text-[12.4px] px-[11px] py-1.5`}
        >
          <Plus size={14} /> Ajouter
        </button>
      )}
    >
      {(fermer) => (
        <form action={ajouterService}>
          <input type="hidden" name="memberId" value={memberId} />
          <input type="hidden" name="retour" value={retour} />
          <ModalBody>
            <ChampsService />
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Ajout…">
              <Check size={14} /> Ajouter
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function ModifierServiceButton({
  produit,
  retour = "/membre/profil",
}: {
  produit: Produit;
  retour?: string;
}) {
  return (
    <Modal
      wide
      title="Modifier l’offre"
      trigger={(ouvrir) => (
        <button
          onClick={ouvrir}
          className={`${BTN_LINE} text-[12.4px] px-[11px] py-1.5`}
        >
          <Pencil size={13} /> Modifier
        </button>
      )}
    >
      {(fermer) => (
        <form action={modifierService}>
          <input type="hidden" name="produitId" value={produit.id} />
          <input type="hidden" name="retour" value={retour} />
          <ModalBody>
            <ChampsService produit={produit} />
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Enregistrement…">
              <Check size={14} /> Enregistrer
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function SupprimerServiceButton({
  produitId,
  label,
  retour = "/membre/profil",
}: {
  produitId: string;
  label: string;
  retour?: string;
}) {
  return (
    <Modal
      title="Retirer cette offre"
      trigger={(ouvrir) => (
        <button
          onClick={ouvrir}
          className="inline-flex items-center gap-[7px] rounded-[var(--radius-s)] font-semibold cursor-pointer border border-bad-soft bg-transparent text-bad hover:bg-surface-2 text-[12.4px] px-[11px] py-1.5"
        >
          <Trash2 size={13} /> Retirer
        </button>
      )}
    >
      {(fermer) => (
        <form action={supprimerService}>
          <input type="hidden" name="produitId" value={produitId} />
          <input type="hidden" name="retour" value={retour} />
          <ModalBody>
            <p className="m-0 text-[13.6px] leading-relaxed">
              Retirer <b>{label}</b> du catalogue ? Elle disparaîtra de la fiche
              et de l’annuaire.
            </p>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Retrait…" variant="danger">
              <Trash2 size={14} /> Retirer
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function ModifierReglementButton({
  memberId,
  nom,
  date,
}: {
  memberId: string;
  nom: string;
  date: string;
}) {
  return (
    <Modal
      title="Date du dernier règlement"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          aria-label={`Modifier la date du dernier règlement de ${nom}`}
          title="Modifier la date du règlement"
          className="shrink-0 w-6 h-6 rounded-[var(--radius-s)] border border-line bg-surface flex items-center justify-center text-muted cursor-pointer hover:text-ink hover:border-faint"
        >
          <Pencil size={12} />
        </button>
      )}
    >
      {(fermer) => (
        <form action={modifierDateReglement}>
          <input type="hidden" name="memberId" value={memberId} />
          <ModalBody>
            <Field
              label="Cotisation réglée le"
              hint="Le renouvellement suit : un an après cette date, jour pour jour. La facture correspondante est corrigée avec elle."
            >
              <input
                type="date"
                name="date"
                required
                defaultValue={date}
                className={INPUT}
              />
            </Field>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Enregistrement…">
              <Check size={14} /> Enregistrer
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function ModifierFormuleButton({
  memberId,
  nom,
  formule,
  formules,
}: {
  memberId: string;
  nom: string;
  formule: string | null;
  formules: Formule[];
}) {
  return (
    <Modal
      title="Formule d’adhésion"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          aria-label={`Modifier la formule de ${nom}`}
          title="Modifier la formule"
          className="shrink-0 w-6 h-6 rounded-[var(--radius-s)] border border-line bg-surface flex items-center justify-center text-muted cursor-pointer hover:text-ink hover:border-faint"
        >
          <Pencil size={12} />
        </button>
      )}
    >
      {(fermer) => (
        <form action={modifierFormule}>
          <input type="hidden" name="memberId" value={memberId} />
          <ModalBody>
            <Field
              label="Formule"
              hint="Elle fixe le montant attendu et la devise des prochaines factures. Les factures déjà émises ne bougent pas."
            >
              <select
                name="formule"
                required
                defaultValue={formule ?? ""}
                className={INPUT}
              >
                <OptionsFormules formules={formules} vide="Aucune formule choisie" />
              </select>
            </Field>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Enregistrement…">
              <Check size={14} /> Enregistrer
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function ModifierAdhesionButton({
  memberId,
  nom,
  adhesion,
}: {
  memberId: string;
  nom: string;
  adhesion: string;
}) {
  return (
    <Modal
      title="Date d’adhésion"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          aria-label={`Modifier la date d’adhésion de ${nom}`}
          title="Modifier la date d’adhésion"
          className="shrink-0 w-6 h-6 rounded-[var(--radius-s)] border border-line bg-surface flex items-center justify-center text-muted cursor-pointer hover:text-ink hover:border-faint"
        >
          <Pencil size={12} />
        </button>
      )}
    >
      {(fermer) => (
        <form action={modifierDateAdhesion}>
          <input type="hidden" name="memberId" value={memberId} />
          <ModalBody>
            <Field
              label="Membre depuis"
              hint="Elle fixe l’ancienneté affichée, et le renouvellement tant qu’aucune cotisation n’est réglée."
            >
              <input
                type="date"
                name="adhesion"
                required
                defaultValue={adhesion}
                className={INPUT}
              />
            </Field>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Enregistrement…">
              <Check size={14} /> Enregistrer
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
