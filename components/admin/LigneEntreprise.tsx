"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink, Mail, Phone, Plus, Tag, User, X } from "lucide-react";
import { Modal } from "@/components/Modal";
import { LogoMark } from "@/components/domain";
import { INPUT } from "@/components/champ-style";
import { Pill, StatusPill } from "@/components/ui";
import { majTagsEntreprise, retirerEtiquetteEntreprise } from "@/lib/actions/maillage";
import type { EntrepriseContact } from "@/lib/contacts-admin";
import { plat } from "@/lib/texte";

const TAGS_VISIBLES = 3;
const PASTILLE =
  "inline-flex items-center gap-1 max-w-full rounded-full bg-accent-soft text-accent-strong px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap";
const TD = "px-4 py-3 border-b border-line";

function Acces({ e }: { e: EntrepriseContact }) {
  if (!e.contact) return <span className="text-faint">—</span>;
  return e.contact.actif ? <Pill tone="ok">Actif</Pill> : <Pill tone="warn">Invitation en attente</Pill>;
}

// Une ligne de la page Contacts : l'entreprise (son logo) et son contact principal ; un clic ouvre sa fiche et ses tags
export function LigneEntreprise({
  entreprise: e,
  tousTags,
  choisie,
  onChoisir,
}: {
  entreprise: EntrepriseContact;
  tousTags: string[];
  choisie: boolean;
  onChoisir: (oui: boolean) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const autres = e.etiquettes.length - TAGS_VISIBLES;
  const c = e.contact;

  return (
    <tr
      className={`align-middle cursor-pointer transition-colors duration-150 ${choisie ? "bg-accent-soft/50 hover:bg-accent-soft/70" : "hover:bg-surface-2"}`}
      onClick={(ev) => {
        if ((ev.target as HTMLElement).closest("a,button,dialog,input,label")) return;
        setOuvert(true);
      }}
    >
      <td className={`${TD} w-[52px] pr-0`}>
        <label className="grid place-items-center w-9 h-9 -m-1.5 cursor-pointer rounded-full hover:bg-surface-3">
          <input
            type="checkbox"
            checked={choisie}
            onChange={(ev) => onChoisir(ev.target.checked)}
            aria-label={`Sélectionner ${e.nom}`}
            className="w-[18px] h-[18px] accent-[var(--accent)] cursor-pointer"
          />
        </label>
      </td>
      <td className={TD}>
        <div className="flex items-center gap-3.5">
          <span className="w-[64px] flex justify-center shrink-0">
            <LogoMark member={e} size={36} />
          </span>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setOuvert(true)}
              className="block p-0 border-0 bg-transparent font-semibold text-[14px] text-ink text-left cursor-pointer hover:text-accent focus-visible:outline-2 focus-visible:outline-accent rounded-sm"
            >
              {e.nom}
            </button>
            <div className="text-[12.3px] text-muted">
              {e.secteur} · {e.ville}
            </div>
          </div>
        </div>
        <Modal title="Fiche de l’entreprise" ouvert={ouvert} onFermer={() => setOuvert(false)}>
          {() => <FicheEntreprise entreprise={e} tousTags={tousTags} />}
        </Modal>
      </td>
      <td className={TD}>
        {c ? (
          <>
            <div className="font-semibold text-ink">{c.nom}</div>
            <div className="text-[12.3px] text-muted">{c.fonction}</div>
          </>
        ) : (
          <span className="text-faint">Aucun contact</span>
        )}
      </td>
      <td className={TD}>
        {c ? (
          <>
            <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-accent no-underline hover:underline">
              <Mail size={13} />
              {c.email}
            </a>
            {c.tel ? (
              <a href={`tel:${c.tel.replace(/\s/g, "")}`} className="flex items-center gap-1.5 text-muted no-underline mt-0.5">
                <Phone size={13} />
                {c.tel}
              </a>
            ) : null}
          </>
        ) : (
          <span className="text-faint">—</span>
        )}
      </td>
      <td className={TD}>
        {e.etiquettes.length ? (
          <div className="flex flex-wrap gap-1.5 max-w-[240px]">
            {e.etiquettes.slice(0, TAGS_VISIBLES).map((t) => (
              <Link
                key={t}
                href={`/admin/etiquettes?e=${encodeURIComponent(t)}`}
                title={`Voir les entreprises « ${t} »`}
                className={`${PASTILLE} no-underline hover:bg-accent hover:text-white transition-colors duration-150`}
              >
                <Tag size={11} className="shrink-0" aria-hidden />
                <span className="truncate">{t}</span>
              </Link>
            ))}
            {autres > 0 ? (
              <button
                type="button"
                onClick={() => setOuvert(true)}
                aria-label={`Voir les ${e.etiquettes.length} tags de ${e.nom}`}
                className="rounded-full border border-line bg-surface px-2 py-0.5 text-[12px] font-semibold text-muted cursor-pointer hover:border-accent hover:text-accent transition-colors duration-150"
              >
                +{autres}
              </button>
            ) : null}
          </div>
        ) : (
          <span className="text-faint">—</span>
        )}
      </td>
      <td className={TD}>
        <Acces e={e} />
      </td>
    </tr>
  );
}

function FicheEntreprise({ entreprise: e, tousTags }: { entreprise: EntrepriseContact; tousTags: string[] }) {
  const router = useRouter();
  const [tags, setTags] = useState(e.etiquettes);
  const [ajout, setAjout] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();
  const c = e.contact;

  const enregistrer = (liste: string[]) => {
    setTags(liste);
    demarrer(async () => {
      const r = await majTagsEntreprise(e.id, liste);
      if (r.ok) {
        setTags(r.valeurs);
        setErreur("");
        router.refresh();
      } else {
        setTags(e.etiquettes);
        setErreur(r.erreur);
      }
    });
  };
  const ajouter = (nom: string) => {
    const propre = nom.trim().replace(/\s+/g, " ");
    setSaisie("");
    if (propre && !tags.includes(propre)) enregistrer([...tags, propre]);
  };

  const proposes = tousTags.filter((t) => !tags.includes(t) && (!saisie || plat(t).includes(plat(saisie))));
  const nouveau = saisie.trim() && !tousTags.some((t) => plat(t) === plat(saisie.trim()));

  return (
    <div className="px-5 py-5 flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <LogoMark member={e} size={52} />
        <div className="min-w-0">
          <div className="text-[17px] font-semibold text-ink">{e.nom}</div>
          <div className="text-[13px] text-muted">
            {e.secteur} · {e.ville}
          </div>
          <div className="mt-1.5">
            <StatusPill status={e.statut} />
          </div>
        </div>
      </div>

      <section className="rounded-[var(--radius-m)] border border-line bg-surface-2 p-4">
        <h4 className="m-0 mb-2.5 text-[11px] uppercase tracking-[0.07em] font-semibold text-faint">Contact principal</h4>
        {c ? (
          <dl className="m-0 grid gap-2 text-[13.4px]">
            <div className="flex items-center gap-2.5">
              <dt className="sr-only">Nom</dt>
              <User size={15} className="shrink-0 text-muted" aria-hidden />
              <dd className="m-0">
                <span className="font-semibold text-ink">{c.nom}</span>
                {c.fonction ? <span className="text-muted"> · {c.fonction}</span> : null}
              </dd>
            </div>
            <div className="flex items-center gap-2.5">
              <dt className="sr-only">Courriel</dt>
              <Mail size={15} className="shrink-0 text-muted" aria-hidden />
              <dd className="m-0 min-w-0">
                <a href={`mailto:${c.email}`} className="text-accent no-underline hover:underline break-all">{c.email}</a>
              </dd>
            </div>
            {c.tel ? (
              <div className="flex items-center gap-2.5">
                <dt className="sr-only">Téléphone</dt>
                <Phone size={15} className="shrink-0 text-muted" aria-hidden />
                <dd className="m-0">
                  <a href={`tel:${c.tel.replace(/\s/g, "")}`} className="text-ink no-underline hover:text-accent">{c.tel}</a>
                </dd>
              </div>
            ) : null}
            <div className="mt-1">
              <Acces e={e} />
            </div>
          </dl>
        ) : (
          <p className="m-0 text-[13px] text-muted">Aucun contact déclaré pour cette entreprise.</p>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h4 className="m-0 text-[14px] font-semibold text-ink">
            Tags <span className="text-muted font-normal">({tags.length})</span>
          </h4>
          {ajout ? null : (
            <button type="button" onClick={() => setAjout(true)} className="btn-contour btn-contour-sm text-ink">
              <Plus size={14} /> Ajouter un tag
            </button>
          )}
        </div>

        {tags.length ? (
          <ul className="list-none m-0 p-0 flex flex-wrap gap-2">
            {tags.map((t) => (
              <li key={t} className={`${PASTILLE} text-[12.5px] py-1 pr-1.5`}>
                <Tag size={12} className="shrink-0" aria-hidden />
                <span className="truncate">{t}</span>
                <button
                  type="button"
                  onClick={() => enregistrer(tags.filter((x) => x !== t))}
                  aria-label={`Retirer le tag ${t}`}
                  className="grid place-items-center w-5 h-5 rounded-full border-0 bg-transparent text-inherit opacity-70 cursor-pointer hover:opacity-100 hover:bg-accent hover:text-white transition-colors duration-150"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-[13px] text-muted">Aucun tag pour cette entreprise.</p>
        )}

        {ajout ? (
          <div className="mt-4 rounded-[var(--radius-m)] border border-line bg-surface-2 p-3 flex flex-col gap-2.5">
            <div className="flex gap-2">
              <input
                value={saisie}
                onChange={(ev) => setSaisie(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") {
                    ev.preventDefault();
                    ajouter(proposes.find((t) => plat(t) === plat(saisie.trim())) ?? saisie);
                  }
                }}
                autoFocus
                maxLength={60}
                placeholder="Chercher ou créer un tag…"
                aria-label="Nom du tag"
                className={INPUT}
              />
              <button type="button" onClick={() => { setAjout(false); setSaisie(""); }} className="btn-contour btn-contour-sm text-ink shrink-0">
                Fermer
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {proposes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => ajouter(t)}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[12.5px] font-semibold text-ink cursor-pointer hover:border-accent hover:text-accent transition-colors duration-150"
                >
                  <Plus size={12} aria-hidden /> {t}
                </button>
              ))}
              {nouveau ? (
                <button
                  type="button"
                  onClick={() => ajouter(saisie)}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-accent bg-surface px-2.5 py-1 text-[12.5px] font-semibold text-accent cursor-pointer hover:bg-accent-soft transition-colors duration-150"
                >
                  <Plus size={12} aria-hidden /> Créer « {saisie.trim()} »
                </button>
              ) : null}
              {!proposes.length && !nouveau ? <span className="text-[12.5px] text-muted">Tapez le nom d’un nouveau tag.</span> : null}
            </div>
          </div>
        ) : null}

        <p className="m-0 mt-2 min-h-[18px] text-[12px]" aria-live="polite">
          {erreur ? <span className="text-bad">{erreur}</span> : enCours ? <span className="text-faint">Enregistrement…</span> : null}
        </p>
      </section>

      <Link href={`/admin/membres/${e.id}`} className="self-start inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent no-underline hover:underline">
        Ouvrir la fiche du membre <ExternalLink size={14} aria-hidden />
      </Link>
    </div>
  );
}

// Une entreprise sur la page d'un tag : un clic ouvre sa fiche (contact principal, tags) ; « Retirer » la sort du tag
export function LigneEntrepriseTag({ entreprise: e, tousTags, tag }: { entreprise: EntrepriseContact; tousTags: string[]; tag: string }) {
  const [ouvert, setOuvert] = useState(false);
  const c = e.contact;
  return (
    <tr
      className="border-b border-line last:border-b-0 hover:bg-surface-2 cursor-pointer transition-colors duration-150"
      onClick={(ev) => {
        if ((ev.target as HTMLElement).closest("a,button,dialog,form")) return;
        setOuvert(true);
      }}
    >
      <td className="px-5 py-3">
        <div className="flex items-center gap-3.5">
          <span className="w-[64px] flex justify-center shrink-0"><LogoMark member={e} size={36} /></span>
          <span className="min-w-0">
            <button type="button" onClick={() => setOuvert(true)} className="block p-0 border-0 bg-transparent font-semibold text-[14px] text-ink text-left cursor-pointer hover:text-accent">{e.nom}</button>
            <span className="block text-[12.3px] text-muted">{e.secteur} · {e.ville}</span>
          </span>
        </div>
        <Modal title="Fiche de l’entreprise" ouvert={ouvert} onFermer={() => setOuvert(false)}>
          {() => <FicheEntreprise entreprise={e} tousTags={tousTags} />}
        </Modal>
      </td>
      <td className="px-5 py-3">
        {c ? (
          <>
            <div className="font-semibold text-ink">{c.nom}</div>
            <div className="text-[12.3px] text-muted">{c.fonction}</div>
          </>
        ) : <span className="text-faint">Aucun contact</span>}
      </td>
      <td className="px-5 py-3">
        {c ? (
          <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 text-accent no-underline hover:underline"><Mail size={13} />{c.email}</a>
        ) : <span className="text-faint">—</span>}
      </td>
      <td className="px-5 py-3 text-right">
        <form action={retirerEtiquetteEntreprise}>
          <input type="hidden" name="nom" value={tag} />
          <input type="hidden" name="memberId" value={e.id} />
          <button type="submit" aria-label={`Retirer ${e.nom} du tag`} className="inline-flex items-center gap-1 border-0 bg-transparent text-[13px] font-semibold text-muted hover:text-bad cursor-pointer whitespace-nowrap">
            <X size={14} /> Retirer
          </button>
        </form>
      </td>
    </tr>
  );
}
