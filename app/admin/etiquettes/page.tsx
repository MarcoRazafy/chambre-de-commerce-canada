import Link from "next/link";
import { ChevronLeft, ChevronRight, Tag, Trash2, X } from "lucide-react";
import { ChoixMembres, NouveauTag } from "@/components/admin/Tags";
import { EnTeteAdmin, Panneau, Vide } from "@/components/admin/ui";
import { Card, Saillant } from "@/components/ui";
import { attribuerEtiquette, renommerEtiquette, retirerEtiquetteMembre, supprimerEtiquette } from "@/lib/actions/maillage";
import { prisma } from "@/lib/db";

const CHAMP = "w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.5px] outline-none focus:border-accent";
const APERCU = 4;

const lienTag = (nom: string) => `/admin/etiquettes?e=${encodeURIComponent(nom)}`;

// Tags : repères internes posés sur les membres (segments pour la newsletter, suivis…)
export default async function AdminEtiquettes({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const choisi = (await searchParams).e ?? null;
  const membres = await prisma.member.findMany({
    where: { statut: { notIn: ["refusee"] } },
    select: { id: true, nom: true, etiquettes: true },
    orderBy: { nom: "asc" },
  });

  const parTag = new Map<string, { id: string; nom: string }[]>();
  for (const m of membres) for (const e of m.etiquettes) parTag.set(e, [...(parTag.get(e) ?? []), { id: m.id, nom: m.nom }]);
  const tags = [...parTag.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
  const tousMembres = membres.map(({ id, nom }) => ({ id, nom }));

  const titre = <>Les <Saillant>tags</Saillant></>;

  if (choisi) {
    const avec = parTag.get(choisi) ?? [];
    const sans = tousMembres.filter((m) => !avec.some((a) => a.id === m.id));
    return (
      <>
        <Link href="/admin/etiquettes" className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted no-underline hover:text-accent mb-3">
          <ChevronLeft size={15} /> Tous les tags
        </Link>
        <EnTeteAdmin
          surtitre="Tag"
          titre={<span className="inline-flex items-center gap-2.5"><Tag size={26} className="text-accent" /> {choisi}</span>}
          actions={
            <form action={supprimerEtiquette}>
              <input type="hidden" name="nom" value={choisi} />
              <button type="submit" className="btn-contour btn-contour-sm text-bad"><Trash2 size={14} /> Supprimer le tag</button>
            </form>
          }
        />

        <div className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-2">
          <Panneau titre={`${avec.length} membre${avec.length > 1 ? "s" : ""}`} teinte="rouge">
            <form action={renommerEtiquette} className="flex gap-2 flex-wrap items-center mb-4">
              <input type="hidden" name="ancien" value={choisi} />
              <input name="nouveau" defaultValue={choisi} aria-label="Nom du tag" className={`${CHAMP} max-w-[300px]`} />
              <button type="submit" className="btn-contour btn-contour-sm text-ink">Renommer</button>
            </form>
            {avec.length ? (
              <ul className="list-none m-0 p-0 flex flex-wrap gap-2">
                {avec.map((m) => (
                  <li key={m.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface pl-3 pr-1.5 py-1 text-[13px]">
                    <Link href={`/admin/membres/${m.id}`} className="text-ink no-underline hover:text-accent font-semibold">{m.nom}</Link>
                    <form action={retirerEtiquetteMembre}>
                      <input type="hidden" name="nom" value={choisi} />
                      <input type="hidden" name="memberId" value={m.id} />
                      <button type="submit" aria-label={`Retirer ${m.nom}`} className="grid place-items-center w-6 h-6 rounded-full border-0 bg-transparent text-muted hover:text-bad cursor-pointer"><X size={13} /></button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : <p className="m-0 text-[13px] text-muted">Aucun membre n’a ce tag.</p>}
          </Panneau>

          <Panneau titre="Ajouter des membres" teinte="bleu">
            <form action={attribuerEtiquette} className="flex flex-col gap-3">
              <input type="hidden" name="nom" value={choisi} />
              <ChoixMembres membres={sans} />
              {sans.length ? (
                <button type="submit" className="btn-action btn-action-sm self-start"><Tag size={14} /> Ajouter au tag</button>
              ) : null}
            </form>
          </Panneau>
        </div>
      </>
    );
  }

  return (
    <>
      <EnTeteAdmin surtitre="Communication" titre={titre} actions={<NouveauTag membres={tousMembres} />} />

      {tags.length ? (
        <Card className="p-0 overflow-hidden">
          <table className="w-full border-collapse text-[13.4px]">
            <thead>
              <tr className="bg-surface-2">
                {["Tag", "Membres", ""].map((t, i) => (
                  <th key={i} className={`text-left surtitre text-faint font-semibold px-5 py-3 border-b border-line ${i === 1 ? "hidden md:table-cell" : ""}`}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tags.map(([nom, ms]) => (
                <tr key={nom} className="border-b border-line last:border-b-0 hover:bg-surface-2">
                  <td className="px-5 py-3.5">
                    <Link href={lienTag(nom)} className="flex items-center gap-3 no-underline">
                      <span className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-accent-soft text-accent-strong"><Tag size={16} /></span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-[14px] text-ink hover:text-accent truncate">{nom}</span>
                        <span className="block text-[12.5px] text-muted">{ms.length} membre{ms.length > 1 ? "s" : ""}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1.5">
                      {ms.slice(0, APERCU).map((m) => (
                        <span key={m.id} className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[12.5px] text-ink">{m.nom}</span>
                      ))}
                      {ms.length > APERCU ? <span className="px-1 py-0.5 text-[12.5px] text-muted">+{ms.length - APERCU}</span> : null}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={lienTag(nom)} className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent no-underline hover:underline whitespace-nowrap">
                      Gérer <ChevronRight size={15} />
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
