"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  CalendarDays,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  Send,
  ShieldCheck,
  ShieldOff,
  UserPlus,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { INPUT } from "@/components/champ-style";
import { CancelButton, Field, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import {
  changerNiveauEquipe,
  creerCompteEquipe,
  promouvoirAdmin,
  retirerAdmin,
} from "@/lib/actions/equipe";
import { Pastille } from "@/components/messagerie/outils";
import { Pill } from "@/components/ui";
import { initialesDe } from "@/lib/avatars";
import { NIVEAU_EQUIPE_LABEL } from "@/lib/enums";
import { fmtDate } from "@/lib/format";
import type { CompteEquipe } from "@/lib/queries-admin";
import type { NiveauEquipe } from "@/lib/types";

const DROITS: Record<NiveauEquipe, string> = {
  administrateur:
    "Contrôle total, y compris ouvrir et retirer les accès de l’équipe.",
  manager: "Tout le back-office, sauf la gestion de l’équipe.",
};

function ChoixNiveau({ defaut = "manager" }: { defaut?: NiveauEquipe }) {
  return (
    <fieldset className="m-0 p-0 border-0 min-w-0">
      <legend className="text-[12.8px] font-semibold text-ink mb-1.5 p-0">
        Rôle
      </legend>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {(["administrateur", "manager"] as const).map((n) => (
          <label
            key={n}
            className="flex gap-2.5 items-start rounded-[var(--radius-s)] border border-line bg-surface px-3.5 py-3 cursor-pointer hover:border-faint has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
          >
            <input
              type="radio"
              name="niveau"
              value={n}
              defaultChecked={n === defaut}
              className="mt-0.5 w-4 h-4 accent-[var(--accent)] cursor-pointer shrink-0"
            />
            <span>
              <span className="block text-[13.4px] font-semibold text-ink">
                {NIVEAU_EQUIPE_LABEL[n]}
              </span>
              <span className="block text-[12.3px] text-muted mt-0.5">
                {DROITS[n]}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FormulaireNouvelEquipier() {
  return (
    <form action={creerCompteEquipe} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Adresse e-mail">
          <input
            type="email"
            name="email"
            required
            autoComplete="off"
            placeholder="prenom@cancham.mg"
            className={INPUT}
          />
        </Field>
        <Field label="Fonction">
          <input
            name="fonction"
            required
            maxLength={80}
            placeholder="Ex. Chargée des adhésions"
            className={INPUT}
          />
        </Field>
      </div>
      <ChoixNiveau />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="m-0 text-[12.5px] text-muted max-w-[46ch]">
          Un e-mail lui envoie son identifiant et un mot de passe provisoire, à
          changer depuis « Mon profil ».
        </p>
        <SubmitButton pendingLabel="Création…">
          <Send size={14} /> Créer et envoyer les accès
        </SubmitButton>
      </div>
    </form>
  );
}

export function PromouvoirButton({
  userId,
  nom,
  email,
  entreprise,
  ficheEffacable,
}: {
  userId: string;
  nom: string;
  email: string;
  entreprise?: string | null;
  ficheEffacable?: boolean;
}) {
  return (
    <Modal
      title="Ajouter à l’équipe"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          className="btn-action btn-action-sm"
        >
          <ShieldCheck size={14} /> Promouvoir
        </button>
      )}
    >
      {(fermer) => (
        <form action={promouvoirAdmin}>
          <input type="hidden" name="userId" value={userId} />
          <ModalBody>
            <p className="text-[13.6px] text-muted m-0 mb-4">
              <b className="text-ink">{nom}</b> ({email}) aura accès au
              back-office : membres, paiements, événements, messagerie et
              journal d’activité.
            </p>
            <ChoixNiveau />
            {ficheEffacable ? (
              <label className="flex gap-2.5 items-start mt-4 text-[13.4px] text-ink cursor-pointer">
                <input
                  type="checkbox"
                  name="supprimerFiche"
                  value="1"
                  defaultChecked
                  className="mt-0.5 w-4 h-4 accent-[var(--accent)] cursor-pointer"
                />
                <span>
                  Supprimer la candidature
                  {entreprise ? ` « ${entreprise} »` : ""} créée à son
                  inscription.
                  <span className="block text-[12.5px] text-muted mt-0.5">
                    Elle est vide : ni facture, ni inscription à un événement,
                    ni produit. Sans cela, elle resterait dans les demandes à
                    examiner.
                  </span>
                </span>
              </label>
            ) : entreprise ? (
              <p className="text-[12.8px] text-muted m-0 mt-3">
                Son compte reste rattaché à « {entreprise} » : la fiche de
                l’entreprise n’est pas touchée.
              </p>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Promotion…">
              <ShieldCheck size={14} /> Promouvoir
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function RetirerAdminButton({
  userId,
  nom,
  entreprise,
}: {
  userId: string;
  nom: string;
  entreprise?: string | null;
}) {
  return (
    <Modal
      title="Retirer l’accès à l’équipe"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          className="btn-contour btn-contour-sm text-ink hover:bg-surface-2"
        >
          <ShieldOff size={14} /> Retirer l’accès
        </button>
      )}
    >
      {(fermer) => (
        <form action={retirerAdmin}>
          <input type="hidden" name="userId" value={userId} />
          <ModalBody>
            <p className="text-[13.6px] text-muted m-0">
              <b className="text-ink">{nom}</b> n’aura plus accès au
              back-office.{" "}
              {entreprise
                ? `Son compte redevient un compte membre de « ${entreprise} ».`
                : "Son compte est conservé, sans accès : ses messages et ses traces au journal restent lisibles."}
            </p>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton variant="danger" pendingLabel="Retrait…">
              <ShieldOff size={14} /> Retirer l’accès
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function ChangerNiveauButton({
  userId,
  nom,
  niveau,
}: {
  userId: string;
  nom: string;
  niveau: NiveauEquipe;
}) {
  const cible: NiveauEquipe =
    niveau === "administrateur" ? "manager" : "administrateur";
  const libelle = NIVEAU_EQUIPE_LABEL[cible].toLowerCase();
  return (
    <Modal
      title={`Passer en ${libelle}`}
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          className="btn-contour btn-contour-sm text-ink hover:bg-surface-2"
        >
          <ArrowLeftRight size={14} /> Passer en {libelle}
        </button>
      )}
    >
      {(fermer) => (
        <form action={changerNiveauEquipe}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="niveau" value={cible} />
          <ModalBody>
            <p className="text-[13.6px] text-muted m-0">
              <b className="text-ink">{nom}</b> devient {libelle} :{" "}
              {DROITS[cible].charAt(0).toLowerCase() + DROITS[cible].slice(1)}
            </p>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Enregistrement…">
              <ArrowLeftRight size={14} /> Passer en {libelle}
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

function Detail({
  icone,
  cle,
  children,
}: {
  icone: React.ReactNode;
  cle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-line last:border-b-0">
      <span className="text-faint shrink-0 mt-px">{icone}</span>
      <dt className="text-[12.8px] text-muted w-[112px] shrink-0">{cle}</dt>
      <dd className="m-0 text-[13.2px] text-ink min-w-0 break-words">
        {children}
      </dd>
    </div>
  );
}

export function CarteEquipier({
  compte: a,
  cestMoi,
  gere,
  superAdmin = false,
}: {
  compte: CompteEquipe;
  cestMoi: boolean;
  gere: boolean;
  /** Le plus ancien administrateur : son compte est offert dans l'abonnement */
  superAdmin?: boolean;
}) {
  const pastilles = (
    <>
      <Pill tone={a.niveau === "administrateur" ? "ok" : "muted"}>
        {NIVEAU_EQUIPE_LABEL[a.niveau]}
      </Pill>
      {superAdmin ? <Pill tone="info">Super admin · offert</Pill> : null}
      {cestMoi ? <Pill>Vous</Pill> : null}
      {a.sansMotDePasse ? <Pill tone="warn">Jamais connecté</Pill> : null}
    </>
  );
  return (
    <Modal
      title="Profil"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          aria-haspopup="dialog"
          className="w-full flex items-center gap-3 px-2 py-3 bg-transparent border-0 text-left cursor-pointer min-w-0 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Pastille
            src={a.photo}
            alt=""
            initiales={initialesDe(a.nom)}
            taille={40}
            className="bg-navy-soft text-navy"
          />
          <span className="min-w-0 flex-1 basis-0 block">
            <span className="flex items-center gap-2 flex-wrap">
              <span className="text-[14.5px] font-semibold text-ink">
                {a.nom}
              </span>
              {pastilles}
            </span>
            <span className="block text-[12.8px] text-muted truncate">
              {a.fonction}
              <span className="md:hidden"> · {a.email}</span>
            </span>
          </span>
          <span className="hidden md:block flex-1 basis-0 min-w-0 text-[13px] text-muted truncate">
            {a.email}
          </span>
          <span className="hidden lg:block w-[150px] shrink-0 text-[13px] text-muted tabular-nums">
            {a.tel ?? <span className="text-faint">—</span>}
          </span>
          <span className="hidden sm:block w-[120px] shrink-0 text-right text-[12.5px] text-faint">
            Depuis le {fmtDate(a.depuis, { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </button>
      )}
    >
      {() => (
        <>
          <ModalBody>
            <div className="flex items-center gap-4">
              <Pastille
                src={a.photo}
                alt=""
                initiales={initialesDe(a.nom)}
                taille={72}
                className="bg-navy-soft text-navy"
              />
              <div className="min-w-0">
                <div className="text-[18px] font-semibold text-ink font-[family-name:var(--font-display)]">
                  {a.nom}
                </div>
                <div className="text-[13.4px] text-muted">{a.fonction}</div>
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {pastilles}
                </div>
              </div>
            </div>
            <dl className="m-0 flex flex-col">
              <Detail icone={<Mail size={15} />} cle="Adresse courriel">
                <a
                  href={`mailto:${a.email}`}
                  className="text-ink no-underline hover:underline"
                >
                  {a.email}
                </a>
              </Detail>
              <Detail icone={<Phone size={15} />} cle="Téléphone">
                {a.tel ? (
                  <a
                    href={`tel:${a.tel.replace(/\s/g, "")}`}
                    className="text-ink no-underline hover:underline"
                  >
                    {a.tel}
                  </a>
                ) : (
                  <span className="text-faint">Non renseigné</span>
                )}
              </Detail>
              <Detail icone={<ShieldCheck size={15} />} cle="Rôle">
                <b className="font-semibold">{NIVEAU_EQUIPE_LABEL[a.niveau]}</b>{" "}
                <span className="text-muted">— {DROITS[a.niveau]}</span>
              </Detail>
              <Detail icone={<CalendarDays size={15} />} cle="Dans l’équipe">
                Depuis le {fmtDate(a.depuis)}
              </Detail>
              {a.sansMotDePasse ? (
                <Detail icone={<KeyRound size={15} />} cle="Connexion">
                  <span className="text-muted">
                    Aucune connexion pour l’instant : son mot de passe n’a pas
                    encore été choisi.
                  </span>
                </Detail>
              ) : null}
            </dl>
          </ModalBody>
          {gere && !cestMoi ? (
            <ModalFooter>
              <ChangerNiveauButton
                userId={a.id}
                nom={a.nom}
                niveau={a.niveau}
              />
              <RetirerAdminButton userId={a.id} nom={a.nom} />
            </ModalFooter>
          ) : cestMoi ? (
            <ModalFooter>
              <Link
                href="/admin/profil"
                className="btn-contour btn-contour-sm text-ink hover:bg-surface-2 no-underline"
              >
                <Pencil size={14} /> Modifier mon profil
              </Link>
            </ModalFooter>
          ) : null}
        </>
      )}
    </Modal>
  );
}

// « Ajouter un utilisateur » (Abonnement & utilisateurs) : le formulaire de création de compte, dans une fenêtre
export function AjouterUtilisateur() {
  return (
    <Modal
      title="Ajouter un utilisateur"
      wide
      trigger={(ouvrir) => (
        <button type="button" onClick={ouvrir} className="btn-action btn-action-sm">
          <UserPlus size={15} /> Ajouter un utilisateur
        </button>
      )}
    >
      {() => (
        <div className="px-5 py-5">
          <FormulaireNouvelEquipier />
        </div>
      )}
    </Modal>
  );
}
