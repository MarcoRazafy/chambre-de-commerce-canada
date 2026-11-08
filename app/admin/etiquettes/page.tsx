import Link from "next/link";
import { Tag, Trash2, X } from "lucide-react";
import { EnTeteAdmin, Panneau, Vide } from "@/components/admin/ui";
import { Card, Saillant } from "@/components/ui";
import { attribuerEtiquette, renommerEtiquette, retirerEtiquetteMembre, supprimerEtiquette } from "@/lib/actions/maillage";
import { prisma } from "@/lib/db";

const CHAMP = "w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.5px] outline-none focus:border-accent";

// Étiquettes : repères internes posés sur les membres (segments pour la newsletter, suivis…)
export default async function AdminEtiquettes({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const choisie = (await searchParams).e ?? null;
  const membres = await prisma.member.findMany({
    where: { statut: { notIn: ["refusee"] } },
    select: { id: true, nom: true, etiquettes: true },
    orderBy: { nom: "asc" },
  });
  const compte = new Map<string, number>();
  for (const m of membres) for (const e of m.etiquettes) compte.set(e, (compte.get(e) ?? 0) + 1);
  const etiquettes = [...compte.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
  const avec = choisie ? membres.filter((m) => m.etiquettes.includes(choisie)) : [];
  const sans = choisie ? membres.filter((m) => !m.etiquettes.includes(choisie)) : membres;

  return (
    <>
      <EnTeteAdmin surtitre="Communication" titre={<>Les <Saillant>étiquettes</Saillant></>}>
        Des repères internes sur les membres : ils servent à cibler une newsletter ou à suivre un groupe. Le membre ne les voit pas.
      </EnTeteAdmin>

      <div className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="p-0 overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-line font-semibold">{etiquettes.length} étiquette{etiquettes.length > 1 ? "s" : ""}</div>
          {etiquettes.length ? (
            <ul className="list-none m-0 p-2">
              {etiquettes.map(([nom, n]) => (
                <li key={nom}>
                  <Link href={`/admin/etiquettes?e=${encodeURIComponent(nom)}`}
                    className={`flex items-center gap-2.5 rounded-[var(--radius-s)] px-3 py-2 no-underline text-[13.6px] ${nom === choisie ? "bg-accent-soft text-accent-strong font-semibold" : "text-ink hover:bg-surface-2"}`}>
                    <Tag size={14} className="shrink-0" /><span className="flex-1 truncate">{nom}</span>
                    <span className="text-[12px] text-muted">{n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Vide icone={<Tag size={24} />}>Aucune étiquette pour l’instant.</Vide>}
        </Card>

        <div className="flex flex-col gap-4 min-w-0">
          {choisie ? (
            <Panneau
              titre={<>« {choisie} »</>}
              sousTitre={`${avec.length} membre${avec.length > 1 ? "s" : ""}`}
              teinte="rouge"
              action={
                <form action={supprimerEtiquette}>
                  <input type="hidden" name="nom" value={choisie} />
                  <button type="submit" className="btn-contour btn-contour-sm text-bad"><Trash2 size={14} /> Supprimer l’étiquette</button>
                </form>
              }
            >
              <form action={renommerEtiquette} className="flex gap-2 flex-wrap items-center mb-4">
                <input type="hidden" name="ancien" value={choisie} />
                <input name="nouveau" defaultValue={choisie} aria-label="Nouveau nom" className={`${CHAMP} max-w-[300px]`} />
                <button type="submit" className="btn-contour btn-contour-sm text-ink">Renommer</button>
              </form>
              {avec.length ? (
                <ul className="list-none m-0 p-0 flex flex-wrap gap-2">
                  {avec.map((m) => (
                    <li key={m.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface pl-3 pr-1.5 py-1 text-[13px]">
                      <Link href={`/admin/membres/${m.id}`} className="text-ink no-underline hover:text-accent font-semibold">{m.nom}</Link>
                      <form action={retirerEtiquetteMembre}>
                        <input type="hidden" name="nom" value={choisie} />
                        <input type="hidden" name="memberId" value={m.id} />
                        <button type="submit" aria-label={`Retirer ${m.nom}`} className="grid place-items-center w-6 h-6 rounded-full border-0 bg-transparent text-muted hover:text-bad cursor-pointer"><X size={13} /></button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : <p className="m-0 text-[13px] text-muted">Aucun membre n’a cette étiquette.</p>}
            </Panneau>
          ) : null}

          <Panneau titre={choisie ? `Ajouter « ${choisie} » à des membres` : "Poser une étiquette"} sousTitre="Choisissez les membres (Ctrl ou Maj pour en sélectionner plusieurs)" teinte="bleu">
            <form action={attribuerEtiquette} className="flex flex-col gap-3">
              {choisie ? <input type="hidden" name="nom" value={choisie} /> : (
                <input name="nom" required placeholder="Nom de l’étiquette, ex. « Exportateurs », « VIP gala »" aria-label="Nom de l’étiquette" className={CHAMP} />
              )}
              <select name="membres" multiple size={10} required aria-label="Membres" className={CHAMP}>
                {sans.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
              <button type="submit" className="btn-action btn-action-sm self-start"><Tag size={14} /> Ajouter l’étiquette</button>
            </form>
          </Panneau>
        </div>
      </div>
    </>
  );
}
