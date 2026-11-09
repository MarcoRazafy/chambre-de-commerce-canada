"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Building2, Mail, Phone, Plus, Tag, X } from "lucide-react";
import { Modal } from "@/components/Modal";
import { INPUT } from "@/components/form-bits";
import { Avatar, Pill } from "@/components/ui";
import { majTagsContact } from "@/lib/actions/maillage";
import { initials as initiales } from "@/lib/format";
import { plat } from "@/lib/texte";

export interface ContactLigne {
  id: string;
  nom: string;
  fonction: string;
  email: string;
  tel: string | null;
  photo: string | null;
  contactPrincipal: boolean;
  actif: boolean;
  etiquettes: string[];
  member: { id: string; nom: string } | null;
}

const TAGS_VISIBLES = 3;
const PASTILLE =
  "inline-flex items-center gap-1 max-w-full rounded-full bg-accent-soft text-accent-strong px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap";
const TD = "px-4 py-3 border-b border-line";

// Une ligne de la page Contacts : un clic ouvre la fiche du contact, avec ses tags à modifier
export function LigneContact({ contact: c, tousTags }: { contact: ContactLigne; tousTags: string[] }) {
  const [ouvert, setOuvert] = useState(false);
  const autres = c.etiquettes.length - TAGS_VISIBLES;

  return (
    <tr
      className="hover:bg-surface-2 align-middle cursor-pointer transition-colors duration-150"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a,button,dialog")) return;
        setOuvert(true);
      }}
    >
      <td className={TD}>
        <div className="flex items-center gap-3">
          <Avatar initials={initiales(c.nom)} src={c.photo} alt="" size={36} />
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setOuvert(true)}
              className="block p-0 border-0 bg-transparent font-semibold text-ink text-left cursor-pointer hover:text-accent focus-visible:outline-2 focus-visible:outline-accent rounded-sm"
            >
              {c.nom}
            </button>
            <div className="text-[12.3px] text-muted">{c.fonction}</div>
          </div>
          {c.contactPrincipal ? <Pill tone="warn">Principal</Pill> : null}
        </div>
        <Modal title="Fiche du contact" ouvert={ouvert} onFermer={() => setOuvert(false)}>
          {() => <FicheContact contact={c} tousTags={tousTags} />}
        </Modal>
      </td>
      <td className={TD}>
        {c.member ? (
          <Link href={`/admin/membres/${c.member.id}`} className="font-semibold text-ink no-underline hover:text-accent">
            {c.member.nom}
          </Link>
        ) : (
          "—"
        )}
      </td>
      <td className={TD}>
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
      </td>
      <td className={TD}>
        {c.etiquettes.length ? (
          <div className="flex flex-wrap gap-1.5 max-w-[240px]">
            {c.etiquettes.slice(0, TAGS_VISIBLES).map((t) => (
              <Link
                key={t}
                href={`/admin/etiquettes?e=${encodeURIComponent(t)}`}
                title={`Voir les contacts « ${t} »`}
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
                aria-label={`Voir les ${c.etiquettes.length} tags de ${c.nom}`}
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
      <td className={TD}>{c.actif ? <Pill tone="ok">Actif</Pill> : <Pill tone="warn">Invitation en attente</Pill>}</td>
    </tr>
  );
}

function FicheContact({ contact: c, tousTags }: { contact: ContactLigne; tousTags: string[] }) {
  const router = useRouter();
  const [tags, setTags] = useState(c.etiquettes);
  const [ajout, setAjout] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();

  const enregistrer = (liste: string[]) => {
    setTags(liste);
    demarrer(async () => {
      const r = await majTagsContact(c.id, liste);
      if (r.ok) {
        setTags(r.valeurs);
        setErreur("");
        router.refresh();
      } else {
        setTags(c.etiquettes);
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
        <Avatar initials={initiales(c.nom)} src={c.photo} alt="" size={56} className="bg-accent-soft text-accent-strong" />
        <div className="min-w-0">
          <div className="text-[17px] font-semibold text-ink">{c.nom}</div>
          {c.fonction ? <div className="text-[13px] text-muted">{c.fonction}</div> : null}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {c.contactPrincipal ? <Pill tone="warn">Principal</Pill> : null}
            {c.actif ? <Pill tone="ok">Actif</Pill> : <Pill tone="warn">Invitation en attente</Pill>}
          </div>
        </div>
      </div>

      <dl className="m-0 grid gap-2.5 text-[13.4px]">
        {c.member ? (
          <div className="flex items-center gap-2.5">
            <dt className="sr-only">Entreprise</dt>
            <Building2 size={15} className="shrink-0 text-muted" aria-hidden />
            <dd className="m-0">
              <Link href={`/admin/membres/${c.member.id}`} className="font-semibold text-ink no-underline hover:text-accent">
                {c.member.nom}
              </Link>
            </dd>
          </div>
        ) : null}
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
      </dl>

      <section className="border-t border-line pt-4">
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
          <p className="m-0 text-[13px] text-muted">Aucun tag pour ce contact.</p>
        )}

        {ajout ? (
          <div className="mt-4 rounded-[var(--radius-m)] border border-line bg-surface-2 p-3 flex flex-col gap-2.5">
            <div className="flex gap-2">
              <input
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
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
    </div>
  );
}
