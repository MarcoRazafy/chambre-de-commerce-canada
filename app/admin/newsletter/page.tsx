import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, ListChecks, Mail, MousePointerClick, Plus, Send, Trash2, Users } from "lucide-react";
import { Compteur, EnTeteAdmin, Vide } from "@/components/admin/ui";
import { Card, Pill, Saillant, TableWrap, Td, Th } from "@/components/ui";
import { annulerProgrammation, supprimerLettre } from "@/lib/actions/newsletter";
import { prisma } from "@/lib/db";
import { dateEnvoi, etatLettre, fmtDateHeure, fmtTaux, moyenne, suiviDe, taux, type EtatLettre } from "@/lib/lettres";
import { AUDIENCE_DEFAUT, destinataires } from "@/lib/newsletter";

const ORDRE: Record<EtatLettre, number> = { programmee: 0, brouillon: 1, envoyee: 2 };
const PASTILLE: Record<EtatLettre, [string, "info" | "muted" | "ok"]> = {
  programmee: ["Programmée", "info"],
  brouillon: ["Brouillon", "muted"],
  envoyee: ["Envoyée", "ok"],
};

// Newsletter : la lettre d'information, envoyée tout de suite ou programmée, et son suivi (ouvertures, clics)
export default async function AdminNewsletter({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  // Ancienne adresse de l'onglet « Abonnés »
  if ((await searchParams).onglet === "abonnes") redirect("/admin/abonnes");

  const [brutes, audience] = await Promise.all([
    prisma.lettre.findMany({
      orderBy: { updatedAt: "desc" },
      include: { envois: { select: { livreLe: true, ouvertLe: true, clicLe: true, erreurLe: true } } },
    }),
    destinataires(AUDIENCE_DEFAUT),
  ]);
  const lettres = brutes
    .map((l) => {
      const suivi = suiviDe(l.envois);
      const etat = etatLettre(l);
      // Le suivi ne porte que sur les lettres parties depuis sa mise en place
      const mesuree = etat === "envoyee" && suivi.envoyes > 0;
      return {
        ...l,
        etat,
        quand: dateEnvoi(l),
        ouverture: mesuree ? taux(suivi.ouverts, suivi.envoyes) : null,
        clics: mesuree ? taux(suivi.clics, suivi.envoyes) : null,
      };
    })
    .sort((a, b) => ORDRE[a.etat] - ORDRE[b.etat] || (b.quand ?? b.updatedAt).getTime() - (a.quand ?? a.updatedAt).getTime());

  const membres = audience.filter((d) => !d.abonne).length;
  const abonnes = audience.length - membres;
  const prochaine = lettres
    .filter((l) => l.etat === "programmee" && l.programmeeLe)
    .sort((a, b) => a.programmeeLe!.getTime() - b.programmeeLe!.getTime())[0];

  return (
    <>
      <EnTeteAdmin
        surtitre="Communication"
        titre={<Saillant>Newsletter</Saillant>}
        actions={
          <>
            <Link href="/admin/abonnes" className="btn-contour btn-contour-sm text-ink no-underline"><ListChecks size={15} /> Abonnés à la lettre</Link>
            <Link href="/admin/newsletter/nouvelle" className="btn-action btn-action-sm no-underline"><Plus size={15} /> Nouvelle lettre</Link>
          </>
        } />

      <div className="grid gap-4 mb-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Compteur icone={<Users size={20} />} libelle="Audience" valeur={audience.length} detail={`${membres} contact${membres > 1 ? "s" : ""} de membres + ${abonnes} abonné${abonnes > 1 ? "s" : ""}`} teinte="bleu" />
        <Compteur icone={<Mail size={20} />} libelle="Ouverture moyenne" valeur={fmtTaux(moyenne(lettres.map((l) => l.ouverture)))} detail="Des lettres suivies" teinte="vert" />
        <Compteur icone={<MousePointerClick size={20} />} libelle="Clics moyens" valeur={fmtTaux(moyenne(lettres.map((l) => l.clics)))} detail="Au moins un lien ouvert" teinte="bleu" />
        <Compteur
          icone={<CalendarClock size={20} />}
          libelle="Prochain envoi"
          valeur={<span className="text-[19px]">{prochaine ? fmtDateHeure(prochaine.programmeeLe!) : "—"}</span>}
          detail={prochaine ? prochaine.sujet : "Aucune lettre programmée"}
          teinte="rouge"
        />
      </div>

      {lettres.length ? (
        <TableWrap>
          <thead>
            <tr>
              <Th>Lettre</Th>
              <Th>Statut</Th>
              <Th>Envoi</Th>
              <Th className="text-right">Destinataires</Th>
              <Th className="text-right">Ouverture</Th>
              <Th className="text-right">Clics</Th>
              <Th><span className="sr-only">Actions</span></Th>
            </tr>
          </thead>
          <tbody>
            {lettres.map((l) => (
              <tr key={l.id}>
                <Td className="min-w-[220px]">
                  <Link href={`/admin/newsletter/${l.id}`} className="font-semibold text-ink no-underline hover:text-accent">{l.sujet}</Link>
                  {l.etat === "brouillon" ? <div className="text-[12px] text-muted">Par {l.auteur}</div> : null}
                </Td>
                <Td><Pill tone={PASTILLE[l.etat][1]}>{PASTILLE[l.etat][0]}</Pill></Td>
                <Td className="whitespace-nowrap tabular-nums">{l.etat !== "brouillon" && l.quand ? fmtDateHeure(l.quand) : "—"}</Td>
                <Td className="text-right tabular-nums">{l.etat === "brouillon" ? "—" : l.etat === "programmee" ? l.destinataires : l.envoyes}</Td>
                <Td className="text-right tabular-nums">{fmtTaux(l.ouverture)}</Td>
                <Td className="text-right tabular-nums">{fmtTaux(l.clics)}</Td>
                <Td className="text-right whitespace-nowrap">
                  {l.etat === "brouillon" ? (
                    <span className="inline-flex gap-2 justify-end">
                      <Link href={`/admin/newsletter/${l.id}#envoi`} className="btn-contour btn-contour-sm text-ink no-underline"><Send size={14} /> Programmer</Link>
                      <form action={supprimerLettre}>
                        <input type="hidden" name="id" value={l.id} />
                        <button type="submit" aria-label={`Supprimer le brouillon « ${l.sujet} »`} className="grid place-items-center w-8 h-8 rounded-[var(--radius-s)] border border-line bg-surface text-muted hover:text-bad cursor-pointer"><Trash2 size={14} /></button>
                      </form>
                    </span>
                  ) : l.etat === "programmee" ? (
                    <form action={annulerProgrammation}>
                      <input type="hidden" name="id" value={l.id} />
                      <button type="submit" className="btn-contour btn-contour-sm text-muted">Annuler</button>
                    </form>
                  ) : null}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      ) : (
        <Card><Vide icone={<Mail size={26} />}>Aucune lettre pour l’instant. « Nouvelle lettre » pour écrire la première.</Vide></Card>
      )}
    </>
  );
}
