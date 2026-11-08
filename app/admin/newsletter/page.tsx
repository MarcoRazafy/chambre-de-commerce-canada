import Link from "next/link";
import { Mail, Plus, Trash2, UserMinus, UserPlus } from "lucide-react";
import { EnTeteAdmin, Onglets, Panneau, Vide } from "@/components/admin/ui";
import { Card, Pill, Saillant } from "@/components/ui";
import { ajouterAbonne, desabonner, supprimerLettre } from "@/lib/actions/newsletter";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";

const CHAMP = "rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.5px] outline-none focus:border-accent";
const jour = (d: Date) => fmtDate(d.toISOString().slice(0, 10));

// Newsletter : les lettres envoyées et en brouillon, et les abonnés extérieurs au réseau
export default async function AdminNewsletter({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const onglet = (await searchParams).onglet === "abonnes" ? "abonnes" : "lettres";
  const [lettres, abonnes] = await Promise.all([
    prisma.lettre.findMany({ orderBy: [{ statut: "asc" }, { updatedAt: "desc" }] }),
    prisma.abonne.findMany({ orderBy: [{ desabonneLe: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }] }),
  ]);
  const actifs = abonnes.filter((a) => !a.desabonneLe).length;

  return (
    <>
      <EnTeteAdmin
        surtitre="Communication"
        titre={<>La <Saillant>newsletter</Saillant></>}
        actions={<Link href="/admin/newsletter/nouvelle" className="btn-action btn-action-sm no-underline"><Plus size={15} /> Nouvelle lettre</Link>}
      >
        Écrivez aux membres (selon leur statut et leurs étiquettes) et aux abonnés à la lettre d’information.
      </EnTeteAdmin>
      <Onglets
        actif={onglet}
        onglets={[
          { cle: "lettres", libelle: "Lettres", href: "/admin/newsletter", compte: lettres.length },
          { cle: "abonnes", libelle: "Abonnés", href: "/admin/newsletter?onglet=abonnes", compte: actifs },
        ]}
      />

      {onglet === "lettres" ? (
        lettres.length ? (
          <Card className="p-0 overflow-hidden">
            <ul className="list-none m-0 p-0">
              {lettres.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-line last:border-b-0">
                  <span className="tuile tuile-sm tuile-bleue shrink-0"><Mail size={18} /></span>
                  <Link href={`/admin/newsletter/${l.id}`} className="min-w-0 flex-1 no-underline group">
                    <span className="block font-semibold text-ink truncate group-hover:text-accent">{l.sujet}</span>
                    <span className="block text-[12.5px] text-muted">
                      {l.statut === "envoyee" ? `Envoyée le ${jour(l.envoyeeLe!)} · ${l.envoyes} destinataire${l.envoyes > 1 ? "s" : ""}` : `Brouillon · modifié le ${jour(l.updatedAt)} · ${l.auteur}`}
                    </span>
                  </Link>
                  {l.statut === "envoyee" ? <Pill tone="ok">Envoyée</Pill> : (
                    <>
                      <Pill tone="warn">Brouillon</Pill>
                      <form action={supprimerLettre}>
                        <input type="hidden" name="id" value={l.id} />
                        <button type="submit" aria-label="Supprimer le brouillon" className="grid place-items-center w-8 h-8 rounded-[var(--radius-s)] border border-line bg-surface text-muted hover:text-bad cursor-pointer"><Trash2 size={14} /></button>
                      </form>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card><Vide icone={<Mail size={26} />}>Aucune lettre pour l’instant. « Nouvelle lettre » pour écrire la première.</Vide></Card>
        )
      ) : (
        <div className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="p-0 overflow-hidden">
            {abonnes.length ? (
              <ul className="list-none m-0 p-0">
                {abonnes.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3 border-b border-line last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-ink">{a.prenom}</div>
                      <div className="text-[12.5px] text-muted">{a.email} · depuis le {jour(a.createdAt)}</div>
                    </div>
                    {a.desabonneLe ? <Pill tone="bad">Désabonné le {jour(a.desabonneLe)}</Pill> : (
                      <form action={desabonner}>
                        <input type="hidden" name="id" value={a.id} />
                        <button type="submit" className="btn-contour btn-contour-sm text-muted"><UserMinus size={14} /> Désabonner</button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            ) : <Vide icone={<Mail size={26} />}>Aucun abonné extérieur pour l’instant.</Vide>}
          </Card>
          <Panneau titre="Ajouter un abonné" sousTitre="Une personne extérieure qui souhaite recevoir la lettre" teinte="bleu">
            <form action={ajouterAbonne} className="flex flex-col gap-2.5">
              <input name="prenom" placeholder="Prénom" aria-label="Prénom" className={CHAMP} />
              <input name="email" type="email" required placeholder="adresse@exemple.com" aria-label="Adresse e-mail" className={CHAMP} />
              <button type="submit" className="btn-action btn-action-sm self-start"><UserPlus size={14} /> Abonner</button>
            </form>
          </Panneau>
        </div>
      )}
    </>
  );
}
