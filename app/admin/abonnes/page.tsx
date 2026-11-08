import { AlertTriangle, MailPlus, Search, UserMinus, UserPlus, Users } from "lucide-react";
import { Compteur, EnTeteAdmin, Vide } from "@/components/admin/ui";
import { FiltresAuto } from "@/components/FiltresAuto";
import { AjouterAbonne, ImporterCsv } from "@/components/newsletter/AbonnesActions";
import { Card, Pill, Saillant, TableWrap, Td, Th } from "@/components/ui";
import { desabonner, inviterAAdherer, reabonner } from "@/lib/actions/newsletter";
import { prisma } from "@/lib/db";
import { fmtDate, today } from "@/lib/format";
import { libelleSource, STATUTS_ABONNE, statutAbonne, type StatutAbonne } from "@/lib/lettres";

const jour = (d: Date) => fmtDate(d.toISOString().slice(0, 10));
const PASTILLE: Record<StatutAbonne, "ok" | "muted" | "bad"> = { abonne: "ok", desabonne: "muted", erreur: "bad" };
const CHAMP = "border border-line bg-surface text-ink rounded-[var(--radius-s)] py-[9px] text-[13.6px]";

// Abonnés à la lettre : les personnes extérieures au réseau qui reçoivent la newsletter
export default async function AdminAbonnes({ searchParams }: { searchParams: Promise<{ q?: string; statut?: string }> }) {
  const p = await searchParams;
  const q = (p.q ?? "").trim();
  const filtre = STATUTS_ABONNE.some(([k]) => k === p.statut) ? (p.statut as StatutAbonne) : "";
  const tous = await prisma.abonne.findMany({ orderBy: { createdAt: "desc" } });
  const avecStatut = tous.map((a) => ({ ...a, statut: statutAbonne(a) }));
  const il30j = today().getTime() - 30 * 86_400_000;
  const compte = (s: StatutAbonne) => avecStatut.filter((a) => a.statut === s).length;
  const aiguille = q.toLowerCase();
  const liste = avecStatut.filter(
    (a) => (!filtre || a.statut === filtre) && (!aiguille || `${a.prenom} ${a.email}`.toLowerCase().includes(aiguille)),
  );

  return (
    <>
      <EnTeteAdmin
        surtitre="Communication"
        titre={<>Abonnés à la <Saillant>lettre</Saillant></>}
        actions={<><ImporterCsv /><AjouterAbonne /></>}
      >
        Les personnes inscrites à la lettre d’information sans être membres : depuis la page publique, un import ou un ajout de l’équipe. Elles reçoivent la newsletter, mais n’ont pas accès à l’espace membre.
      </EnTeteAdmin>

      <div className="grid gap-4 mb-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Compteur icone={<Users size={20} />} libelle="Abonnés" valeur={compte("abonne")} href="/admin/abonnes?statut=abonne" actif={filtre === "abonne"} teinte="vert" />
        <Compteur icone={<UserPlus size={20} />} libelle="Nouveaux (30 j)" valeur={tous.filter((a) => a.createdAt.getTime() >= il30j).length} teinte="bleu" />
        <Compteur icone={<UserMinus size={20} />} libelle="Désabonnés" valeur={compte("desabonne")} href="/admin/abonnes?statut=desabonne" actif={filtre === "desabonne"} teinte="degrade" />
        <Compteur icone={<AlertTriangle size={20} />} libelle="Adresses en erreur" valeur={compte("erreur")} href="/admin/abonnes?statut=erreur" actif={filtre === "erreur"} teinte="rouge" />
      </div>

      <Card className="p-5">
        <FiltresAuto action="/admin/abonnes" className="flex gap-3 flex-wrap mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
            <input type="search" name="q" defaultValue={q} placeholder="Rechercher un nom ou une adresse…" aria-label="Recherche" className={`${CHAMP} w-full pl-[34px] pr-3`} />
          </div>
          <select name="statut" defaultValue={filtre} aria-label="Statut" className={`${CHAMP} px-3 w-full sm:w-[220px]`}>
            <option value="">Tous les statuts</option>
            {STATUTS_ABONNE.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </FiltresAuto>

        {liste.length ? (
          <TableWrap>
            <thead>
              <tr>
                <Th>Abonné</Th>
                <Th>Source</Th>
                <Th>Inscrit le</Th>
                <Th>Statut</Th>
                <Th><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody>
              {liste.map((a) => (
                <tr key={a.id}>
                  <Td className="min-w-[200px]">
                    <div className="font-semibold text-ink">{a.prenom}</div>
                    <div className="text-[12.5px] text-muted break-all">{a.email}</div>
                  </Td>
                  <Td className="whitespace-nowrap">{libelleSource(a.source)}</Td>
                  <Td className="whitespace-nowrap tabular-nums">{jour(a.createdAt)}</Td>
                  <Td>
                    <Pill tone={PASTILLE[a.statut]}>{STATUTS_ABONNE.find(([k]) => k === a.statut)![1]}</Pill>
                    {a.inviteLe ? <div className="text-[11.5px] text-faint mt-1">Invité le {jour(a.inviteLe)}</div> : null}
                  </Td>
                  <Td className="text-right">
                    <span className="inline-flex gap-2 justify-end flex-wrap">
                      {a.statut === "abonne" ? (
                        <form action={desabonner}>
                          <input type="hidden" name="id" value={a.id} />
                          <button type="submit" className="btn-contour btn-contour-sm text-muted">Désabonner</button>
                        </form>
                      ) : (
                        <form action={reabonner}>
                          <input type="hidden" name="id" value={a.id} />
                          <button type="submit" className="btn-contour btn-contour-sm text-muted">Réabonner</button>
                        </form>
                      )}
                      {a.statut === "abonne" ? (
                        <form action={inviterAAdherer}>
                          <input type="hidden" name="id" value={a.id} />
                          <button type="submit" className="btn-contour btn-contour-sm text-ink"><MailPlus size={14} /> Inviter à adhérer</button>
                        </form>
                      ) : null}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        ) : (
          <Vide icone={<Users size={26} />}>{tous.length ? "Aucun abonné ne correspond." : "Aucun abonné pour l’instant."}</Vide>
        )}
      </Card>
    </>
  );
}
