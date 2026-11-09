import Link from "next/link";
import { ChevronLeft, ChevronRight, Mail, Tag, Trash2, X } from "lucide-react";
import { FiltresAuto } from "@/components/FiltresAuto";
import {
  AjouterContactsTag,
  NouveauTag,
  type ContactTag,
} from "@/components/admin/Tags";
import { EnTeteAdmin, Vide } from "@/components/admin/ui";
import { Avatar, Card, Saillant } from "@/components/ui";
import {
  renommerEtiquette,
  retirerEtiquetteContact,
  supprimerEtiquette,
} from "@/lib/actions/maillage";
import { prisma } from "@/lib/db";
import { initials as initiales } from "@/lib/format";

const CHAMP =
  "w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.5px] outline-none focus:border-accent";
const TH =
  "text-left surtitre text-faint font-semibold px-5 py-3 border-b border-line";

const lienTag = (nom: string) =>
  `/admin/etiquettes?e=${encodeURIComponent(nom)}`;

// Tags : repères internes posés sur les contacts (cibler une newsletter, suivre un groupe)
export default async function AdminEtiquettes({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; entreprise?: string }>;
}) {
  const sp = await searchParams;
  const choisi = sp.e ?? null;
  const lignes = await prisma.user.findMany({
    where: {
      role: "membre",
      memberId: { not: null },
      member: { statut: { notIn: ["refusee"] } },
    },
    select: {
      id: true,
      nom: true,
      fonction: true,
      email: true,
      photo: true,
      etiquettes: true,
      member: { select: { id: true, nom: true } },
    },
    orderBy: [{ nom: "asc" }],
  });
  const contacts = lignes.map((c) => ({
    ...c,
    entreprise: c.member?.nom ?? "",
  }));
  const pourChoix = (liste: typeof contacts): ContactTag[] =>
    liste.map(({ id, nom, email, entreprise }) => ({
      id,
      nom,
      email,
      entreprise,
    }));

  const parTag = new Map<string, number>();
  for (const c of contacts)
    for (const e of c.etiquettes) parTag.set(e, (parTag.get(e) ?? 0) + 1);
  const tags = [...parTag.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "fr"),
  );

  if (choisi) {
    const tous = contacts.filter((c) => c.etiquettes.includes(choisi));
    const sans = contacts.filter((c) => !c.etiquettes.includes(choisi));
    const entreprises = [
      ...new Map(
        tous.filter((c) => c.member).map((c) => [c.member!.id, c.member!.nom]),
      ).entries(),
    ].sort((a, b) => a[1].localeCompare(b[1], "fr"));
    const entreprise = entreprises.some(([id]) => id === sp.entreprise)
      ? sp.entreprise!
      : "";
    const avec = entreprise
      ? tous.filter((c) => c.member?.id === entreprise)
      : tous;
    return (
      <>
        <Link
          href="/admin/etiquettes"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted no-underline hover:text-accent mb-3"
        >
          <ChevronLeft size={15} /> Tous les tags
        </Link>
        <EnTeteAdmin
          surtitre="Tag"
          titre={choisi}
          actions={
            <>
              <form
                action={renommerEtiquette}
                className="flex gap-2 items-center"
              >
                <input type="hidden" name="ancien" value={choisi} />
                <input
                  name="nouveau"
                  defaultValue={choisi}
                  required
                  aria-label="Nom du tag"
                  className={`${CHAMP} w-[200px]`}
                />
                <button
                  type="submit"
                  className="btn-contour btn-contour-sm text-ink"
                >
                  Renommer
                </button>
              </form>
              <form action={supprimerEtiquette}>
                <input type="hidden" name="nom" value={choisi} />
                <button
                  type="submit"
                  className="btn-contour btn-contour-sm text-bad"
                >
                  <Trash2 size={14} /> Supprimer
                </button>
              </form>
              <AjouterContactsTag nom={choisi} contacts={pourChoix(sans)} />
            </>
          }
        />

        <Card className="p-0 overflow-x-auto">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3 flex-wrap">
            <span className="font-semibold text-ink">
              {avec.length} contact{avec.length > 1 ? "s" : ""}
              {entreprise ? ` sur ${tous.length}` : ""}
            </span>
            {entreprises.length > 1 ? (
              <FiltresAuto action="/admin/etiquettes" className="flex">
                <input type="hidden" name="e" value={choisi} />
                <select
                  name="entreprise"
                  defaultValue={entreprise}
                  aria-label="Entreprise"
                  className={`${CHAMP} w-auto min-w-[220px]`}
                >
                  <option value="">Toutes les entreprises</option>
                  {entreprises.map(([id, nom]) => (
                    <option key={id} value={id}>
                      {nom}
                    </option>
                  ))}
                </select>
              </FiltresAuto>
            ) : null}
          </div>
          {avec.length ? (
            <table className="w-full border-collapse text-[13.4px]">
              <thead>
                <tr className="bg-surface-2">
                  {["Contact", "Entreprise", "Courriel", ""].map((t, i) => (
                    <th key={i} className={TH}>
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {avec.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-line last:border-b-0 hover:bg-surface-2"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          initials={initiales(c.nom)}
                          src={c.photo}
                          alt=""
                          size={34}
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-ink">{c.nom}</div>
                          {c.fonction ? (
                            <div className="text-[12.3px] text-muted">
                              {c.fonction}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {c.member ? (
                        <Link
                          href={`/admin/membres/${c.member.id}`}
                          className="font-semibold text-ink no-underline hover:text-accent"
                        >
                          {c.member.nom}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <a
                        href={`mailto:${c.email}`}
                        className="inline-flex items-center gap-1.5 text-accent no-underline hover:underline"
                      >
                        <Mail size={13} />
                        {c.email}
                      </a>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <form action={retirerEtiquetteContact}>
                        <input type="hidden" name="nom" value={choisi} />
                        <input type="hidden" name="contactId" value={c.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 border-0 bg-transparent text-[13px] font-semibold text-muted hover:text-bad cursor-pointer whitespace-nowrap"
                        >
                          <X size={14} /> Retirer
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="m-0 px-5 pb-5 text-[13px] text-muted">
              Aucun contact n’a ce tag.
            </p>
          )}
        </Card>
      </>
    );
  }

  return (
    <>
      <EnTeteAdmin
        surtitre="Communication"
        titre={
          <>
            Les <Saillant>tags</Saillant>
          </>
        }
        actions={<NouveauTag contacts={pourChoix(contacts)} />}
      />

      {tags.length ? (
        <Card className="p-0 overflow-hidden">
          <table className="w-full border-collapse text-[13.4px]">
            <thead>
              <tr className="bg-surface-2">
                {["Tag", "Contacts", ""].map((t, i) => (
                  <th key={i} className={TH}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tags.map(([nom, n]) => (
                <tr
                  key={nom}
                  className="border-b border-line last:border-b-0 hover:bg-surface-2"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={lienTag(nom)}
                      className="inline-flex items-center gap-2 font-semibold text-[14px] text-ink no-underline hover:text-accent"
                    >
                      <Tag size={15} className="shrink-0 text-muted" /> {nom}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-ink">{n}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={lienTag(nom)}
                      className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent no-underline hover:underline whitespace-nowrap"
                    >
                      Voir les contacts <ChevronRight size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card>
          <Vide icone={<Tag size={26} />}>Aucun tag pour l’instant.</Vide>
        </Card>
      )}
    </>
  );
}
