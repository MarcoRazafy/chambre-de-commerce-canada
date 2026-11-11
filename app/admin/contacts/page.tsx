import { Contact as IconeContact, Search } from "lucide-react";
import { LigneContactSeul } from "@/components/admin/LigneContactSeul";
import { FiltresAuto } from "@/components/FiltresAuto";
import { EnTeteAdmin, Onglets, Vide } from "@/components/admin/ui";
import { prisma } from "@/lib/db";
import { appliquerReglesTags } from "@/lib/tags-auto";
import { fmtDate } from "@/lib/format";
import { Card, Saillant } from "@/components/ui";
import Link from "next/link";
import { FiltreCoches } from "@/components/FiltreCoches";
import {
  AjouterContact,
  ImporterContacts,
} from "@/components/admin/ActionsContacts";
import { TableauEntreprises } from "@/components/admin/TableauEntreprises";
import {
  getEntreprisesContacts,
  getTousLesTags,
  lireFiltresContacts,
  parametresContacts,
} from "@/lib/contacts-admin";
import { SANS_TAG, SITUATIONS } from "@/lib/filtres-contacts";

// Contacts : une ligne par entreprise membre, avec son logo et son contact principal, à joindre, taguer ou exporter
export default async function AdminContacts({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  await appliquerReglesTags();
  // Deux onglets : les entreprises (avec leur contact principal), et les contacts sans entreprise
  const onglet = sp.onglet === "sans" ? "sans" : "avec";
  const f = lireFiltresContacts(sp);
  const params = parametresContacts(f);
  const filtre = params.size > 0;
  const retour = `/admin/contacts${filtre ? `?${params}` : ""}`;
  // Toutes les entreprises (pour « Ajouter un contact »), et celles que les filtres retiennent
  // Tous les tags, même ceux qu'aucune entreprise ne porte encore
  const [toutes, tousTags] = await Promise.all([getEntreprisesContacts(), getTousLesTags()]);
  const tags = tousTags;
  const entreprises = filtre ? await getEntreprisesContacts(f) : toutes;
  // Les contacts sans entreprise (ajoutés par l'équipe ou inscrits à la newsletter depuis la page publique)
  const nbSeuls = await prisma.abonne.count({ where: { desabonneLe: null } });
  const seuls = await prisma.abonne.findMany({
    where: { desabonneLe: null, ...(f.q ? { OR: [{ prenom: { contains: f.q, mode: "insensitive" } }, { email: { contains: f.q, mode: "insensitive" } }] } : {}) },
    orderBy: { createdAt: "desc" },
    select: { id: true, prenom: true, email: true, source: true, createdAt: true, erreurLe: true },
  });

  return (
    <>
      <EnTeteAdmin
        surtitre="Adhérents"
        titre={
          <>
            Les <Saillant>contacts</Saillant>
          </>
        }
        actions={
          <>
            <ImporterContacts />
            <AjouterContact
              entreprises={toutes.map(({ id, nom }) => ({ id, nom }))}
              retour={retour}
            />
          </>
        }
      />

      <Onglets
        actif={onglet}
        onglets={[
          { cle: "avec", libelle: "Avec entreprise", href: "/admin/contacts", compte: toutes.length },
          { cle: "sans", libelle: "Sans entreprise", href: "/admin/contacts?onglet=sans", compte: nbSeuls },
        ]}
      />

      {onglet === "sans" ? (
        <>
          <FiltresAuto action="/admin/contacts" className="flex gap-2.5 flex-wrap items-center mb-4">
            <input type="hidden" name="onglet" value="sans" />
            <div className="relative flex-1 min-w-[220px] max-w-[420px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" aria-hidden />
              <input type="search" name="q" defaultValue={f.q} placeholder="Nom ou courriel…" aria-label="Rechercher"
                className="w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink pl-9 pr-3 py-2.5 text-[13.5px] outline-none focus:border-accent" />
            </div>
            <span className="text-[13px] text-muted">{seuls.length} contact{seuls.length > 1 ? "s" : ""} · reçoivent la newsletter envoyée à tous</span>
          </FiltresAuto>
          {seuls.length ? (
            <Card className="p-0 overflow-hidden">
              <ul className="list-none m-0 p-0 [&>li:first-child]:border-t-0">
                {seuls.map((a) => (
                  <LigneContactSeul
                    key={a.id}
                    retour={`/admin/contacts?onglet=sans${f.q ? `&q=${encodeURIComponent(f.q)}` : ""}`}
                    contact={{
                      id: a.id,
                      prenom: a.prenom,
                      email: a.email,
                      origine: a.source === "vitrine" ? "Inscrit depuis le site" : a.source === "import" ? "Importé" : "Ajouté par l’équipe",
                      depuis: fmtDate(a.createdAt.toISOString().slice(0, 10), { day: "numeric", month: "short", year: "numeric" }),
                      erreur: !!a.erreurLe,
                    }}
                  />
                ))}
              </ul>
            </Card>
          ) : (
            <Card><Vide icone={<IconeContact size={26} />}>{f.q ? "Aucun contact ne correspond à cette recherche." : "Aucun contact sans entreprise pour l’instant."}</Vide></Card>
          )}
        </>
      ) : (
      <>
      <FiltresAuto
        action="/admin/contacts"
        className="flex gap-2.5 flex-wrap items-center mb-3"
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
            defaultValue={f.q}
            placeholder="Entreprise, contact, e-mail, secteur…"
            aria-label="Rechercher"
            className="w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink pl-9 pr-3 py-2.5 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
        <FiltreCoches
          name="situation"
          libelle="Situations"
          tous="Toutes les situations"
          choisis={f.situations}
          groupes={SITUATIONS.map((g) => ({
            famille: g.famille,
            options: [...g.options],
          }))}
        />
        {tags.length ? (
          <FiltreCoches
            name="tag"
            libelle="Tags"
            tous="Tous les tags"
            choisis={f.tags}
            groupes={[
              { options: [{ valeur: SANS_TAG, libelle: "Sans tag" }] },
              {
                famille: "Tags",
                options: tags.map((t) => ({ valeur: t, libelle: t })),
              },
            ]}
          />
        ) : null}
        {filtre ? (
          <Link
            href="/admin/contacts"
            className="text-[13px] font-semibold text-muted no-underline hover:text-accent"
          >
            Effacer les filtres
          </Link>
        ) : null}
      </FiltresAuto>

      {entreprises.length === 0 ? (
        <Card>
          <Vide icone={<IconeContact size={26} />}>
            Aucune entreprise ne correspond à ces critères.
          </Vide>
        </Card>
      ) : (
        <TableauEntreprises
          entreprises={entreprises}
          tousTags={tousTags}
          retour={retour}
        />
      )}

      </>
      )}
    </>
  );
}
