import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Building2, Coins, Sparkles } from "lucide-react";
import { Compteur, EnTeteAdmin, Jauge, Panneau, Vide } from "@/components/admin/ui";
import { LogoChambre } from "@/components/gm/LogoChambre";
import { Pill, Saillant } from "@/components/ui";
import { fmtDateShort, today } from "@/lib/format";
import { exigerGM, STATUTS, tableauDeBordGM } from "@/lib/gm";
import { fmtDollars } from "@/lib/plateforme";

export const metadata: Metadata = { title: "Tableau de bord" };

const jour = (d: Date) => fmtDateShort(d.toISOString().slice(0, 10));
const fiche = (id: string) => `/gm/chambres/${encodeURIComponent(id)}`;
// Une ligne de liste : sur téléphone, le détail passe sous le nom (aligné après le logo) ; à partir de sm, sur la même ligne
const ligne = "flex flex-col gap-1 py-2.5 text-[13.5px] border-b border-line last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3";
const detail = "pl-[60px] sm:pl-0 text-[12.5px] sm:text-[13.5px] text-muted whitespace-nowrap";
const nom = "flex items-center gap-3 min-w-0 font-semibold text-ink no-underline hover:text-accent";

// Tableau de bord de l'Admin GM
export default async function TableauDeBordGM() {
  const [t, gm] = await Promise.all([tableauDeBordGM(), exigerGM()]);
  const aujourdhui = today().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const plusHaut = Math.max(...t.revenus.map((r) => r.total), 0);
  return (
    <>
      <EnTeteAdmin surtitre={`Admin GM · ${aujourdhui}`} titre={<>Bonjour <Saillant>{gm.nom.split(" ")[0]}</Saillant>,</>} />

      <div className="cascade grid gap-3 sm:gap-4 mb-5 grid-cols-2 xl:grid-cols-4">
        <Compteur icone={<Building2 size={20} />} libelle="Chambres actives" valeur={t.actives} detail={`sur ${t.total}`} href="/gm/chambres?statut=active" teinte="bleu" />
        <Compteur icone={<Coins size={20} />} libelle="Revenus du mois" valeur={fmtDollars(t.revenusDuMois)} detail="factures de l’abonnement payées" teinte="vert" />
        <Compteur icone={<AlertTriangle size={20} />} libelle="En retard" valeur={t.enRetard.length} detail="facture de l’abonnement en attente" href="/gm/chambres?statut=en_retard" teinte="rouge" />
        <Compteur icone={<Sparkles size={20} />} libelle="Nouvelles Chambres" valeur={t.nouvelles.length} detail="ces 30 derniers jours" teinte="degrade" />
      </div>

      {/* Écran large : revenus à gauche, retards et nouvelles Chambres à droite, derniers paiements en pleine largeur.
          Téléphone : les retards d'abord. */}
      <div className="grid gap-4 items-start lg:grid-cols-2">
        <div className="flex flex-col gap-4 lg:order-2">
          <Panneau titre="En retard" teinte="rouge" lien={t.enRetard.length ? { href: "/gm/chambres?statut=en_retard", libelle: "Toutes" } : undefined}>
            {t.enRetard.length ? (
              <ul className="m-0 p-0 list-none">
                {t.enRetard.slice(0, 6).map((c) => (
                  <li key={c.id} className={ligne}>
                    <Link href={fiche(c.id)} className={nom}>
                      <LogoChambre nom={c.nom} logo={c.logo} taille={30} /> <span className="truncate">{c.nom}</span>
                    </Link>
                    <span className="pl-[60px] sm:pl-0"><Pill tone={STATUTS[c.statut].ton}>{c.offre.nom}</Pill></span>
                  </li>
                ))}
              </ul>
            ) : <Vide>Aucun retard</Vide>}
          </Panneau>

          <Panneau titre="Nouvelles Chambres" teinte="degrade">
            {t.nouvelles.length ? (
              <ul className="m-0 p-0 list-none">
                {t.nouvelles.slice(0, 6).map((c) => (
                  <li key={c.id} className={ligne}>
                    <Link href={fiche(c.id)} className={nom}>
                      <LogoChambre nom={c.nom} logo={c.logo} taille={30} /> <span className="truncate">{c.nom}</span>
                    </Link>
                    <span className={detail}>{c.offre.nom} · {jour(c.creeLe)}</span>
                  </li>
                ))}
              </ul>
            ) : <Vide>Aucune ces 30 derniers jours</Vide>}
          </Panneau>
        </div>

        <Panneau titre="Revenus de l’abonnement" sousTitre="Six derniers mois, factures payées" teinte="vert" className="lg:order-1">
          <div className="flex flex-col gap-3">
            {t.revenus.map((r) => (
              <div key={r.mois}>
                <div className="flex items-baseline justify-between gap-3 text-[13px] mb-1.5">
                  <span className="text-ink capitalize">{r.mois}</span>
                  <span className="text-muted tabular-nums">{fmtDollars(r.total)}</span>
                </div>
                <Jauge valeur={r.total} max={plusHaut} teinte="vert" />
              </div>
            ))}
          </div>
        </Panneau>

        <Panneau titre="Derniers paiements" teinte="bleu" className="lg:order-3 lg:col-span-2">
          {t.derniersPaiements.length ? (
            <ul className="m-0 p-0 list-none">
              {t.derniersPaiements.map((f) => (
                <li key={f.id} className={ligne}>
                  <Link href={fiche(f.chambre.id)} className={`${nom} font-normal`}>
                    <LogoChambre nom={f.chambre.nom} logo={f.chambre.profil?.logo ?? null} taille={30} />
                    <span className="truncate"><b>{f.chambre.nom}</b> <span className="text-muted">· {f.numero}</span></span>
                  </Link>
                  <span className={`${detail} tabular-nums`}>{fmtDollars(f.total)} · {f.payeeLe ? jour(f.payeeLe) : ""}</span>
                </li>
              ))}
            </ul>
          ) : <Vide>Aucun paiement</Vide>}
        </Panneau>
      </div>
    </>
  );
}
