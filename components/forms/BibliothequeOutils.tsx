"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  CheckSquare,
  ClipboardPaste,
  Copy,
  Eye,
  MoreVertical,
  Pencil,
  Scissors,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { INPUT } from "@/components/champ-style";
import { CancelButton, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import { ilYa } from "@/components/admin/LigneJournal";
import {
  annulerPressePapier,
  collerRessources,
  couperRessources,
  deplacerRessource,
  mettreUneAuPressePapier,
  ouvrirAccesPour,
  ouvrirAccesRessources,
  retirerAccesPour,
} from "@/lib/actions/content";

export type MembreChoisissable = { id: string; nom: string; statut: string };

export type AccesOuvert = {
  memberId: string;
  nom: string;
  ouvertPar: string;
  date: string;
};

const BTN_CARTE =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-s)] border border-line bg-surface text-muted hover:border-faint hover:text-ink";

export function MenuRessource({
  id,
  titre,
  dossierId,
  rangement = true,
}: {
  id: string;
  titre: string;
  dossierId: string | null;
  rangement?: boolean;
}) {
  const [enCours, demarrer] = useTransition();

  return (
    <Modal
      title="Que faire de cette ressource ?"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          disabled={enCours}
          aria-label={`Actions sur « ${titre} »`}
          title="Autres actions"
          className={BTN_CARTE}
        >
          <MoreVertical size={15} />
        </button>
      )}
    >
      {(fermer) => (
        <>
          <ModalBody>
            <p className="m-0 text-[13.4px] text-muted">{titre}</p>
            <div className="grid gap-2">
              <Choix
                icone={<Copy size={16} />}
                titre="Copier"
                detail="Ouvrez ensuite un dossier, puis « Coller ici ». La ressource et ses fichiers sont dupliqués."
                onClick={() => {
                  fermer();
                  demarrer(() => {
                    void mettreUneAuPressePapier(id, "copier", dossierId);
                  });
                }}
              />
              <Choix
                icone={<Scissors size={16} />}
                titre="Couper"
                detail="Ouvrez ensuite un dossier, puis « Coller ici ». La ressource y est déplacée."
                onClick={() => {
                  fermer();
                  demarrer(() => {
                    void mettreUneAuPressePapier(id, "couper", dossierId);
                  });
                }}
              />
              {rangement ? (
                <>
                  <Choix
                    icone={<ArrowUpToLine size={16} />}
                    titre="Mettre en premier"
                    detail="Elle passe en tête des ressources de son dossier."
                    onClick={() => {
                      fermer();
                      demarrer(() => {
                        void deplacerRessource(id, "premier");
                      });
                    }}
                  />
                  <Choix
                    icone={<ArrowDownToLine size={16} />}
                    titre="Mettre en dernier"
                    detail="Elle passe au bout des ressources de son dossier."
                    onClick={() => {
                      fermer();
                      demarrer(() => {
                        void deplacerRessource(id, "dernier");
                      });
                    }}
                  />
                </>
              ) : null}
              <Link
                href={`/admin/ressources/${id}/modifier`}
                className="flex items-start gap-3 rounded-[var(--radius-m)] border border-line bg-surface px-4 py-3 text-left no-underline hover:border-faint hover:bg-surface-2"
              >
                <span className="mt-px shrink-0 text-accent">
                  <Pencil size={16} />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-ink">
                    Modifier
                  </span>
                  <span className="block text-[12.4px] text-muted">
                    Titre, catégorie, prix, dossier, fichier.
                  </span>
                </span>
              </Link>
            </div>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

function Choix({
  icone,
  titre,
  detail,
  onClick,
}: {
  icone: React.ReactNode;
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

export function BoutonAcces({
  resourceId,
  titre,
  acces,
  membres,
}: {
  resourceId: string;
  titre: string;
  acces: AccesOuvert[];
  membres: MembreChoisissable[];
}) {
  return (
    <Modal
      title="Qui a accès à cette ressource"
      largeur="max-w-[620px]"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          aria-label={`Qui a accès à « ${titre} »`}
          title="Qui y a accès"
          className={BTN_CARTE}
        >
          <Eye size={15} />
        </button>
      )}
    >
      {(fermer) => (
        <ContenuAcces
          resourceId={resourceId}
          titre={titre}
          acces={acces}
          membres={membres}
          fermer={fermer}
        />
      )}
    </Modal>
  );
}

function ContenuAcces({
  resourceId,
  titre,
  acces,
  membres,
  fermer,
}: {
  resourceId: string;
  titre: string;
  acces: AccesOuvert[];
  membres: MembreChoisissable[];
  fermer: () => void;
}) {
  const [enCours, demarrer] = useTransition();
  const [q, setQ] = useState("");
  const [choisis, setChoisis] = useState<string[]>([]);

  const ouverts = new Set(acces.map((a) => a.memberId));
  const filtre = q.trim().toLowerCase();
  const liste = membres
    .filter((m) => !ouverts.has(m.id))
    .filter((m) => !filtre || m.nom.toLowerCase().includes(filtre));

  const basculer = (id: string) =>
    setChoisis((v) =>
      v.includes(id) ? v.filter((x) => x !== id) : [...v, id],
    );

  return (
    <>
      <ModalBody>
        <p className="m-0 text-[13.4px] text-muted">{titre}</p>

        <div className="rounded-[var(--radius-m)] border border-line">
          <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <Users size={15} className="text-accent" />
            <span className="text-[13.4px] font-semibold text-ink">
              {acces.length} entreprise{acces.length > 1 ? "s" : ""} y{" "}
              {acces.length > 1 ? "ont" : "a"} accès
            </span>
          </div>
          {acces.length ? (
            <ul className="m-0 max-h-[180px] list-none overflow-y-auto p-0">
              {acces.map((a) => (
                <li
                  key={a.memberId}
                  className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.4px] font-semibold text-ink">
                      {a.nom}
                    </span>
                    <span className="block text-[11.8px] text-faint">
                      Ouvert par {a.ouvertPar} · {ilYa(a.date)}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={enCours}
                    onClick={() =>
                      demarrer(() => {
                        void retirerAccesPour(resourceId, a.memberId);
                      })
                    }
                    aria-label={`Retirer l’accès de ${a.nom}`}
                    title="Retirer"
                    className="shrink-0 cursor-pointer border-0 bg-transparent p-1 text-faint hover:text-accent"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 px-4 py-5 text-center text-[13px] text-muted">
              Personne n’y a encore accès.
            </p>
          )}
        </div>

        <label className="relative block">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Chercher une entreprise à ajouter…"
            className={`${INPUT} pl-9`}
          />
        </label>

        <div className="max-h-[220px] overflow-y-auto rounded-[var(--radius-m)] border border-line">
          {liste.length ? (
            liste.map((m) => (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-3 border-b border-line px-3.5 py-2.5 text-[13.4px] last:border-b-0 hover:bg-surface-2"
              >
                <input
                  type="checkbox"
                  checked={choisis.includes(m.id)}
                  onChange={() => basculer(m.id)}
                  className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                />
                <span className="min-w-0 flex-1 truncate">{m.nom}</span>
                {m.statut !== "a_jour" ? (
                  <span className="shrink-0 text-[11.5px] text-faint">
                    cotisation en retard
                  </span>
                ) : null}
              </label>
            ))
          ) : (
            <p className="m-0 px-4 py-5 text-center text-[13px] text-muted">
              {filtre
                ? "Aucune entreprise ne correspond."
                : "Toutes les entreprises y ont déjà accès."}
            </p>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <CancelButton onClick={fermer} />
        <button
          type="button"
          disabled={enCours || !choisis.length}
          onClick={() =>
            demarrer(() => {
              void ouvrirAccesPour(resourceId, choisis);
              setChoisis([]);
            })
          }
          className="btn-action btn-action-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UserPlus size={15} />
          {choisis.length
            ? `Ouvrir l’accès à ${choisis.length} entreprise${choisis.length > 1 ? "s" : ""}`
            : "Ouvrir l’accès"}
        </button>
      </ModalFooter>
    </>
  );
}

export function BarrePressePapier({
  nombre,
  mode,
}: {
  nombre: number;
  mode: "copier" | "couper";
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-m)] border border-dashed border-accent/50 bg-accent-soft px-4 py-3">
      <span className="text-[13.2px] text-ink">
        <b>
          {nombre} ressource{nombre > 1 ? "s" : ""}
        </b>{" "}
        {mode === "couper" ? "à déplacer" : "à copier"}.
      </span>
      <div className="ml-auto flex items-center gap-2">
        <SubmitButton sm formAction={collerRessources} pendingLabel="Collage…">
          <ClipboardPaste size={14} /> Coller ici
        </SubmitButton>
        <SubmitButton
          sm
          variant="ghost"
          formAction={annulerPressePapier}
          pendingLabel="…"
        >
          <X size={14} /> Annuler
        </SubmitButton>
      </div>
    </div>
  );
}

export function BarreSelection({
  membres,
  dossierId,
}: {
  membres: MembreChoisissable[];
  dossierId: string | null;
}) {
  const [tout, setTout] = useState(false);

  const basculerTout = () => {
    const valeur = !tout;
    document
      .querySelectorAll<HTMLInputElement>('input[name="ressource"]')
      .forEach((c) => (c.checked = valeur));
    setTout(valeur);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-m)] border border-line bg-surface-2 px-4 py-2.5">
      <button
        type="button"
        onClick={basculerTout}
        className="inline-flex items-center gap-1.5 rounded-[var(--radius-s)] border border-line bg-surface px-3 py-1.5 text-[12.6px] font-semibold text-ink hover:border-faint"
      >
        <CheckSquare size={14} />
        {tout ? "Tout décocher" : "Tout sélectionner"}
      </button>
      <span className="mx-1 text-[12.6px] text-muted">puis :</span>
      <SubmitButton sm variant="line" pendingLabel="…">
        <Copy size={14} /> Copier
      </SubmitButton>
      <SubmitButton
        sm
        variant="line"
        formAction={couperRessources}
        pendingLabel="…"
      >
        <Scissors size={14} /> Couper
      </SubmitButton>
      <BoutonOuvrirAcces membres={membres} dossierId={dossierId} />
    </div>
  );
}

function BoutonOuvrirAcces({
  membres,
  dossierId,
}: {
  membres: MembreChoisissable[];
  dossierId: string | null;
}) {
  const [q, setQ] = useState("");
  const filtre = q.trim().toLowerCase();
  const liste = filtre
    ? membres.filter((m) => m.nom.toLowerCase().includes(filtre))
    : membres;

  return (
    <Modal
      title="Ouvrir l’accès à des entreprises"
      largeur="max-w-[620px]"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-s)] border border-line bg-surface px-3 py-1.5 text-[12.6px] font-semibold text-ink hover:border-faint"
        >
          <UserPlus size={14} /> Ouvrir un accès
        </button>
      )}
    >
      {(fermer) => (
        <>
          <ModalBody>
            <input type="hidden" name="dossier" value={dossierId ?? ""} />
            <p className="m-0 text-[13px] text-muted">
              L’accès s’ouvre pour toutes les ressources cochées. Les ressources
              incluses dans l’adhésion sont écartées : tout membre à jour les
              lit déjà.
            </p>

            <label className="relative block">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Chercher une entreprise…"
                className={`${INPUT} pl-9`}
              />
            </label>

            <div className="max-h-[320px] overflow-y-auto rounded-[var(--radius-m)] border border-line">
              {liste.length ? (
                liste.map((m) => (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-line px-3.5 py-2.5 text-[13.4px] last:border-b-0 hover:bg-surface-2"
                  >
                    <input
                      type="checkbox"
                      name="membre"
                      value={m.id}
                      className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                    />
                    <span className="min-w-0 flex-1 truncate">{m.nom}</span>
                    {m.statut !== "a_jour" ? (
                      <span className="shrink-0 text-[11.5px] text-faint">
                        cotisation en retard
                      </span>
                    ) : null}
                  </label>
                ))
              ) : (
                <p className="m-0 px-4 py-6 text-center text-[13px] text-muted">
                  Aucune entreprise ne correspond.
                </p>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton
              formAction={ouvrirAccesRessources}
              pendingLabel="Ouverture…"
            >
              <UserPlus size={15} /> Ouvrir l’accès
            </SubmitButton>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
