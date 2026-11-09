import Link from "next/link";
import { Plus } from "lucide-react";
import { EnTeteAdmin, Panneau } from "@/components/admin/ui";
import { Card, Pill, Saillant, TableWrap, Td, Th } from "@/components/ui";
import { aujourdhuiISO, fmtDate } from "@/lib/format";
import { configPlateforme, facturePlateforme, fmtDollars, fmtPourcent, prochaineFacturation } from "@/lib/plateforme";
import { getAdministrateurs } from "@/lib/queries-admin";
import { getCurrentUser } from "@/lib/session";

// Abonnement de la Chambre à la plateforme : forfait + comptes actifs de l'équipe (ceux d'« Équipe & accès »)
export default async function AdminAbonnement() {
  const [moi, equipe] = await Promise.all([getCurrentUser("admin"), getAdministrateurs()]);
  const c = configPlateforme();
  const n = equipe.length;
  const f = facturePlateforme(n, c);
  const echeance = prochaineFacturation(aujourdhuiISO(), c.jourFacturation);
  const bloc = "rounded-[var(--radius-m)] border border-line bg-surface-2 px-4 py-2.5 flex flex-col";
  const ligne = "flex justify-between gap-3 items-baseline tabular-nums";

  return (
    <>
      <EnTeteAdmin surtitre="Plateforme" titre={<>Abonnement &amp; <Saillant>utilisateurs</Saillant></>} />

      <div className="grid gap-4 mb-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card className="p-6 flex flex-col gap-4">
          <div className="flex justify-between items-start gap-3 flex-wrap">
            <div>
              <span className="surtitre text-faint">Forfait actuel</span>
              <h2 className="text-[18px] m-0 mt-1">{c.nom}</h2>
            </div>
            <Pill tone="ok">Actif · prochaine facture le {fmtDate(echeance)}</Pill>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-[16px]">
            <div className={bloc}><small className="text-[12px] text-muted">Forfait Chambre</small><b className="tabular-nums">{fmtDollars(f.forfait)}</b></div>
            <span className="text-muted font-bold">+</span>
            <div className={bloc}><small className="text-[12px] text-muted">{n} utilisateur{n > 1 ? "s" : ""} × {fmtDollars(c.parUtilisateur)}</small><b className="tabular-nums">{fmtDollars(f.equipe)}</b></div>
            <span className="text-muted font-bold">=</span>
            <div className={`${bloc} border-accent`}><small className="text-[12px] text-muted">par mois, avant taxes</small><b className="tabular-nums">{fmtDollars(f.sousTotal)}</b></div>
          </div>
          <p className="m-0 text-[13px] text-muted">
            Tout est inclus : membres et annuaire avec suggestions de mises en relation, événements, agenda, rendez-vous, ressources, messagerie, newsletter, factures et règlements. Membres et abonnés illimités.
          </p>
        </Card>

        <Panneau titre="Prochaine facture" teinte="rouge">
          <div className="flex flex-col gap-1.5 text-[14px]">
            <div className={ligne}><span>Forfait</span><span>{fmtDollars(f.forfait)}</span></div>
            <div className={ligne}><span>{n} utilisateur{n > 1 ? "s" : ""}</span><span>{fmtDollars(f.equipe)}</span></div>
            <div className={ligne}><span>TPS ({fmtPourcent(c.tps)})</span><span>{fmtDollars(f.tps)}</span></div>
            <div className={ligne}><span>TVQ ({fmtPourcent(c.tvq)})</span><span>{fmtDollars(f.tvq)}</span></div>
            <div className={`${ligne} border-t-2 border-ink pt-2 mt-1 font-bold text-[16px]`}><span>Total le {fmtDate(echeance)}</span><span>{fmtDollars(f.total)}</span></div>
            <p className="m-0 mt-2 text-[12px] text-faint">Estimation à partir des comptes actifs aujourd’hui : elle suit les ajouts et retraits de l’équipe.</p>
          </div>
        </Panneau>
      </div>

      <Panneau
        titre="Utilisateurs payants"
        sousTitre={`${n} compte${n > 1 ? "s" : ""} actif${n > 1 ? "s" : ""} · ce sont les comptes d’Équipe & accès`}
        teinte="bleu"
        action={
          <Link href="/admin/equipe" className="btn-contour btn-contour-sm text-ink no-underline"><Plus size={15} /> Ajouter un utilisateur</Link>
        }
      >
        <TableWrap>
          <thead>
            <tr>
              <Th>Utilisateur</Th>
              <Th>Rôle</Th>
              <Th className="text-right">Par mois</Th>
            </tr>
          </thead>
          <tbody>
            {equipe.map((u) => (
              <tr key={u.id}>
                <Td>
                  <div className="font-semibold text-ink">{u.nom}{u.id === moi.id ? <span className="ml-2 text-[11.5px] font-semibold text-muted">Vous</span> : null}</div>
                  <div className="text-[12.5px] text-muted break-all">{u.email}</div>
                </Td>
                <Td>
                  <Pill tone={u.niveau === "administrateur" ? "bad" : "info"}>{u.niveau === "administrateur" ? "Administrateur" : "Manager"}</Pill>
                </Td>
                <Td className="text-right tabular-nums">{fmtDollars(c.parUtilisateur)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <p className="m-0 mt-3 text-[12.5px] text-muted">Pour retirer un compte de l’équipe (et de la facture), passez par <Link href="/admin/equipe" className="text-accent">Équipe &amp; accès</Link>.</p>
      </Panneau>
    </>
  );
}
