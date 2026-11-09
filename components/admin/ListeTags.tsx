import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Search,
  Tag,
  Tags,
  Trophy,
  Users,
} from "lucide-react";
import { FiltresAuto } from "@/components/FiltresAuto";
import { Compteur, Vide } from "@/components/admin/ui";
import { Avatar, Card } from "@/components/ui";
import { initials as initiales } from "@/lib/format";

export interface ResumeTag {
  nom: string;
  contacts: { id: string; nom: string; photo: string | null }[];
  entreprises: string[];
}

const VISAGES = 5;
const ENTREPRISES = 2;
const CHAMP =
  "rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.5px] outline-none focus:border-accent";

// Liste des tags : chiffres clés, recherche et tri, puis une carte par tag (qui, de quelles entreprises)
export function ListeTags({
  tags,
  totalTags,
  contactsTagues,
  totalContacts,
  entreprisesTaguees,
  q,
  tri,
}: {
  tags: ResumeTag[];
  totalTags: number;
  contactsTagues: number;
  totalContacts: number;
  entreprisesTaguees: number;
  q: string;
  tri: "nombre" | "nom";
}) {
  const plusUtilise = [...tags].sort(
    (a, b) => b.contacts.length - a.contacts.length,
  )[0];
  const part = totalContacts
    ? Math.round((contactsTagues / totalContacts) * 100)
    : 0;

  return (
    <>
      <div className="grid gap-4 mb-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Compteur
          icone={<Tags size={20} />}
          libelle="Tags"
          valeur={totalTags}
          detail="Repères de l’équipe"
        />
        <Compteur
          icone={<Users size={20} />}
          libelle="Contacts tagués"
          valeur={contactsTagues}
          detail={`${part} % des ${totalContacts} contacts`}
          teinte="bleu"
        />
        <Compteur
          icone={<Building2 size={20} />}
          libelle="Entreprises concernées"
          valeur={entreprisesTaguees}
          detail="Au moins un contact tagué"
          teinte="vert"
        />
        <Compteur
          icone={<Trophy size={20} />}
          libelle="Le plus utilisé"
          valeur={
            <span className="block truncate text-[22px] leading-[1.3]">
              {plusUtilise?.nom ?? "—"}
            </span>
          }
          detail={
            plusUtilise
              ? `${plusUtilise.contacts.length} contact${plusUtilise.contacts.length > 1 ? "s" : ""}`
              : "Aucun tag"
          }
          teinte="bleu"
        />
      </div>

      <FiltresAuto
        action="/admin/etiquettes"
        className="flex gap-2.5 flex-wrap items-center mb-4"
      >
        <div className="relative flex-1 min-w-[220px] max-w-[420px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Rechercher un tag…"
            aria-label="Rechercher un tag"
            className={`${CHAMP} w-full pl-9`}
          />
        </div>
        <select
          name="tri"
          defaultValue={tri}
          aria-label="Trier les tags"
          className={CHAMP}
        >
          <option value="nombre">Les plus utilisés</option>
          <option value="nom">De A à Z</option>
        </select>
        <span className="text-[13px] text-muted">
          {tags.length} tag{tags.length > 1 ? "s" : ""}
          {q ? ` sur ${totalTags}` : ""}
        </span>
      </FiltresAuto>

      {tags.length ? (
        <ul className="list-none m-0 p-0 grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {tags.map((t) => (
            <li key={t.nom} className="min-w-0">
              <CarteTag tag={t} />
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <Vide icone={<Tag size={26} />}>
            {q
              ? "Aucun tag ne correspond à cette recherche."
              : "Aucun tag pour l’instant."}
          </Vide>
        </Card>
      )}
    </>
  );
}

function CarteTag({ tag }: { tag: ResumeTag }) {
  const n = tag.contacts.length;
  const autresVisages = n - VISAGES;
  const autresEntreprises = tag.entreprises.length - ENTREPRISES;
  return (
    <Link
      href={`/admin/etiquettes?e=${encodeURIComponent(tag.nom)}`}
      className="group block h-full no-underline rounded-[var(--radius-m)] outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <Card className="h-full p-5 flex flex-col gap-4 transition-[border-color,box-shadow,transform] duration-200 ease-out group-hover:border-accent/50 group-hover:shadow-md group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-2 min-w-0">
            <Tag size={16} className="shrink-0 text-accent" aria-hidden />
            <span className="font-semibold text-[15.5px] text-ink truncate">
              {tag.nom}
            </span>
          </span>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-surface-2 border border-line px-2.5 py-0.5 text-[12.5px] font-semibold text-ink tabular-nums">
            {n} contact{n > 1 ? "s" : ""}
          </span>
        </div>

        <div
          className="flex items-center"
          aria-label={tag.contacts.map((c) => c.nom).join(", ")}
        >
          {tag.contacts.slice(0, VISAGES).map((c, i) => (
            <span
              key={c.id}
              className={`rounded-full ring-2 ring-surface ${i ? "-ml-2.5" : ""}`}
              title={c.nom}
            >
              <Avatar
                initials={initiales(c.nom)}
                src={c.photo}
                alt=""
                size={34}
                className="bg-accent-soft text-accent-strong"
              />
            </span>
          ))}
          {autresVisages > 0 ? (
            <span className="-ml-2.5 w-[34px] h-[34px] rounded-full ring-2 ring-surface bg-surface-3 text-muted text-[12px] font-bold grid place-items-center tabular-nums">
              +{autresVisages}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5 text-[12.5px]">
          {tag.entreprises.slice(0, ENTREPRISES).map((e) => (
            <span
              key={e}
              className="inline-flex items-center gap-1 max-w-full rounded-full border border-line px-2.5 py-0.5 text-muted"
            >
              <Building2 size={12} className="shrink-0" aria-hidden />
              <span className="truncate">{e}</span>
            </span>
          ))}
          {autresEntreprises > 0 ? (
            <span className="rounded-full px-1.5 py-0.5 text-muted whitespace-nowrap">
              +{autresEntreprises} entreprise{autresEntreprises > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>

        <span className="mt-auto pt-3 border-t border-line inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent">
          Voir les contacts
          <ArrowRight
            size={15}
            className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden
          />
        </span>
      </Card>
    </Link>
  );
}
