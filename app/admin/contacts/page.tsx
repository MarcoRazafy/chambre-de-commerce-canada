import { Contact as IconeContact, Search, Trash2, User } from "lucide-react";
import { FiltresAuto } from "@/components/FiltresAuto";
import { EnTeteAdmin, Panneau, Vide } from "@/components/admin/ui";
import { retirerContactSeul } from "@/lib/actions/contacts";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { Card, Pill, Saillant } from "@/components/ui";
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
  // Les contacts sans entreprise (ajoutés par l'équipe ou inscrits à la newsletter depuis la page publique)
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

      {seuls.length > 0 && !f.situations.length && !f.tags.length ? (
        <Panneau titre="Contacts sans entreprise" sousTitre={`${seuls.length} personne${seuls.length > 1 ? "s" : ""} · reçoivent la newsletter envoyée à tous`} teinte="bleu" className="mt-4" corpsClassName="px-0 pb-0">
          <ul className="list-none m-0 p-0">
            {seuls.map((a) => (
              <li key={a.id} className="flex items-center gap-3.5 px-6 py-3 border-t border-line">
                <span className="w-9 h-9 shrink-0 rounded-full bg-surface-2 border border-line text-muted grid place-items-center"><User size={16} aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink truncate">{a.prenom || a.email}</div>
                  <a href={`mailto:${a.email}`} className="text-[12.5px] text-accent no-underline hover:underline break-all">{a.email}</a>
                </div>
                <span className="hidden sm:block text-[12px] text-muted whitespace-nowrap">
                  {a.source === "vitrine" ? "Inscrit depuis le site" : a.source === "import" ? "Importé" : "Ajouté par l’équipe"} · {fmtDate(a.createdAt.toISOString().slice(0, 10), { day: "numeric", month: "short", year: "numeric" })}
                </span>
                {a.erreurLe ? <Pill tone="warn">Adresse en erreur</Pill> : null}
                <form action={retirerContactSeul}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="retour" value={retour} />
                  <button type="submit" aria-label={`Retirer ${a.prenom || a.email}`} title="Retirer"
                    className="w-9 h-9 grid place-items-center rounded-[var(--radius-s)] border border-line bg-surface text-muted cursor-pointer hover:text-bad hover:border-bad"><Trash2 size={15} /></button>
                </form>
              </li>
            ))}
          </ul>
        </Panneau>
      ) : null}
    </>
  );
}
