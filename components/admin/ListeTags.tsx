import Link from "next/link";
import { ArrowRight, Search, Tag, Tags } from "lucide-react";
import { FiltresAuto } from "@/components/FiltresAuto";
import { Compteur, Vide } from "@/components/admin/ui";
import { LogoMark } from "@/components/domain";
import { Card } from "@/components/ui";
import type { MemberType } from "@/lib/types";

export interface ResumeTag {
  nom: string;
  entreprises: { id: string; nom: string; type: MemberType; photo: string | null; logo: string | null }[];
  contacts: number;
}

const LOGOS = 4;
const CHAMP =
  "rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.5px] outline-none focus:border-accent";
const pluriel = (n: number) => `${n} contact${n > 1 ? "s" : ""}`;

export function ListeTags({ tags, totalTags, q, tri }: { tags: ResumeTag[]; totalTags: number; q: string; tri: "nombre" | "nom" }) {
  return (
    <>
      <div className="grid gap-4 mb-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Compteur icone={<Tags size={20} />} libelle="Tags" valeur={totalTags} />
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
        <Card className="p-0 overflow-x-auto">
          <table className="w-full border-collapse text-[13.4px]">
            <thead>
              <tr className="bg-surface-2">
                {["Tag", "Contacts", "", ""].map((t, i) => (
                  <th key={i} className={`surtitre text-faint font-semibold px-5 py-3 border-b border-line text-left ${i === 2 ? "hidden md:table-cell" : ""}`}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tags.map((t) => <LigneTag key={t.nom} tag={t} />)}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card>
          <Vide icone={<Tag size={26} />}>{q ? "Aucun tag ne correspond à cette recherche." : "Aucun tag pour l’instant."}</Vide>
        </Card>
      )}
    </>
  );
}

function LigneTag({ tag }: { tag: ResumeTag }) {
  const n = tag.entreprises.length;
  const c = tag.contacts;
  const autres = n - LOGOS;
  const lien = `/admin/etiquettes?e=${encodeURIComponent(tag.nom)}`;
  return (
    <tr className="border-b border-line last:border-b-0 hover:bg-surface-2 transition-colors duration-150">
      <td className="px-5 py-3">
        <Link href={lien} className="inline-flex items-center gap-2 font-semibold text-[14px] text-ink no-underline hover:text-accent">
          <Tag size={15} className="shrink-0 text-accent" aria-hidden /> {tag.nom}
        </Link>
      </td>
      <td className="px-5 py-3 tabular-nums text-ink whitespace-nowrap">
        {pluriel(n + c)}
      </td>
      <td className="px-5 py-3 hidden md:table-cell">
        {n ? (
          <div className="flex flex-wrap items-center gap-1.5" aria-label={tag.entreprises.map((e) => e.nom).join(", ")}>
            {tag.entreprises.slice(0, LOGOS).map((e) => (
              <span key={e.id} title={e.nom}><LogoMark member={e} size={24} /></span>
            ))}
            {autres > 0 ? <span className="h-6 min-w-6 px-1.5 rounded-[var(--radius-s)] bg-surface-3 text-muted text-[11.5px] font-bold grid place-items-center tabular-nums">+{autres}</span> : null}
          </div>
        ) : null}
      </td>
      <td className="px-5 py-3 text-right">
        <Link href={lien} className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent no-underline hover:underline whitespace-nowrap">
          {n || c ? "Voir" : "Ajouter"} <ArrowRight size={14} aria-hidden />
        </Link>
      </td>
    </tr>
  );
}
