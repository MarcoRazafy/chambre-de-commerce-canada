import Link from "next/link";
import { CreditCard, Download, Eye, FileText, Save, Sparkles } from "lucide-react";
import { OngletEquipe } from "@/components/admin/OngletEquipe";
import { EnTeteAdmin, Onglets, Panneau, Vide } from "@/components/admin/ui";
import { AjouterUtilisateur } from "@/components/forms/EquipeForms";
import { SubmitButton } from "@/components/form-bits";
import { ComposeurOffre } from "@/components/plateforme/ComposeurOffre";
import { FONCTIONS, libellesFonctions } from "@/lib/fonctions-plateforme";
import { estAdministrateur } from "@/lib/autorisations";
import { assurerFactureDuMois, getFacturesPlateforme } from "@/lib/factures-plateforme";
import { Card, Pill, Saillant } from "@/components/ui";
import { aujourdhuiISO, fmtDate } from "@/lib/format";
import { configDeLaChambre } from "@/lib/offre-chambre";
import { facturePlateforme, fmtDollars, fmtPourcent, lirePrixFonctions, offreGratuite, payantsFacture, prochaineFacturation } from "@/lib/plateforme";
import { getAdministrateurs } from "@/lib/queries-admin";
import { getCurrentUser } from "@/lib/session";
import { appliquerSession } from "@/lib/abonnement-stripe";
import { composerOffre, enregistrerCarteAbonnement, passerAOffrePayante, payerFactureAbonnement } from "@/lib/actions/abonnement";
import { chambreCourante } from "@/lib/chambre-courante";
import { prisma } from "@/lib/db";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { stripeConfigure } from "@/lib/stripe";

const MARQUES: Record<string, string> = { visa: "Visa", mastercard: "Mastercard", amex: "American Express", discover: "Discover", unionpay: "UnionPay", jcb: "JCB" };

// Abonnement de la Chambre à la plateforme (forfait + comptes actifs de l'équipe), l'équipe et ses accès, les factures
export default async function AdminAbonnement({ searchParams }: { searchParams: Promise<{ onglet?: string; stripe?: string }> }) {
  const sp = await searchParams;
  const onglet = sp.onglet === "factures" ? "factures" : "equipe";
  // Retour de la page de paiement de Stripe : la carte ou le paiement s'applique tout de suite
  if (sp.stripe && stripeConfigure()) {
    const retour = `/admin/abonnement?onglet=${onglet}`;
    const resultat = await appliquerSession(sp.stripe, await chambreCourante()).catch((e) => {
      console.error("[stripe] retour non appliqué", e);
      return "erreur" as const;
    });
    if (resultat === "payee") redirectWithFlash(retour, "Facture payée");
    if (resultat === "carte") redirectWithFlash(retour, "Carte enregistrée");
    redirectWithErreur(retour, "Le paiement n’a pas abouti.");
  }
  await assurerFactureDuMois();
  const [moi, equipe, factures, carte, payante, aLaCarte] = await Promise.all([
    getCurrentUser("admin"),
    getAdministrateurs(),
    getFacturesPlateforme(),
    prisma.chambre.findFirst({ select: { stripeCarteId: true, carteMarque: true, carteFin: true, carteExpire: true } }),
    prisma.offre.findUnique({ where: { id: "payante" }, select: { nom: true } }),
    prisma.offre.findFirst({ where: { surMesure: true }, orderBy: { ordre: "asc" } }),
  ]);
  const gere = estAdministrateur(moi);
  const parCarte = stripeConfigure();
  // L'offre de la Chambre (réglée par l'Admin GM) : ses prix, ses limites
  const { config: c, offre, offerts } = await configDeLaChambre();
  const gratuite = !!offre && offreGratuite(offre);
  const n = equipe.length;
  const f = facturePlateforme(n, c, offerts);
  const limites = [
    offre?.maxMembres != null ? `${offre.maxMembres} membres` : null,
    offre?.maxUtilisateurs != null ? `${offre.maxUtilisateurs} compte${offre.maxUtilisateurs > 1 ? "s" : ""} d’équipe` : null,
  ].filter(Boolean);
  // L'offre à la carte : ses fonctions au choix et leur prix
  const prixALaCarte = lirePrixFonctions(aLaCarte?.prixFonctions);
  const options = FONCTIONS.filter((x) => aLaCarte?.fonctions.includes(x.cle)).map((x) => ({ cle: x.cle as string, libelle: x.libelle as string, prix: prixALaCarte[x.cle] ?? 0 }));
  const echeance = prochaineFacturation(aujourdhuiISO(), c.jourFacturation);
  const bloc = "rounded-[var(--radius-m)] border border-line bg-surface-2 px-4 py-2.5 flex flex-col";
  const ligne = "flex justify-between gap-3 items-baseline tabular-nums";

  return (
    <>
      <EnTeteAdmin
        surtitre="Plateforme"
        titre={<>Abonnement &amp; <Saillant>utilisateurs</Saillant></>}
        actions={gere ? <AjouterUtilisateur /> : undefined}
      />

      <div className={`grid gap-4 mb-4 items-start grid-cols-[minmax(0,1fr)] ${gratuite ? "" : "lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]"}`}>
        <Card className="p-6 flex flex-col gap-4">
          <div className="flex justify-between items-start gap-3 flex-wrap">
            <div>
              <span className="surtitre text-faint">Forfait actuel</span>
              <h2 className="text-[18px] m-0 mt-1">{offre ? `Offre ${offre.nom}` : c.nom}</h2>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <Pill tone="ok">{gratuite ? "Actif" : `Actif · prochaine facture le ${fmtDate(echeance)}`}</Pill>
              {gratuite && gere && payante ? (
                <form action={passerAOffrePayante}>
                  <button type="submit" className="btn-contour btn-contour-sm text-ink hover:bg-surface-2"><Sparkles size={14} aria-hidden /> Passer à l’offre {payante.nom}</button>
                </form>
              ) : null}
            </div>
          </div>
          {gratuite ? null : <div className="flex flex-wrap items-center gap-2.5 text-[16px]">
            <div className={bloc}><small className="text-[12px] text-muted">{offre?.surMesure ? "Forfait et fonctions" : "Forfait Chambre"}</small><b className="tabular-nums">{fmtDollars(f.forfait)}</b></div>
            <span className="text-muted font-bold">+</span>
            <div className={bloc}><small className="text-[12px] text-muted">{f.payants} utilisateur{f.payants > 1 ? "s" : ""} × {fmtDollars(c.parUtilisateur)}{f.offerts ? " · super admin offert" : ""}</small><b className="tabular-nums">{fmtDollars(f.equipe)}</b></div>
            <span className="text-muted font-bold">=</span>
            <div className={`${bloc} border-accent`}><small className="text-[12px] text-muted">par mois, avant taxes</small><b className="tabular-nums">{fmtDollars(f.sousTotal)}</b></div>
          </div>}
          <p className="m-0 text-[13px] text-muted">
            {offre?.surMesure
              ? `Fonctions choisies : ${libellesFonctions(offre.fonctions) || "aucune"}.`
              : limites.length
              ? `Jusqu’à ${limites.join(" et ")}.`
              : "Tout est inclus : membres et annuaire avec suggestions de mises en relation, événements, agenda, rendez-vous, ressources, messagerie, newsletter, factures et règlements. Membres et abonnés illimités."}
          </p>
        </Card>

        {gratuite ? null : <Panneau titre="Prochaine facture" teinte="rouge">
          <div className="flex flex-col gap-1.5 text-[14px]">
            <div className={ligne}><span>Forfait</span><span>{fmtDollars(f.forfait)}</span></div>
            {f.offerts ? <div className={ligne}><span>Super admin</span><span>Offert</span></div> : null}
            <div className={ligne}><span>{f.payants} utilisateur{f.payants > 1 ? "s" : ""}</span><span>{fmtDollars(f.equipe)}</span></div>
            <div className={ligne}><span>TPS ({fmtPourcent(c.tps)})</span><span>{fmtDollars(f.tps)}</span></div>
            <div className={ligne}><span>TVQ ({fmtPourcent(c.tvq)})</span><span>{fmtDollars(f.tvq)}</span></div>
            <div className={`${ligne} border-t-2 border-ink pt-2 mt-1 font-bold text-[16px]`}><span>Total le {fmtDate(echeance)}</span><span>{fmtDollars(f.total)}</span></div>
            <p className="m-0 mt-2 text-[12px] text-faint">Estimation à partir des comptes actifs aujourd’hui : elle suit les ajouts et retraits de l’équipe.</p>
          </div>
        </Panneau>}
      </div>

      {gere && aLaCarte && options.length ? (
        <form action={composerOffre} className="block mb-4">
          <Panneau
            titre={offre?.surMesure ? "Mes fonctions" : "Composer mon offre"}
            sousTitre={offre?.surMesure ? undefined : `Offre ${aLaCarte.nom} · dès ${fmtDollars(aLaCarte.forfait)} par mois`}
            teinte="vert"
          >
            <ComposeurOffre
              mode="champ"
              offre={{ id: aLaCarte.id, nom: aLaCarte.nom, base: aLaCarte.forfait, parUtilisateur: aLaCarte.parUtilisateur, offerts: aLaCarte.utilisateursOfferts, options }}
              initiales={offre?.surMesure ? offre.choisies : (offre?.fonctions ?? [])}
              equipe={n}
            />
            <div className="flex justify-end pt-4">
              <SubmitButton pendingLabel="Enregistrement…">
                <Save size={15} aria-hidden /> {offre?.surMesure ? "Enregistrer" : `Passer à l’offre ${aLaCarte.nom}`}
              </SubmitButton>
            </div>
          </Panneau>
        </form>
      ) : null}

      {parCarte ? (
        <Panneau titre="Carte bancaire" teinte="bleu">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="m-0 flex items-center gap-2.5 text-[14px]">
              <CreditCard size={18} className="text-muted" aria-hidden />
              {carte?.stripeCarteId
                ? <span><b className="text-ink">{MARQUES[carte.carteMarque ?? ""] ?? carte.carteMarque ?? "Carte"}</b> •••• {carte.carteFin} · expire {carte.carteExpire}</span>
                : <span className="text-muted">Aucune carte enregistrée</span>}
            </p>
            {gere ? (
              <form action={enregistrerCarteAbonnement}>
                <button type="submit" className="btn-contour btn-contour-sm text-ink hover:bg-surface-2">{carte?.stripeCarteId ? "Changer de carte" : "Ajouter une carte"}</button>
              </form>
            ) : null}
          </div>
        </Panneau>
      ) : null}

      <section id="onglets" className="scroll-mt-6 mt-10">
        <Onglets
          actif={onglet}
          onglets={[
            { cle: "equipe", libelle: "Équipe & accès", href: "/admin/abonnement?onglet=equipe#onglets", compte: n },
            { cle: "factures", libelle: "Factures", href: "/admin/abonnement?onglet=factures#onglets", compte: factures.length },
          ]}
        />

        {onglet === "equipe" ? <OngletEquipe /> : null}

        {onglet === "factures" ? (
          <Panneau titre="Factures de l’abonnement" sousTitre={`Émises le ${c.jourFacturation === 1 ? "1er" : c.jourFacturation} du mois`} teinte="degrade" corpsClassName="px-0 pb-0">
            {factures.length ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13.4px]">
                  <thead>
                    <tr className="bg-surface-2">
                      {["N°", "Date", "Détail", "Total TTC", "Statut", "Facture"].map((t, i) => (
                        <th key={t} className={`surtitre text-faint font-semibold px-5 py-3 border-b border-line ${i === 3 || i === 5 ? "text-right" : "text-left"}`}>{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {factures.map((x) => (
                      <tr key={x.id} className="border-b border-line last:border-b-0 hover:bg-surface-2">
                        <td className="px-5 py-3.5 font-semibold text-ink tabular-nums">{x.numero}</td>
                        <td className="px-5 py-3.5 tabular-nums">{fmtDate(x.date.toISOString().slice(0, 10), { day: "numeric", month: "short", year: "numeric" })}</td>
                        <td className="px-5 py-3.5 text-muted">{fmtDollars(x.forfait)} + {payantsFacture(x)} utilisateur{payantsFacture(x) > 1 ? "s" : ""}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-ink tabular-nums">{fmtDollars(x.total)}</td>
                        <td className="px-5 py-3.5">
                          {x.payeeLe ? <Pill tone="ok">✓ Payée</Pill> : <Pill tone="warn">À régler</Pill>}
                          {!x.payeeLe && x.dernierEchec ? <div className="text-[12px] text-bad mt-1">{x.dernierEchec}</div> : null}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-2">
                            {!x.payeeLe && parCarte && gere ? (
                              <form action={payerFactureAbonnement}>
                                <input type="hidden" name="factureId" value={x.id} />
                                <button type="submit" className="btn-contour btn-contour-sm text-ink hover:bg-surface-2"><CreditCard size={14} aria-hidden /> Payer</button>
                              </form>
                            ) : null}
                            <Link href={`/admin/abonnement/factures/${x.numero}`} className="btn-contour btn-contour-sm text-ink no-underline"><Eye size={14} /> Afficher</Link>
                            <Link href={`/admin/abonnement/factures/${x.numero}?pdf=1`} className="btn-contour btn-contour-sm text-ink no-underline"><Download size={14} /> PDF</Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 pb-6"><Vide icone={<FileText size={24} />}>La première facture sera émise le {fmtDate(echeance)}.</Vide></div>
            )}
          </Panneau>
        ) : null}
      </section>
    </>
  );
}
