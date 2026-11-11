"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Plus, Trash2, UserPlus } from "lucide-react";
import { INPUT } from "@/components/champ-style";
import { ChampPhoto, Field, SubmitButton } from "@/components/form-bits";
import { ChoixDiffusion } from "@/components/forms/ChoixDiffusion";
import { ChoixTags } from "@/components/admin/ChoixTags";
import { Card } from "@/components/ui";
import { saveEvent } from "@/lib/actions/events";
import type { CanchamEvent, EtapeProgramme, Intervenant } from "@/lib/types";

interface Etape extends EtapeProgramme {
  cle: number;
}

let prochaineCle = 1;
const nouvelleEtape = (e?: EtapeProgramme): Etape => ({
  cle: prochaineCle++,
  heure: e?.heure ?? "",
  titre: e?.titre ?? "",
  detail: e?.detail ?? "",
});

function Rubrique({
  titre,
  aide,
  children,
}: {
  titre: string;
  aide?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <h2 className="text-[17px] m-0">{titre}</h2>
      {aide ? <p className="text-[13px] text-muted m-0 mt-1">{aide}</p> : null}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </Card>
  );
}

interface LigneIntervenant extends Intervenant {
  cle: number;
}

const nouvelIntervenant = (i?: Intervenant): LigneIntervenant => ({
  cle: prochaineCle++,
  nom: i?.nom ?? "",
  fonction: i?.fonction ?? "",
  entreprise: i?.entreprise ?? "",
  bio: i?.bio ?? "",
  photo: i?.photo ?? null,
});

function deplace<T>(l: T[], i: number, sens: -1 | 1): T[] {
  const j = i + sens;
  if (j < 0 || j >= l.length) return l;
  const copie = [...l];
  [copie[i], copie[j]] = [copie[j], copie[i]];
  return copie;
}

export function FormulaireEvenement({
  event,
  tousTags,
  tags = [],
}: {
  event?: CanchamEvent;
  tousTags: string[];
  tags?: string[];
}) {
  const [payant, setPayant] = useState(event?.payant ?? false);
  const [publique, setPublique] = useState(event?.public ?? true);
  const [payantPublic, setPayantPublic] = useState(
    (event?.prixPublic ?? 0) > 0,
  );
  const [etapes, setEtapes] = useState<Etape[]>(() =>
    event?.programme?.length
      ? event.programme.map(nouvelleEtape)
      : [nouvelleEtape()],
  );

  const [intervenants, setIntervenants] = useState<LigneIntervenant[]>(() =>
    (event?.intervenants ?? []).map(nouvelIntervenant),
  );

  const deplacer = (i: number, sens: -1 | 1) => setEtapes((l) => deplace(l, i, sens));

  return (
    <form action={saveEvent} className="flex flex-col gap-4">
      {event ? <input type="hidden" name="eventId" value={event.id} /> : null}

      <div className="grid gap-4 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <Rubrique titre="L’essentiel">
            <ChampPhoto
              name="photo"
              retirer="retirerPhoto"
              apercu={event?.photo}
              aide="Affichée en tête de la page de l’événement et sur sa carte."
            />
            <Field label="Titre">
              <input
                name="titre"
                required
                defaultValue={event?.titre}
                placeholder="Ex. Atelier Doing Business in Canada"
                className={INPUT}
              />
            </Field>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
              <Field label="Date">
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={event?.date}
                  className={INPUT}
                />
              </Field>
              <Field label="Début" hint="Vide : toute la journée.">
                <input
                  type="time"
                  name="debut"
                  defaultValue={event?.debut ?? ""}
                  className={INPUT}
                />
              </Field>
              <Field label="Fin">
                <input
                  type="time"
                  name="fin"
                  defaultValue={event?.fin ?? ""}
                  className={INPUT}
                />
              </Field>
              <Field label="Format">
                <select
                  name="format"
                  defaultValue={event?.format ?? "Présentiel"}
                  className={INPUT}
                >
                  <option>Présentiel</option>
                  <option>Webinaire</option>
                  <option>Hybride</option>
                </select>
              </Field>
            </div>
            <div className="grid gap-4 grid-cols-[minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_160px]">
              <Field label="Lieu" hint="Ville, salle, ou « En ligne ».">
                <input
                  name="lieu"
                  defaultValue={event?.lieu}
                  placeholder="Antananarivo"
                  className={INPUT}
                />
              </Field>
              <Field label="Capacité">
                <input
                  type="number"
                  name="cap"
                  min={1}
                  required
                  defaultValue={event?.cap ?? 80}
                  className={INPUT}
                />
              </Field>
            </div>
          </Rubrique>

          <Rubrique
            titre="Présentation"
            aide="Un paragraphe par idée : laissez une ligne vide entre deux paragraphes."
          >
            <Field label="Description">
              <textarea
                name="desc"
                rows={7}
                defaultValue={event?.desc}
                placeholder="Ce que les participants vont vivre, apprendre, rencontrer…"
                className={INPUT}
              />
            </Field>
            <Field label="À qui s’adresse ce rendez-vous">
              <textarea
                name="pourQui"
                rows={3}
                defaultValue={event?.pourQui ?? ""}
                placeholder="Ex. Dirigeants de PME exportatrices, responsables commerciaux…"
                className={INPUT}
              />
            </Field>
          </Rubrique>

          <Rubrique
            titre="Programme"
            aide="Les étapes s’affichent dans cet ordre sur la page de l’événement. Une étape sans titre est ignorée."
          >
            <ol className="list-none m-0 p-0 flex flex-col gap-3">
              {etapes.map((e, i) => (
                <li
                  key={e.cle}
                  className="border border-line rounded-[var(--radius-m)] p-3.5 bg-surface-2"
                >
                  <div className="grid gap-3 sm:grid-cols-[120px_1fr_auto] items-end">
                    <Field label="Heure">
                      <input
                        name="etapeHeure"
                        defaultValue={e.heure}
                        placeholder="18 h 00"
                        className={INPUT}
                      />
                    </Field>
                    <Field label={`Étape ${i + 1}`}>
                      <input
                        name="etapeTitre"
                        defaultValue={e.titre}
                        placeholder="Ex. Tour de table express"
                        className={INPUT}
                      />
                    </Field>
                    <div className="flex gap-1 pb-0.5">
                      <BoutonIcone
                        libelle="Monter l’étape"
                        onClick={() => deplacer(i, -1)}
                        disabled={i === 0}
                      >
                        <ArrowUp size={15} />
                      </BoutonIcone>
                      <BoutonIcone
                        libelle="Descendre l’étape"
                        onClick={() => deplacer(i, 1)}
                        disabled={i === etapes.length - 1}
                      >
                        <ArrowDown size={15} />
                      </BoutonIcone>
                      <BoutonIcone
                        libelle="Retirer l’étape"
                        onClick={() =>
                          setEtapes((l) => l.filter((x) => x.cle !== e.cle))
                        }
                        danger
                      >
                        <Trash2 size={15} />
                      </BoutonIcone>
                    </div>
                  </div>
                  <div className="mt-3">
                    <input
                      name="etapeDetail"
                      defaultValue={e.detail ?? ""}
                      placeholder="Détail facultatif"
                      aria-label={`Détail de l’étape ${i + 1}`}
                      className={INPUT}
                    />
                  </div>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => setEtapes((l) => [...l, nouvelleEtape()])}
              className="self-start btn-contour btn-contour-sm text-ink hover:bg-surface-2"
            >
              <Plus size={14} /> Ajouter une étape
            </button>
          </Rubrique>

          <Rubrique
            titre="Intervenants"
            aide="Un ou plusieurs, dans l’ordre d’affichage. Un intervenant sans nom est ignoré."
          >
            {intervenants.length ? (
              <ol className="list-none m-0 p-0 flex flex-col gap-3">
                {intervenants.map((p, i) => (
                  <li
                    key={p.cle}
                    className="border border-line rounded-[var(--radius-m)] p-3.5 bg-surface-2"
                  >
                    {/* Photo déjà enregistrée : gardée si rien n’est choisi ni retiré */}
                    <input type="hidden" name="intervenantPhotoActuelle" value={p.photo ?? ""} />
                    <div className="flex items-start justify-between gap-3">
                      <ChampPhoto
                        name={`intervenantPhoto-${i}`}
                        retirer={`intervenantRetirer-${i}`}
                        apercu={p.photo}
                        libelle={`Intervenant ${i + 1}`}
                        aide="Un portrait, de préférence carré."
                        rond
                      />
                      <div className="flex gap-1 shrink-0">
                        <BoutonIcone
                          libelle="Monter l’intervenant"
                          onClick={() => setIntervenants((l) => deplace(l, i, -1))}
                          disabled={i === 0}
                        >
                          <ArrowUp size={15} />
                        </BoutonIcone>
                        <BoutonIcone
                          libelle="Descendre l’intervenant"
                          onClick={() => setIntervenants((l) => deplace(l, i, 1))}
                          disabled={i === intervenants.length - 1}
                        >
                          <ArrowDown size={15} />
                        </BoutonIcone>
                        <BoutonIcone
                          libelle="Retirer l’intervenant"
                          onClick={() =>
                            setIntervenants((l) => l.filter((x) => x.cle !== p.cle))
                          }
                          danger
                        >
                          <Trash2 size={15} />
                        </BoutonIcone>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <Field label="Nom">
                        <input
                          name="intervenantNom"
                          defaultValue={p.nom}
                          maxLength={120}
                          placeholder="Ex. Hanta Rasoa"
                          className={INPUT}
                        />
                      </Field>
                      <Field label="Fonction">
                        <input
                          name="intervenantFonction"
                          defaultValue={p.fonction ?? ""}
                          maxLength={120}
                          placeholder="Ex. Conseillère en immigration"
                          className={INPUT}
                        />
                      </Field>
                      <Field label="Entreprise ou organisme">
                        <input
                          name="intervenantEntreprise"
                          defaultValue={p.entreprise ?? ""}
                          maxLength={120}
                          className={INPUT}
                        />
                      </Field>
                    </div>
                    <div className="mt-3">
                      <textarea
                        name="intervenantBio"
                        rows={2}
                        defaultValue={p.bio ?? ""}
                        maxLength={600}
                        placeholder="Quelques mots de présentation (facultatif)"
                        aria-label={`Présentation de l’intervenant ${i + 1}`}
                        className={INPUT}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}
            <button
              type="button"
              onClick={() => setIntervenants((l) => [...l, nouvelIntervenant()])}
              className="self-start btn-contour btn-contour-sm text-ink hover:bg-surface-2"
            >
              <UserPlus size={14} /> Ajouter un intervenant
            </button>
          </Rubrique>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-[88px]">
          <Rubrique titre="Rattacher un tag aux inscrits">
            <ChoixTags name="etiquettes" options={tousTags} initiaux={tags} creation />
          </Rubrique>

          <Rubrique titre="Diffusion">
            <ChoixDiffusion publique={publique} onChange={setPublique} />
          </Rubrique>

          <Rubrique
            titre="Participation"
            aide={
              publique
                ? "Deux tarifs : celui des membres, et celui d’une inscription depuis la page publique."
                : undefined
            }
          >
            <Field label="Tarif membres">
              <select
                name="type"
                value={payant ? "payant" : "gratuit"}
                onChange={(ev) => setPayant(ev.target.value === "payant")}
                className={INPUT}
              >
                <option value="gratuit">Inclus dans l’adhésion</option>
                <option value="payant">Payant</option>
              </select>
            </Field>
            {payant ? (
              <Field
                label="Prix membre ($ CAD)"
                hint="Une facture est générée à chaque inscription de membre."
              >
                <input
                  type="number"
                  name="prix"
                  min={1}
                  required
                  defaultValue={event?.prix || 50000}
                  className={INPUT}
                />
              </Field>
            ) : null}
            {publique ? (
              <>
                <Field label="Tarif public">
                  <select
                    name="typePublic"
                    value={payantPublic ? "payant" : "gratuit"}
                    onChange={(ev) =>
                      setPayantPublic(ev.target.value === "payant")
                    }
                    className={INPUT}
                  >
                    <option value="gratuit">Gratuit</option>
                    <option value="payant">Payant</option>
                  </select>
                </Field>
                {payantPublic ? (
                  <Field
                    label="Prix public ($ CAD)"
                    hint="Réglé auprès de l’équipe : le journal signale chaque inscription."
                  >
                    <input
                      type="number"
                      name="prixPublic"
                      min={1}
                      required
                      defaultValue={event?.prixPublic || event?.prix || 75000}
                      className={INPUT}
                    />
                  </Field>
                ) : null}
              </>
            ) : null}
          </Rubrique>

          <SubmitButton pendingLabel="Enregistrement…" className="w-full">
            <Check size={15} />{" "}
            {event ? "Enregistrer les modifications" : "Publier l’événement"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}

function BoutonIcone({
  libelle,
  onClick,
  disabled = false,
  danger = false,
  children,
}: {
  libelle: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={libelle}
      title={libelle}
      className={`w-9 h-9 rounded-[var(--radius-s)] border border-line bg-surface flex items-center justify-center cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
        danger
          ? "text-muted hover:text-accent hover:border-accent"
          : "text-muted hover:text-ink hover:border-faint"
      }`}
    >
      {children}
    </button>
  );
}
