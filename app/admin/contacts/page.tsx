import Link from "next/link";
import { Contact as IconeContact, Download, Mail, Phone, Search, Tag } from "lucide-react";
import { FiltresAuto } from "@/components/FiltresAuto";
import { EnTeteAdmin, Vide } from "@/components/admin/ui";
import { Avatar, Card, Pill, Saillant } from "@/components/ui";
import { getTagsContacts, getTousContacts, lireFiltresContacts } from "@/lib/contacts-admin";
import { initials as initiales } from "@/lib/format";

const TAGS_VISIBLES = 3;
const CHAMP = "rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.5px] outline-none focus:border-accent";

// Contacts : les personnes de toutes les entreprises membres, à joindre ou à exporter
export default async function AdminContacts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const f = lireFiltresContacts(sp);
  const [contacts, tags] = await Promise.all([getTousContacts(f), getTagsContacts()]);
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
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-surface-2 align-middle">
                  <td className="px-4 py-3 border-b border-line">
                    <div className="flex items-center gap-3">
                      <Avatar initials={initiales(c.nom)} src={c.photo} alt="" size={36} />
                      <div className="min-w-0">
                        <div className="font-semibold text-ink">{c.nom}</div>
                        <div className="text-[12.3px] text-muted">{c.fonction}</div>
                      </div>
                      {c.contactPrincipal ? <Pill tone="warn">Principal</Pill> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-line">
                    {c.member ? <Link href={`/admin/membres/${c.member.id}`} className="font-semibold text-ink no-underline hover:text-accent">{c.member.nom}</Link> : "—"}
                  </td>
                  <td className="px-4 py-3 border-b border-line">
                    <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-accent no-underline hover:underline"><Mail size={13} />{c.email}</a>
                    {c.tel ? <a href={`tel:${c.tel.replace(/\s/g, "")}`} className="flex items-center gap-1.5 text-muted no-underline mt-0.5"><Phone size={13} />{c.tel}</a> : null}
                  </td>
                  <td className="px-4 py-3 border-b border-line">
                    {c.etiquettes.length ? (
                      <div className="flex flex-wrap gap-1.5 max-w-[240px]">
                        {c.etiquettes.slice(0, TAGS_VISIBLES).map((t) => (
                          <Link key={t} href={`/admin/etiquettes?e=${encodeURIComponent(t)}`} title={`Voir les contacts « ${t} »`}
                            className="inline-flex items-center gap-1 max-w-full rounded-full bg-accent-soft text-accent-strong px-2.5 py-0.5 text-[12px] font-semibold no-underline whitespace-nowrap hover:bg-accent hover:text-white transition-colors duration-150">
                            <Tag size={11} className="shrink-0" aria-hidden /><span className="truncate">{t}</span>
                          </Link>
                        ))}
                        {c.etiquettes.length > TAGS_VISIBLES ? (
                          <span className="px-1 py-0.5 text-[12px] text-muted whitespace-nowrap" title={c.etiquettes.slice(TAGS_VISIBLES).join(", ")}>
                            +{c.etiquettes.length - TAGS_VISIBLES}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 border-b border-line">
                    {c.actif ? <Pill tone="ok">Actif</Pill> : <Pill tone="warn">Invitation en attente</Pill>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
