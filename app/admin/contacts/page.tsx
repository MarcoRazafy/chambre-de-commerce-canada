import { Contact as IconeContact, Download, Search } from "lucide-react";
import { FiltresAuto } from "@/components/FiltresAuto";
import { EnTeteAdmin, Vide } from "@/components/admin/ui";
import { Card, Saillant } from "@/components/ui";
import Link from "next/link";
import { FiltreCoches } from "@/components/FiltreCoches";
import { LigneEntreprise } from "@/components/admin/LigneEntreprise";
import { TaguerEntreprises } from "@/components/admin/Tags";
import { getEntreprisesContacts, getTagsEntreprises, getTousLesTags, lireFiltresContacts, parametresContacts } from "@/lib/contacts-admin";
import { SANS_TAG, SITUATIONS } from "@/lib/filtres-contacts";

// Contacts : une ligne par entreprise membre, avec son logo et son contact principal, à joindre, taguer ou exporter
export default async function AdminContacts({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const f = lireFiltresContacts(sp);
  const [entreprises, tags, tousTags] = await Promise.all([getEntreprisesContacts(f), getTagsEntreprises(), getTousLesTags()]);
  const params = parametresContacts(f);
  const filtre = params.size > 0;

  return (
    <>
      <EnTeteAdmin
        surtitre="Adhérents"
        titre={<>Les <Saillant>contacts</Saillant></>}
        actions={
          <a href={`/admin/contacts/export${filtre ? `?${params}` : ""}`} className="btn-contour btn-contour-sm text-ink no-underline hover:bg-surface-2">
            <Download size={14} /> Exporter
          </a>
        } />

      <FiltresAuto action="/admin/contacts" className="flex gap-2.5 flex-wrap items-center mb-3">
        <div className="relative flex-1 min-w-[220px] max-w-[420px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" aria-hidden />
          <input type="search" name="q" defaultValue={f.q} placeholder="Entreprise, contact, e-mail, secteur…" aria-label="Rechercher"
            className="w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink pl-9 pr-3 py-2.5 text-[13.5px] outline-none focus:border-accent" />
        </div>
        <FiltreCoches name="situation" libelle="Situations" tous="Toutes les situations" choisis={f.situations}
          groupes={SITUATIONS.map((g) => ({ famille: g.famille, options: [...g.options] }))} />
        {tags.length ? (
          <FiltreCoches name="tag" libelle="Tags" tous="Tous les tags" choisis={f.tags}
            groupes={[{ options: [{ valeur: SANS_TAG, libelle: "Sans tag" }] }, { famille: "Tags", options: tags.map((t) => ({ valeur: t, libelle: t })) }]} />
        ) : null}
        {filtre ? (
          <Link href="/admin/contacts" className="text-[13px] font-semibold text-muted no-underline hover:text-accent">Effacer les filtres</Link>
        ) : null}
      </FiltresAuto>

      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <span className="text-[13px] text-muted" aria-live="polite">
          {entreprises.length} entreprise{entreprises.length > 1 ? "s" : ""}{filtre ? " correspondent aux filtres" : ""}
        </span>
        <TaguerEntreprises ids={entreprises.map((e) => e.id)} tousTags={tousTags} retour={`/admin/contacts${params.size ? `?${params}` : ""}`} />
      </div>

      {entreprises.length === 0 ? (
        <Card><Vide icone={<IconeContact size={26} />}>Aucune entreprise ne correspond à ces critères.</Vide></Card>
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full border-collapse text-[13.4px]">
            <thead>
              <tr className="bg-surface-2">
                {["Entreprise", "Contact principal", "Coordonnées", "Tags", "Accès"].map((t) => (
                  <th key={t} className="text-left text-[11px] uppercase tracking-[0.07em] text-faint font-semibold px-4 py-3 border-b border-line whitespace-nowrap">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entreprises.map((e) => <LigneEntreprise key={e.id} entreprise={e} tousTags={tousTags} />)}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
