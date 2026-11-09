"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Plus, Tag, Tags, X } from "lucide-react";
import { LigneEntreprise } from "@/components/admin/LigneEntreprise";
import { Modal } from "@/components/Modal";
import { CancelButton, INPUT, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import { ajouterTagsEntreprises, retirerTagsEntreprises } from "@/lib/actions/contacts";
import type { EntrepriseContact } from "@/lib/contacts-admin";
import { plat } from "@/lib/texte";

const pluriel = (n: number) => `${n} entreprise${n > 1 ? "s" : ""}`;
const TH = "text-left text-[11px] uppercase tracking-[0.07em] text-faint font-semibold px-4 py-3 border-b border-line whitespace-nowrap";

// Tableau de la page Contacts : on coche des entreprises (ou toutes), puis on agit sur la sélection
export function TableauEntreprises({
  entreprises,
  tousTags,
  retour,
}: {
  entreprises: EntrepriseContact[];
  tousTags: string[];
  retour: string;
}) {
  const [choisies, setChoisies] = useState<Set<string>>(new Set());
  const tout = useRef<HTMLInputElement>(null);

  // Les filtres changent la liste : on ne garde que les entreprises encore affichées
  const visibles = useMemo(() => new Set(entreprises.map((e) => e.id)), [entreprises]);
  const selection = [...choisies].filter((id) => visibles.has(id));
  const n = selection.length;
  const toutes = n > 0 && n === entreprises.length;

  useEffect(() => {
    if (tout.current) tout.current.indeterminate = n > 0 && !toutes;
  }, [n, toutes]);

  const choisir = (id: string, oui: boolean) =>
    setChoisies((s) => {
      const t = new Set(s);
      if (oui) t.add(id);
      else t.delete(id);
      return t;
    });
  const choisirTout = (oui: boolean) => setChoisies(oui ? new Set(entreprises.map((e) => e.id)) : new Set());

  const tagsSelection = [...new Set(entreprises.filter((e) => choisies.has(e.id)).flatMap((e) => e.etiquettes))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
  const champsSelection = (
    <>
      <input type="hidden" name="retour" value={retour} />
      {selection.map((id) => (
        <input key={id} type="hidden" name="entreprises" value={id} />
      ))}
    </>
  );

  return (
    <>
      <div
        className={`sticky top-2 z-20 mb-3 flex items-center gap-2.5 flex-wrap rounded-[var(--radius-m)] px-4 py-2.5 transition-colors duration-150 ${
          n ? "bg-navy text-white shadow-[var(--shadow)]" : "bg-transparent px-0"
        }`}
        aria-live="polite"
      >
        {n ? (
          <>
            <b className="text-[14px] mr-1">{pluriel(n)} sélectionnée{n > 1 ? "s" : ""}</b>
            {!toutes ? (
              <button type="button" onClick={() => choisirTout(true)} className="border-0 bg-transparent text-white/80 underline text-[13px] cursor-pointer hover:text-white">
                Tout sélectionner ({entreprises.length})
              </button>
            ) : null}
            <span className="flex-1" />
            <AjouterTags tousTags={tousTags} champs={champsSelection} n={n} />
            <RetirerTags tags={tagsSelection} champs={champsSelection} n={n} />
            <form action="/admin/contacts/export" method="post">
              {selection.map((id) => (
                <input key={id} type="hidden" name="entreprises" value={id} />
              ))}
              <button type="submit" className="btn-contour btn-contour-sm bg-white text-ink border-white hover:bg-surface-2">
                <Download size={14} /> Exporter en CSV
              </button>
            </form>
            <button
              type="button"
              onClick={() => choisirTout(false)}
              aria-label="Tout désélectionner"
              className="grid place-items-center w-9 h-9 rounded-full border-0 bg-white/10 text-white cursor-pointer hover:bg-white/20"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <span className="text-[13px] text-muted">
            {pluriel(entreprises.length)} · cochez des entreprises pour leur ajouter ou retirer des tags, ou les exporter
          </span>
        )}
      </div>

      <div className="bg-surface border border-line rounded-[var(--radius-m)] shadow-[var(--shadow)] overflow-x-auto">
        <table className="w-full border-collapse text-[13.4px]">
          <thead>
            <tr className="bg-surface-2">
              <th className={`${TH} w-[52px] pr-0`}>
                <label className="grid place-items-center w-9 h-9 -m-1.5 cursor-pointer rounded-full hover:bg-surface-3">
                  <input
                    ref={tout}
                    type="checkbox"
                    checked={toutes}
                    onChange={(ev) => choisirTout(ev.target.checked)}
                    aria-label="Sélectionner toutes les entreprises"
                    className="w-[18px] h-[18px] accent-[var(--accent)] cursor-pointer"
                  />
                </label>
              </th>
              {["Entreprise", "Contact principal", "Coordonnées", "Tags", "Accès"].map((t) => (
                <th key={t} className={TH}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entreprises.map((e) => (
              <LigneEntreprise key={e.id} entreprise={e} tousTags={tousTags} choisie={choisies.has(e.id)} onChoisir={(oui) => choisir(e.id, oui)} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// Tags à cocher, avec la création d'un nouveau tag (« Ajouter des tags »)
function ChoixTags({ options, creation }: { options: string[]; creation: boolean }) {
  const [choisis, setChoisis] = useState<string[]>([]);
  const [saisie, setSaisie] = useState("");
  const proposes = [...new Set([...options, ...choisis])].filter((t) => !saisie || plat(t).includes(plat(saisie)));
  const nouveau = creation && saisie.trim() && ![...options, ...choisis].some((t) => plat(t) === plat(saisie.trim()));
  const basculer = (t: string) => setChoisis((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]));

  return (
    <div className="flex flex-col gap-2.5">
      {choisis.map((t) => (
        <input key={t} type="hidden" name="tags" value={t} />
      ))}
      {options.length > 6 || creation ? (
        <input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const t = saisie.trim().replace(/\s+/g, " ");
              if (t && creation) {
                const existant = options.find((o) => plat(o) === plat(t)) ?? t;
                if (!choisis.includes(existant)) basculer(existant);
                setSaisie("");
              }
            }
          }}
          maxLength={60}
          autoFocus
          placeholder={creation ? "Chercher ou créer un tag…" : "Chercher un tag…"}
          aria-label="Chercher un tag"
          className={INPUT}
        />
      ) : null}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tags">
        {proposes.map((t) => {
          const actif = choisis.includes(t);
          return (
            <button
              key={t}
              type="button"
              aria-pressed={actif}
              onClick={() => basculer(t)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12.5px] font-semibold cursor-pointer transition-colors duration-150 ${
                actif ? "bg-accent border-accent text-white" : "bg-surface border-line text-ink hover:border-accent hover:text-accent"
              }`}
            >
              <Tag size={12} aria-hidden /> {t}
            </button>
          );
        })}
        {nouveau ? (
          <button
            type="button"
            onClick={() => {
              basculer(saisie.trim().replace(/\s+/g, " "));
              setSaisie("");
            }}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-accent bg-surface px-2.5 py-1 text-[12.5px] font-semibold text-accent cursor-pointer hover:bg-accent-soft"
          >
            <Plus size={12} aria-hidden /> Créer « {saisie.trim()} »
          </button>
        ) : null}
        {!proposes.length && !nouveau ? <span className="text-[12.5px] text-muted">Aucun tag.</span> : null}
      </div>
      <p className="m-0 text-[12px] text-muted">{choisis.length ? `${choisis.length} tag${choisis.length > 1 ? "s" : ""} choisi${choisis.length > 1 ? "s" : ""}` : "Cliquez sur les tags à choisir."}</p>
    </div>
  );
}

function AjouterTags({ tousTags, champs, n }: { tousTags: string[]; champs: React.ReactNode; n: number }) {
  return (
    <Modal
      title={`Ajouter des tags à ${pluriel(n)}`}
      trigger={(ouvrir) => (
        <button type="button" onClick={ouvrir} className="btn-action btn-action-sm">
          <Plus size={14} /> Ajouter des tags
        </button>
      )}
    >
      {(fermer) => (
        <form action={ajouterTagsEntreprises}>
          {champs}
          <ModalBody>
            <ChoixTags options={tousTags} creation />
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Ajout…"><Plus size={14} /> Ajouter</SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

function RetirerTags({ tags, champs, n }: { tags: string[]; champs: React.ReactNode; n: number }) {
  return (
    <Modal
      title={`Retirer des tags de ${pluriel(n)}`}
      trigger={(ouvrir) => (
        <button type="button" onClick={ouvrir} disabled={!tags.length} className="btn-contour btn-contour-sm bg-white text-ink border-white hover:bg-surface-2 disabled:opacity-50">
          <Tags size={14} /> Retirer des tags
        </button>
      )}
    >
      {(fermer) => (
        <form action={retirerTagsEntreprises}>
          {champs}
          <ModalBody>
            <ChoixTags options={tags} creation={false} />
            <p className="m-0 text-[12px] text-faint">Les tags restent dans la liste des tags, même sans entreprise.</p>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Retrait…" variant="danger"><X size={14} /> Retirer</SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
