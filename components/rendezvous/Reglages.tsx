"use client";

import { useRef, useState } from "react";
import { Check, Copy, Link2, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { INPUT } from "@/components/champ-style";
import { CancelButton, FermerApresEnvoi, Field, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import {
  enregistrerPersonneRdv,
  enregistrerTypeRendezvous,
  supprimerTypeRendezvous,
} from "@/lib/actions/rendezvous";
import { enMinutes, estHeure } from "@/lib/agenda";
import { COULEURS_TYPE, JOURS_SEMAINE, LIEUX, PRIX_SUGGERES } from "@/lib/rendezvous";
import type { TypeRendezvous } from "@/lib/rendezvous-donnees";

// Les personnes de l'équipe qu'on peut choisir pour recevoir un type de rendez-vous
export interface PersonneChoix {
  id: string;
  nom: string;
  specialite: string | null;
  recoit: boolean;
}

interface Ligne {
  jour: number;
  debut: string;
  fin: string;
}

export function LienRendezvous({
  lien,
  titre,
}: {
  lien: string;
  titre: string;
}) {
  const [copie, setCopie] = useState(false);
  const champ = useRef<HTMLInputElement>(null);

  const copier = async () => {
    let fait = false;
    try {
      await navigator.clipboard.writeText(lien);
      fait = true;
    } catch {
      champ.current?.select();
      try {
        fait = document.execCommand("copy");
      } catch {}
    }
    if (!fait) return;
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  };

  return (
    <div className="mt-2 flex items-center gap-1.5 rounded-[var(--radius-s)] border border-line bg-surface-2 py-1 pl-2.5 pr-1">
      <Link2 size={13} className="shrink-0 text-faint" aria-hidden />
      <input
        ref={champ}
        readOnly
        value={lien}
        aria-label={`Lien du rendez-vous « ${titre} »`}
        onFocus={(e) => e.target.select()}
        className="min-w-0 flex-1 truncate border-0 bg-transparent p-0 font-[family-name:var(--font-mono)] text-[11.5px] text-muted outline-none"
      />
      <button
        type="button"
        onClick={copier}
        aria-label={`Copier le lien du rendez-vous « ${titre} »`}
        className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-[var(--radius-s)] border border-line bg-surface px-2 py-1 text-[11.8px] font-semibold text-ink hover:border-faint"
      >
        {copie ? (
          <>
            <Check size={12} className="text-success-strong" /> Copié
          </>
        ) : (
          <>
            <Copy size={12} /> Copier
          </>
        )}
      </button>
    </div>
  );
}

export function NouveauType({ personnes, carte = false }: { personnes: PersonneChoix[]; carte?: boolean }) {
  return (
    <Modal
      title="Créer un type de rendez-vous"
      trigger={(ouvrir) =>
        carte ? (
          <button
            type="button"
            onClick={ouvrir}
            className="min-h-[220px] w-full rounded-[var(--radius-m)] border-2 border-dashed border-line bg-transparent text-muted hover:text-accent hover:border-accent cursor-pointer flex flex-col items-center justify-center gap-1.5 p-5"
          >
            <Plus size={22} />
            <b className="text-[14px]">Créer un type de rendez-vous</b>
            <span className="text-[12.5px]">Durée, visio ou présentiel, heures d’accueil</span>
          </button>
        ) : (
          <button type="button" onClick={ouvrir} className="btn-action btn-action-sm">
            <Plus size={15} /> Créer un type de rendez-vous
          </button>
        )
      }
    >
      {(fermer) => <FormulaireType fermer={fermer} personnes={personnes} />}
    </Modal>
  );
}

export function ModifierType({ type, personnes }: { type: TypeRendezvous; personnes: PersonneChoix[] }) {
  return (
    <Modal
      title="Modifier le type de rendez-vous"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          aria-label={`Modifier « ${type.titre} »`}
          title="Modifier"
          className="w-8 h-8 shrink-0 rounded-[var(--radius-s)] border border-line bg-surface text-muted hover:text-ink hover:bg-surface-2 flex items-center justify-center cursor-pointer"
        >
          <Pencil size={14} />
        </button>
      )}
    >
      {(fermer) => <FormulaireType type={type} fermer={fermer} personnes={personnes} />}
    </Modal>
  );
}

function FormulaireType({
  type,
  fermer,
  personnes,
}: {
  type?: TypeRendezvous;
  fermer: () => void;
  personnes: PersonneChoix[];
}) {
  const [couleur, setCouleur] = useState(type?.couleur ?? COULEURS_TYPE[0]);
  const [confirmer, setConfirmer] = useState(false);
  const [duree, setDuree] = useState(type?.duree ?? 30);
  const [plages, setPlages] = useState<Ligne[]>(
    type?.plages.length
      ? type.plages.map((p) => ({ jour: p.jour, debut: p.debut, fin: p.fin }))
      : [{ jour: 1, debut: "09:00", fin: "12:00" }],
  );

  const changer = (i: number, champ: keyof Ligne, valeur: string | number) =>
    setPlages((l) =>
      l.map((p, n) => (n === i ? { ...p, [champ]: valeur } : p)),
    );

  if (confirmer && type) {
    return (
      <form action={supprimerTypeRendezvous}>
        <input type="hidden" name="typeId" value={type.id} />
        <FermerApresEnvoi fermer={fermer} />
        <ModalBody>
          <p className="m-0 text-[14px]">
            Retirer <strong>« {type.titre} »</strong> des rendez-vous proposés ?
          </p>
          <p className="m-0 text-[13px] text-muted">
            Des rendez-vous déjà pris s’y rattachent peut-être : dans ce cas il
            est masqué plutôt que supprimé, et leur historique reste lisible.
          </p>
        </ModalBody>
        <ModalFooter>
          <CancelButton onClick={() => setConfirmer(false)} />
          <SubmitButton variant="danger" pendingLabel="Retrait…">
            <Trash2 size={14} /> Retirer
          </SubmitButton>
        </ModalFooter>
      </form>
    );
  }

  return (
    <form action={enregistrerTypeRendezvous}>
      {type ? <input type="hidden" name="typeId" value={type.id} /> : null}
      <input type="hidden" name="plages" value={JSON.stringify(plages)} />
      <FermerApresEnvoi fermer={fermer} />
      <ModalBody>
        <Field label="Titre">
          <input
            name="titre"
            required
            maxLength={80}
            defaultValue={type?.titre}
            placeholder="Ex. Entretien d’accompagnement"
            className={INPUT}
          />
        </Field>
        <Field
          label="Précision"
          hint="Facultatif : ce que le membre lit sous le titre."
        >
          <input
            name="detail"
            maxLength={200}
            defaultValue={type?.detail ?? ""}
            placeholder="Ex. Un point sur votre projet d’export"
            className={INPUT}
          />
        </Field>
        <Field
          label="Durée (minutes)"
          hint="Elle découpe les heures d’accueil en créneaux."
        >
          <input
            type="number"
            name="duree"
            required
            min={10}
            max={240}
            step={5}
            value={duree}
            onChange={(e) => setDuree(Number(e.target.value))}
            className={INPUT}
          />
        </Field>

        <Field label="Personne qui reçoit" hint="Ses rendez-vous ne se chevauchent pas ; deux personnes peuvent recevoir à la même heure.">
          <select name="hoteId" defaultValue={type?.hote?.id ?? ""} className={INPUT}>
            <option value="">L’équipe CanCham</option>
            {personnes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
                {p.specialite ? ` — ${p.specialite}` : ""}
                {p.recoit ? "" : " (ne reçoit pas encore)"}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Lieu">
            <select name="lieu" defaultValue={type?.lieu ?? "bureau"} className={INPUT}>
              {LIEUX.map((l) => (
                <option key={l.cle} value={l.cle}>{l.libelle}</option>
              ))}
            </select>
          </Field>
          <Field label="Prix affiché" hint="Facultatif.">
            <input name="prix" maxLength={60} list="prix-rdv" defaultValue={type?.prix ?? ""} placeholder="Gratuit" className={INPUT} />
            <datalist id="prix-rdv">
              {PRIX_SUGGERES.map((p) => <option key={p} value={p} />)}
            </datalist>
          </Field>
        </div>

        <div>
          <span className="block text-[12.3px] font-semibold text-muted mb-1.5">Couleur de repère</span>
          <input type="hidden" name="couleur" value={couleur} />
          <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Couleur de repère">
            {COULEURS_TYPE.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={couleur === c}
                aria-label={c}
                onClick={() => setCouleur(c)}
                className={`w-8 h-8 rounded-full cursor-pointer border-2 ${couleur === c ? "border-ink" : "border-transparent"}`}
                style={{ background: c, boxShadow: couleur === c ? "0 0 0 2px var(--surface) inset" : undefined }}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="block text-[12.3px] font-semibold text-muted mb-1.5">
            Heures d’accueil pour ce rendez-vous
          </span>
          <div className="flex flex-col gap-2">
            {plages.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  aria-label="Jour de la semaine"
                  value={p.jour}
                  onChange={(e) => changer(i, "jour", Number(e.target.value))}
                  className={`${INPUT} flex-1 min-w-0`}
                >
                  {JOURS_SEMAINE.map((j) => (
                    <option key={j.cle} value={j.cle}>
                      {j.libelle}
                    </option>
                  ))}
                </select>
                <div className="w-[104px] shrink-0">
                  <input
                    type="time"
                    aria-label="Début"
                    value={p.debut}
                    onChange={(e) => changer(i, "debut", e.target.value)}
                    className={INPUT}
                  />
                </div>
                <span aria-hidden className="text-muted text-[13px]">
                  –
                </span>
                <div className="w-[104px] shrink-0">
                  <input
                    type="time"
                    aria-label="Fin"
                    value={p.fin}
                    onChange={(e) => changer(i, "fin", e.target.value)}
                    className={INPUT}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setPlages((l) => l.filter((_, n) => n !== i))}
                  aria-label="Retirer cette plage"
                  title="Retirer"
                  className="w-8 h-8 shrink-0 rounded-[var(--radius-s)] border border-line bg-surface text-muted hover:text-bad hover:border-bad flex items-center justify-center cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
            <button
              type="button"
              onClick={() =>
                setPlages((l) => [
                  ...l,
                  { jour: l.at(-1)?.jour ?? 1, debut: "14:00", fin: "16:00" },
                ])
              }
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent bg-transparent border-0 p-0 cursor-pointer hover:underline"
            >
              <Plus size={14} /> Ajouter une plage
            </button>
            <span className="text-[11.5px] text-faint">
              {resume(plages, duree)}
            </span>
          </div>

          {plages.length ? null : (
            <p className="m-0 mt-2 text-[12px] text-warn">
              Sans heure d’accueil, ce rendez-vous n’a aucun créneau à proposer
              — les membres ne le verront pas.
            </p>
          )}
        </div>

        <label className="flex items-center gap-2.5 text-[13.4px] cursor-pointer w-fit">
          <input
            type="checkbox"
            name="actif"
            value="1"
            defaultChecked={type?.actif ?? true}
            className="w-4 h-4 accent-[var(--accent)]"
          />
          Proposé aux membres
        </label>
        <label className="flex items-center gap-2.5 text-[13.4px] cursor-pointer w-fit">
          <input
            type="checkbox"
            name="aConfirmer"
            value="1"
            defaultChecked={type?.aConfirmer ?? false}
            className="w-4 h-4 accent-[var(--accent)]"
          />
          Chaque réservation attend la confirmation de l’équipe
        </label>
      </ModalBody>
      <ModalFooter>
        {type ? (
          <button
            type="button"
            onClick={() => setConfirmer(true)}
            className="mr-auto inline-flex items-center gap-1.5 text-[13px] font-semibold text-bad bg-transparent border-0 cursor-pointer hover:underline"
          >
            <Trash2 size={14} /> Retirer
          </button>
        ) : null}
        <CancelButton onClick={fermer} />
        <SubmitButton pendingLabel="Enregistrement…">
          {type ? "Enregistrer" : "Ajouter"}
        </SubmitButton>
      </ModalFooter>
    </form>
  );
}

function resume(plages: Ligne[], duree: number): string {
  if (!duree || duree <= 0) return "";
  const total = plages.reduce((n, p) => {
    if (!estHeure(p.debut) || !estHeure(p.fin)) return n;
    const minutes = enMinutes(p.fin) - enMinutes(p.debut);
    return n + (minutes > 0 ? Math.floor(minutes / duree) : 0);
  }, 0);
  return total
    ? `${total} créneau${total > 1 ? "x" : ""} de ${duree} min par semaine`
    : "aucun créneau";
}

// Qui reçoit : spécialité, salle de visio fixe, et si la personne reçoit des rendez-vous
export function ReglerPersonne({
  personne,
}: {
  personne: { id: string; nom: string; specialite: string | null; lienVisio: string | null; recoit: boolean };
}) {
  return (
    <Modal
      title={`Rendez-vous de ${personne.nom}`}
      trigger={(ouvrir) => (
        <button type="button" onClick={ouvrir} className="btn-contour btn-contour-sm text-ink">
          <Settings2 size={14} /> Régler
        </button>
      )}
    >
      {(fermer) => (
        <form action={enregistrerPersonneRdv}>
          <input type="hidden" name="userId" value={personne.id} />
          <FermerApresEnvoi fermer={fermer} />
          <ModalBody>
            <Field label="Spécialité" hint="Ce que les membres lisent sous son nom : ce pour quoi la réserver.">
              <input name="specialite" maxLength={80} defaultValue={personne.specialite ?? ""} placeholder="Ex. Partenariats & missions au Canada" className={INPUT} />
            </Field>
            <Field label="Salle de visio" hint="Un lien fixe (Google Meet, Zoom, Teams…), donné aux membres pour les rendez-vous en visio.">
              <input name="lienVisio" type="url" inputMode="url" defaultValue={personne.lienVisio ?? ""} placeholder="https://meet.google.com/abc-defg-hij" className={INPUT} />
            </Field>
            <label className="flex items-center gap-2.5 text-[13.4px] cursor-pointer w-fit">
              <input type="checkbox" name="recoit" value="1" defaultChecked={personne.recoit} className="w-4 h-4 accent-[var(--accent)]" />
              Reçoit des rendez-vous : ses types sont proposés aux membres
            </label>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

// Bouton compact qui copie un lien (page de réservation, lien d'un type)
export function BoutonCopierLien({ lien, libelle }: { lien: string; libelle: string }) {
  const [copie, setCopie] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(lien);
          setCopie(true);
          setTimeout(() => setCopie(false), 2000);
        } catch {
          window.prompt("Copiez le lien :", lien);
        }
      }}
      className="btn-contour btn-contour-sm text-ink"
    >
      {copie ? <Check size={14} className="text-success-strong" /> : <Link2 size={14} />} {copie ? "Lien copié" : libelle}
    </button>
  );
}
