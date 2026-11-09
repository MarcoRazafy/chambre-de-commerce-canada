import { Contact as IconeContact, Download, Search } from "lucide-react";
import { FiltresAuto } from "@/components/FiltresAuto";
import { EnTeteAdmin, Vide } from "@/components/admin/ui";
import { Card, Saillant } from "@/components/ui";
import { LigneContact } from "@/components/admin/LigneContact";
import { getTagsContacts, getTousContacts, getTousLesTags, lireFiltresContacts } from "@/lib/contacts-admin";

const CHAMP = "rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.5px] outline-none focus:border-accent";

// Contacts : les personnes de toutes les entreprises membres, à joindre ou à exporter
export default async function AdminContacts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const f = lireFiltresContacts(sp);
  const [contacts, tags, tousTags] = await Promise.all([getTousContacts(f), getTagsContacts(), getTousLesTags()]);
  const params = new URLSearchParams(Object.entries({ q: f.q, principal: f.principal ? "1" : "", acces: f.acces, tag: f.tag }).filter(([, v]) => v) as [string, string][]);

  return (
    <>
      <EnTeteAdmin
        surtitre="Adhérents"
        titre={<>Les <Saillant>contacts</Saillant></>}
        actions={
          <a href={`/admin/contacts/export?${params}`} className="btn-contour btn-contour-sm text-ink no-underline hover:bg-surface-2">
            <Download size={14} /> Exporter
          </a>
        } />

      <FiltresAuto action="/admin/contacts" className="flex gap-2.5 flex-wrap items-center mb-4">
        <select name="acces" defaultValue={f.acces} aria-label="Accès à la plateforme" className={CHAMP}>
          <option value="">Tous les accès</option>
          <option value="actif">Accès actif</option>
          <option value="invite">Invitation en attente</option>
        </select>
        {tags.length ? (
          <select name="tag" defaultValue={f.tag} aria-label="Tag" className={CHAMP}>
            <option value="">Tous les tags</option>
            {tags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        ) : null}
        <label className="inline-flex items-center gap-2 text-[13.5px] text-muted cursor-pointer">
          <input type="checkbox" name="principal" value="1" defaultChecked={f.principal} className="w-4 h-4 accent-[var(--accent)]" />
          Contacts principaux seulement
        </label>
        <div className="relative flex-1 min-w-[220px] max-w-[420px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
          <input type="search" name="q" defaultValue={f.q} placeholder="Nom, entreprise, e-mail, fonction…" aria-label="Rechercher un contact"
            className="w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink pl-9 pr-3 py-2.5 text-[13.5px] outline-none focus:border-accent" />
        </div>
        <span className="text-[13px] text-muted">{contacts.length} contact{contacts.length > 1 ? "s" : ""}</span>
      </FiltresAuto>

      {contacts.length === 0 ? (
        <Card><Vide icone={<IconeContact size={26} />}>Aucun contact ne correspond à ces critères.</Vide></Card>
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full border-collapse text-[13.4px]">
            <thead>
              <tr className="bg-surface-2">
                {["Contact", "Entreprise", "Coordonnées", "Tags", "Accès"].map((t) => (
                  <th key={t} className="text-left text-[11px] uppercase tracking-[0.07em] text-faint font-semibold px-4 py-3 border-b border-line whitespace-nowrap">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => <LigneContact key={c.id} contact={c} tousTags={tousTags} />)}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
