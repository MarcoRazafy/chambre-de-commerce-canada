import Link from "next/link";
import { ArrowRight, Building2, CircleDashed, Search, Tag, Tags, Trophy } from "lucide-react";
import { FiltresAuto } from "@/components/FiltresAuto";
import { Compteur, Vide } from "@/components/admin/ui";
import { LogoMark } from "@/components/domain";
import { Card } from "@/components/ui";
import { SANS_TAG } from "@/lib/filtres-contacts";
import type { MemberType } from "@/lib/types";

export interface ResumeTag {
  nom: string;
  entreprises: { id: string; nom: string; type: MemberType; photo: string | null; logo: string | null }[];
}

const LOGOS = 4;
const CHAMP =
  "rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.5px] outline-none focus:border-accent";
const pluriel = (n: number) => `${n} entreprise${n > 1 ? "s" : ""}`;

// Liste des tags : chiffres clés, recherche et tri, puis une carte par tag avec les logos des entreprises
export function ListeTags({
  tags,
  totalTags,
  entreprisesTaguees,
  totalEntreprises,
  q,
  tri,
}: {
  tags: ResumeTag[];
  totalTags: number;
  entreprisesTaguees: number;
  totalEntreprises: number;
  q: string;
  tri: "nombre" | "nom";
}) {
  const plusUtilise = [...tags].filter((t) => t.entreprises.length).sort((a, b) => b.entreprises.length - a.entreprises.length)[0];
  const part = totalEntreprises ? Math.round((entreprisesTaguees / totalEntreprises) * 100) : 0;
  const sansTag = totalEntreprises - entreprisesTaguees;

  return (
    <>
      <div className="grid gap-4 mb-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Compteur icone={<Tags size={20} />} libelle="Tags" valeur={totalTags} detail="Repères de l’équipe" />
        <Compteur
          icone={<Building2 size={20} />}
          libelle="Entreprises taguées"
          valeur={entreprisesTaguees}
          detail={`${part} % des ${totalEntreprises} entreprises`}
          teinte="bleu"
        />
        <Compteur
          icone={<CircleDashed size={20} />}
          libelle="Entreprises sans tag"
          valeur={sansTag}
          detail={sansTag ? "Voir et les taguer" : "Toutes sont taguées"}
          href={sansTag ? `/admin/contacts?tag=${SANS_TAG}` : undefined}
          teinte="vert"
        />
        <Compteur
          icone={<Trophy size={20} />}
          libelle="Le plus utilisé"
          valeur={<span className="block truncate text-[22px] leading-[1.3]">{plusUtilise?.nom ?? "—"}</span>}
          detail={plusUtilise ? pluriel(plusUtilise.entreprises.length) : "Aucun tag posé"}
          teinte="bleu"
        />
      </div>

      <FiltresAuto action="/admin/etiquettes" className="flex gap-2.5 flex-wrap items-center mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-[420px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" aria-hidden />
          <input type="search" name="q" defaultValue={q} placeholder="Rechercher un tag…" aria-label="Rechercher un tag" className={`${CHAMP} w-full pl-9`} />
        </div>
        <select name="tri" defaultValue={tri} aria-label="Trier les tags" className={CHAMP}>
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
          <Vide icone={<Tag size={26} />}>{q ? "Aucun tag ne correspond à cette recherche." : "Aucun tag pour l’instant."}</Vide>
        </Card>
      )}
    </>
  );
}

function CarteTag({ tag }: { tag: ResumeTag }) {
  const n = tag.entreprises.length;
  const autres = n - LOGOS;
  return (
    <Link
      href={`/admin/etiquettes?e=${encodeURIComponent(tag.nom)}`}
      className="group block h-full no-underline rounded-[var(--radius-m)] outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <Card className="h-full p-5 flex flex-col gap-4 transition-[border-color,box-shadow,transform] duration-200 ease-out group-hover:border-accent/50 group-hover:shadow-md group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-2 min-w-0">
            <Tag size={16} className="shrink-0 text-accent" aria-hidden />
            <span className="font-semibold text-[15.5px] text-ink truncate">{tag.nom}</span>
          </span>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-surface-2 border border-line px-2.5 py-0.5 text-[12.5px] font-semibold text-ink tabular-nums">
            {pluriel(n)}
          </span>
        </div>

        {n === 0 ? (
          <div className="flex items-center gap-2.5 rounded-[var(--radius-s)] border border-dashed border-line px-3 py-3 text-[13px] text-muted">
            <Building2 size={16} className="shrink-0" aria-hidden />
            Aucune entreprise pour l’instant
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-2" aria-label={tag.entreprises.map((e) => e.nom).join(", ")}>
              {tag.entreprises.slice(0, LOGOS).map((e) => (
                <span key={e.id} title={e.nom}>
                  <LogoMark member={e} size={30} />
                </span>
              ))}
              {autres > 0 ? (
                <span className="h-[30px] min-w-[30px] px-2 rounded-[var(--radius-s)] bg-surface-3 text-muted text-[12px] font-bold grid place-items-center tabular-nums">
                  +{autres}
                </span>
              ) : null}
            </div>
            <p className="m-0 mt-2.5 text-[12.5px] text-muted truncate">
              {tag.entreprises.slice(0, 2).map((e) => e.nom).join(", ")}
              {n > 2 ? ` et ${pluriel(n - 2)} de plus` : ""}
            </p>
          </div>
        )}

        <span className="mt-auto pt-3 border-t border-line inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent">
          {n ? "Voir les entreprises" : "Ajouter des entreprises"}
          <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
        </span>
      </Card>
    </Link>
  );
}
