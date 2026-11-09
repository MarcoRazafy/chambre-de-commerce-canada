import { Contact as IconeContact, Search } from "lucide-react";
import { FiltresAuto } from "@/components/FiltresAuto";
import { EnTeteAdmin, Vide } from "@/components/admin/ui";
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
  getTagsEntreprises,
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
  const f = lireFiltresContacts(sp);
  const params = parametresContacts(f);
  const filtre = params.size > 0;
  const retour = `/admin/contacts${filtre ? `?${params}` : ""}`;
  // Toutes les entreprises (pour « Ajouter un contact »), et celles que les filtres retiennent
  const [toutes, tags, tousTags] = await Promise.all([
    getEntreprisesContacts(),
    getTagsEntreprises(),
    getTousLesTags(),
  ]);
  const entreprises = filtre ? await getEntreprisesContacts(f) : toutes;

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
  );
}
