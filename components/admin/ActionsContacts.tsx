"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, ArrowRight, Check, FileUp, FolderOpen, ImagePlus, Plus, User, UserPlus, X } from "lucide-react";
import { Modal } from "@/components/Modal";
import { OptionsSecteurs } from "@/components/OptionsSecteurs";
import { CancelButton, Field, INPUT, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import { ajouterContact, importerContacts, type BilanImport } from "@/lib/actions/contacts";
import {
  CHAMPS_IMPORT,
  devinerCorrespondance,
  lireCsv,
  preparerLignes,
  type Correspondance,
} from "@/lib/import-contacts";

const NOUVELLE = "__nouvelle__";

// « Ajouter un contact » : à une entreprise existante, ou avec une nouvelle entreprise
export function AjouterContact({ entreprises, retour }: { entreprises: { id: string; nom: string }[]; retour: string }) {
  const [choix, setChoix] = useState("");
  const nouvelle = choix === NOUVELLE;
  return (
    <Modal
      title="Ajouter un contact"
      wide
      trigger={(ouvrir) => (
        <button type="button" onClick={ouvrir} className="btn-action btn-action-sm">
          <Plus size={15} /> Ajouter un contact
        </button>
      )}
    >
      {(fermer) => (
        <form action={ajouterContact}>
          <input type="hidden" name="retour" value={retour} />
          <ModalBody>
            <Field label="Entreprise">
              <select name={nouvelle ? undefined : "memberId"} required value={choix} onChange={(e) => setChoix(e.target.value)} className={INPUT}>
                <option value="">Choisissez l’entreprise…</option>
                <option value={NOUVELLE}>＋ Nouvelle entreprise</option>
                {entreprises.map((e) => (
                  <option key={e.id} value={e.id}>{e.nom}</option>
                ))}
              </select>
            </Field>
            {nouvelle ? (
              <div className="grid gap-3.5 md:grid-cols-3 rounded-[var(--radius-m)] border border-line bg-surface-2 p-3.5">
                <div className="md:col-span-3">
                  <ChoixLogo />
                </div>
                <Field label="Nom de l’entreprise">
                  <input name="entreprise" required autoFocus maxLength={120} className={INPUT} />
                </Field>
                <Field label="Secteur">
                  <select name="secteur" defaultValue="" className={INPUT}>
                    <OptionsSecteurs />
                  </select>
                </Field>
                <Field label="Ville">
                  <input name="ville" placeholder="Antananarivo" maxLength={80} className={INPUT} />
                </Field>
              </div>
            ) : null}
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Nom du contact">
                <input name="nom" required maxLength={120} autoComplete="off" className={INPUT} />
              </Field>
              <Field label="Fonction">
                <input name="fonction" maxLength={120} placeholder="Ex. Directrice générale" className={INPUT} />
              </Field>
              <Field label="Courriel">
                <input name="email" type="email" required maxLength={200} autoComplete="off" className={INPUT} />
              </Field>
              <Field label="Téléphone">
                <input name="tel" type="tel" maxLength={40} placeholder="+261 34 00 000 00" className={INPUT} />
              </Field>
            </div>
            {choix && !nouvelle ? (
              <label className="inline-flex items-center gap-2 text-[13.4px] text-ink cursor-pointer">
                <input type="checkbox" name="principal" className="w-4 h-4 accent-[var(--accent)]" />
                En faire le contact principal de l’entreprise
              </label>
            ) : (
              <p className="m-0 text-[12.5px] text-muted">Le premier contact d’une entreprise en devient le contact principal.</p>
            )}
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Ajout…">
              <UserPlus size={14} /> Ajouter le contact
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

// Logo facultatif de la nouvelle entreprise, avec aperçu ; sans logo, l'icône de personne
function ChoixLogo() {
  const [apercu, setApercu] = useState<string | null>(null);
  const [cle, setCle] = useState(0);
  useEffect(() => () => { if (apercu) URL.revokeObjectURL(apercu); }, [apercu]);
  return (
    <div className="flex items-center gap-3.5">
      <span className="w-[84px] h-[48px] shrink-0 rounded-[var(--radius-s)] border border-line bg-surface grid place-items-center overflow-hidden text-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) avant l'envoi */}
        {apercu ? <img src={apercu} alt="Aperçu du logo" className="w-full h-full object-contain p-1" /> : <User size={22} aria-hidden />}
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-[12.5px] font-semibold text-muted">Logo de l’entreprise <span className="font-normal">(facultatif)</span></span>
        <div className="flex items-center gap-2">
          <label className="btn-contour btn-contour-sm text-ink cursor-pointer">
            <ImagePlus size={14} aria-hidden /> {apercu ? "Changer" : "Choisir une image"}
            <input
              key={cle}
              type="file"
              name="logo"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setApercu(f ? URL.createObjectURL(f) : null);
              }}
            />
          </label>
          {apercu ? (
            <button type="button" onClick={() => { setApercu(null); setCle((k) => k + 1); }} className="inline-flex items-center gap-1 border-0 bg-transparent text-[12.5px] font-semibold text-muted cursor-pointer hover:text-bad">
              <X size={13} /> Retirer
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// « Importer un CSV » : choisir le fichier, dire quelle colonne correspond à quoi, vérifier, importer
export function ImporterContacts() {
  return (
    <Modal
      title="Importer des contacts (CSV)"
      largeur="max-w-[760px]"
      trigger={(ouvrir) => (
        <button type="button" onClick={ouvrir} className="btn-contour btn-contour-sm text-ink">
          <FolderOpen size={15} /> Importer un CSV
        </button>
      )}
    >
      {(fermer) => <Import fermer={fermer} />}
    </Modal>
  );
}

function Import({ fermer }: { fermer: () => void }) {
  const router = useRouter();
  const [fichier, setFichier] = useState<{ nom: string; entetes: string[]; lignes: string[][] } | null>(null);
  const [corr, setCorr] = useState<Correspondance | null>(null);
  const [erreur, setErreur] = useState("");
  const [bilan, setBilan] = useState<BilanImport | null>(null);
  const [enCours, demarrer] = useTransition();

  const preparees = useMemo(() => (fichier && corr ? preparerLignes(fichier.lignes, corr) : []), [fichier, corr]);
  const valides = preparees.filter((p) => p.ligne);
  const rejetees = preparees.filter((p) => p.erreur);
  const fusions = preparees.filter((p) => p.fusion);
  const lignesFusionnees = fusions.reduce((n, p) => n + (p.fusion?.numeros.length ?? 0) - 1, 0);
  const manquants = corr ? CHAMPS_IMPORT.filter((c) => c.requis && corr[c.cle] < 0) : [];

  const lire = async (f: File | undefined) => {
    setErreur("");
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return setErreur("Fichier trop lourd (5 Mo au plus).");
    const { entetes, lignes } = lireCsv(await f.text());
    if (!entetes.length || !lignes.length) return setErreur("Le fichier est vide, ou n’a pas de ligne d’en-têtes.");
    setFichier({ nom: f.name, entetes, lignes });
    setCorr(devinerCorrespondance(entetes));
  };

  const importer = () =>
    demarrer(async () => {
      try {
        setBilan(await importerContacts(valides.map((p) => p.ligne)));
        router.refresh();
      } catch {
        setErreur("L’import n’a pas abouti. Réessayez.");
      }
    });

  if (bilan) {
    return (
      <>
        <ModalBody>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full grid place-items-center bg-success text-white shrink-0"><Check size={20} strokeWidth={3} /></span>
            <b className="text-[16px] text-ink">Import terminé</b>
          </div>
          <ul className="m-0 pl-5 text-[13.6px] text-ink flex flex-col gap-1">
            <li><b>{bilan.contactsCrees}</b> contact{bilan.contactsCrees > 1 ? "s" : ""} ajouté{bilan.contactsCrees > 1 ? "s" : ""}</li>
            <li><b>{bilan.contactsMisAJour}</b> contact{bilan.contactsMisAJour > 1 ? "s" : ""} déjà connu{bilan.contactsMisAJour > 1 ? "s" : ""}, mis à jour</li>
            {lignesFusionnees ? (
              <li><b>{fusions.length}</b> courriel{fusions.length > 1 ? "s" : ""} en double réuni{fusions.length > 1 ? "s" : ""} en un seul contact ({lignesFusionnees} ligne{lignesFusionnees > 1 ? "s" : ""} en moins)</li>
            ) : null}
            <li><b>{bilan.entreprisesCreees}</b> nouvelle{bilan.entreprisesCreees > 1 ? "s" : ""} entreprise{bilan.entreprisesCreees > 1 ? "s" : ""} (en attente de paiement, fiche à compléter)</li>
          </ul>
          {bilan.ignores.length ? (
            <div className="rounded-[var(--radius-m)] border border-line bg-surface-2 p-3 text-[13px]">
              <b className="text-ink">{bilan.ignores.length} ligne{bilan.ignores.length > 1 ? "s" : ""} ignorée{bilan.ignores.length > 1 ? "s" : ""}</b>
              <ul className="m-0 mt-1 pl-5 text-muted max-h-[140px] overflow-y-auto">
                {bilan.ignores.map((x, i) => <li key={i}>{x.email} : {x.raison}</li>)}
              </ul>
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={fermer} className="btn-action btn-action-sm">Fermer</button>
        </ModalFooter>
      </>
    );
  }

  return (
    <>
      <ModalBody>
        <label className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-m)] border-2 border-dashed border-line bg-surface-2 px-4 py-6 text-center cursor-pointer hover:border-accent transition-colors duration-150">
          <FileUp size={24} className="text-accent" aria-hidden />
          <span className="text-[14px] font-semibold text-ink">{fichier ? fichier.nom : "Choisir un fichier CSV"}</span>
          <span className="text-[12.5px] text-muted">
            {fichier ? `${fichier.lignes.length} ligne${fichier.lignes.length > 1 ? "s" : ""} · cliquez pour en choisir un autre` : "La première ligne donne le titre des colonnes. Séparateur « ; » ou « , »."}
          </span>
          <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => lire(e.target.files?.[0])} />
        </label>
        {erreur ? <p className="m-0 text-[13px] text-bad">{erreur}</p> : null}

        {fichier && corr ? (
          <>
            <div>
              <h4 className="m-0 mb-1 text-[14px] font-semibold text-ink">Quelle colonne correspond à quoi ?</h4>
              <p className="m-0 mb-3 text-[12.5px] text-muted">Les colonnes ont été devinées d’après leur titre : vérifiez-les. Les tags peuvent être séparés par des virgules.</p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {CHAMPS_IMPORT.map((c) => {
                  const exemple = corr[c.cle] >= 0 ? fichier.lignes.find((l) => l[corr[c.cle]])?.[corr[c.cle]] : "";
                  return (
                    <label key={c.cle} className="flex flex-col gap-1">
                      <span className="text-[12.5px] font-semibold text-muted">
                        {c.libelle} {c.requis ? <span className="text-accent">*</span> : null}
                      </span>
                      <select
                        value={corr[c.cle]}
                        onChange={(e) => setCorr({ ...corr, [c.cle]: Number(e.target.value) })}
                        className={`${INPUT} ${c.requis && corr[c.cle] < 0 ? "border-warn" : ""}`}
                      >
                        <option value={-1}>— Ne pas importer —</option>
                        {fichier.entetes.map((h, i) => (
                          <option key={i} value={i}>{h || `Colonne ${i + 1}`}</option>
                        ))}
                      </select>
                      <span className="text-[11.5px] text-faint truncate min-h-[16px]">{exemple ? `Ex. ${exemple}` : ""}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {manquants.length ? (
              <p className="m-0 flex items-start gap-2 text-[13px] text-warn">
                <AlertTriangle size={15} className="shrink-0 mt-[1px]" aria-hidden /> Choisissez la colonne : {manquants.map((c) => c.libelle).join(", ")}.
              </p>
            ) : (
              <div className="rounded-[var(--radius-m)] border border-line overflow-hidden">
                <div className="px-3 py-2 bg-surface-2 text-[12.5px] text-muted">
                  <b className="text-ink">{valides.length}</b> ligne{valides.length > 1 ? "s" : ""} prête{valides.length > 1 ? "s" : ""}
                  {fusions.length ? <> · <span className="text-navy font-semibold">{fusions.length} doublon{fusions.length > 1 ? "s" : ""} réuni{fusions.length > 1 ? "s" : ""}</span></> : null}
                  {rejetees.length ? <> · <span className="text-warn">{rejetees.length} à corriger dans le fichier</span></> : null}
                </div>
                {fusions.length ? (
                  <details className="border-t border-line bg-navy-soft/40 px-3 py-2 text-[12.5px]">
                    <summary className="cursor-pointer font-semibold text-navy">
                      {fusions.length} courriel{fusions.length > 1 ? "s" : ""} en double : chacun ne fera qu’un seul contact
                    </summary>
                    <ul className="m-0 mt-1.5 pl-5 flex flex-col gap-1 text-ink">
                      {fusions.map((p) => (
                        <li key={p.numero}>
                          <b>{p.ligne?.email ?? p.erreur}</b> : lignes {p.fusion!.numeros.join(", ")} réunies
                          {p.fusion!.ecarts.length ? (
                            <span className="block text-muted">Gardé : la ligne {p.numero}. Écarté : {p.fusion!.ecarts.join(" ; ")}.</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                <div className="max-h-[200px] overflow-auto">
                  <table className="w-full border-collapse text-[12.5px]">
                    <tbody>
                      {preparees.slice(0, 50).map((p) => (
                        <tr key={p.numero} className="border-t border-line">
                          <td className="px-3 py-1.5 text-faint tabular-nums w-[44px]">{p.numero}</td>
                          {p.ligne ? (
                            <>
                              <td className="px-3 py-1.5 text-ink font-semibold">{p.ligne.entreprise}</td>
                              <td className="px-3 py-1.5 text-ink">{p.ligne.nom}</td>
                              <td className="px-3 py-1.5 text-muted">
                                {p.ligne.email}
                                {p.fusion ? (
                                  <span className="ml-1.5 inline-block rounded-full bg-navy-soft text-navy px-2 py-px text-[11px] font-semibold whitespace-nowrap">
                                    {p.fusion.numeros.length} lignes réunies
                                  </span>
                                ) : null}
                              </td>
                            </>
                          ) : (
                            <td colSpan={3} className="px-3 py-1.5 text-warn">{p.erreur}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <p className="m-0 text-[12px] text-faint">
              Les lignes au même courriel sont réunies : les cases vides se complètent, les tags s’additionnent, la première valeur l’emporte. Une entreprise inconnue est créée (en attente de paiement, fiche à compléter). Un courriel déjà connu met à jour son contact. Le premier contact d’une entreprise en devient le contact principal.
            </p>
          </>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <CancelButton onClick={fermer} />
        <button
          type="button"
          onClick={importer}
          disabled={!valides.length || manquants.length > 0 || enCours}
          className="btn-action btn-action-sm disabled:opacity-50"
        >
          {enCours ? "Import…" : <>Importer {valides.length || ""} contact{valides.length > 1 ? "s" : ""} <ArrowRight size={14} /></>}
        </button>
      </ModalFooter>
    </>
  );
}
