import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Coins, ExternalLink, LogIn, MessageSquare, Pause, Play, Save, UserCog, Users } from "lucide-react";
import { Compteur, EnTeteAdmin, Panneau, Vide } from "@/components/admin/ui";
import { INPUT } from "@/components/champ-style";
import { LogoChambre } from "@/components/gm/LogoChambre";
import { Field, SubmitButton } from "@/components/form-bits";
import { Pill, Td, Th } from "@/components/ui";
import { changerOffreChambre, entrerDansChambre, marquerFacturePayee, modifierAdresseChambre, reactiverChambre, suspendreChambre } from "@/lib/actions/gm";
import { adresseDeLaChambre } from "@/lib/adresse-chambre";
import { NIVEAU_EQUIPE_LABEL } from "@/lib/enums";
import { fmtDateShort } from "@/lib/format";
import { ficheChambre, offresPlateforme, STATUTS } from "@/lib/gm";
import { FONCTIONS, fonctionsOuvertes } from "@/lib/fonctions-plateforme";
import { configPlateforme, facturePlateforme, fmtDollars, forfaitOffre, offreGratuite } from "@/lib/plateforme";

export const metadata: Metadata = { title: "Chambre" };

const jour = (d: Date) => fmtDateShort(d.toISOString().slice(0, 10));

// Tableau dans un panneau (écran large ; sur téléphone : une liste)
function Tableau({ children }: { children: React.ReactNode }) {
  return (
    <div className="hidden md:block overflow-x-auto border-t border-line">
      <table className="w-full border-collapse text-[13.3px] [&_tbody_tr:last-child_td]:border-b-0">{children}</table>
    </div>
  );
}

function ListeMobile({ children }: { children: React.ReactNode }) {
  return <ul className="md:hidden m-0 p-0 list-none border-t border-line divide-y divide-line">{children}</ul>;
}

// Une ligne « libellé : valeur » d'un panneau
function Ligne({ libelle, children }: { libelle: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-[13.5px]">
      <dt className="text-muted shrink-0">{libelle}</dt>
      <dd className="m-0 text-right text-ink font-semibold min-w-0">{children}</dd>
    </div>
  );
}

export default async function FicheChambreGM({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [f, offres] = await Promise.all([ficheChambre(decodeURIComponent(id)), offresPlateforme()]);
  if (!f) notFound();
  const { chambre: c, statut, equipe, factures, membres, evenements, journal } = f;
  const adresse = await adresseDeLaChambre(c.id);
  const plateforme = process.env.DOMAINE_PLATEFORME?.trim().toLowerCase();
  // Ce que l'offre coûte aujourd'hui, avec l'équipe actuelle (avant taxes)
  const forfait = forfaitOffre(c.offre, c.fonctionsChoisies);
  const estimation = offreGratuite({ forfait, parUtilisateur: c.offre.parUtilisateur })
    ? null
    : facturePlateforme(equipe.length, { ...configPlateforme(), forfait, parUtilisateur: c.offre.parUtilisateur }, c.offre.utilisateursOfferts);
  const ouvertes = fonctionsOuvertes(c.offre, c.fonctionsChoisies);

  return (
    <>
      <EnTeteAdmin
        surtitre={
          <span className="inline-flex items-center gap-2 flex-wrap">
            Chambre · créée le {jour(c.createdAt)} <Pill tone={STATUTS[statut].ton}>{STATUTS[statut].libelle}</Pill>
          </span>
        }
        titre={
          <span className="inline-flex items-center gap-4 flex-wrap">
            <LogoChambre nom={c.nom} logo={c.profil?.logo ?? null} taille={52} />
            {c.nom}
          </span>
        }
        actions={
          <>
            <Link href={`/gm/messages?c=${encodeURIComponent(c.id)}`} className="btn-contour btn-contour-sm text-ink hover:bg-surface-2 no-underline">
              <MessageSquare size={14} aria-hidden /> Écrire
            </Link>
            {adresse ? (
              <a href={adresse} target="_blank" rel="noopener noreferrer" className="btn-contour btn-contour-sm text-ink hover:bg-surface-2 no-underline max-w-full">
                <ExternalLink size={14} aria-hidden /> <span className="truncate">{adresse.replace(/^https?:\/\//, "")}</span>
              </a>
            ) : null}
          </>
        }
      />

      <div className="cascade grid gap-4 mb-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Compteur icone={<Users size={20} />} libelle="Membres" valeur={membres} teinte="bleu" />
        <Compteur icone={<UserCog size={20} />} libelle="Comptes d’équipe" valeur={equipe.length} teinte="vert" />
        <Compteur icone={<CalendarDays size={20} />} libelle="Événements" valeur={evenements} teinte="degrade" />
        <Compteur
          icone={<Coins size={20} />}
          libelle="Abonnement par mois"
          valeur={estimation ? fmtDollars(estimation.sousTotal) : "Gratuit"}
          detail={estimation ? `Offre ${c.offre.nom} · avant taxes` : `Offre ${c.offre.nom}`}
          teinte="rouge"
        />
      </div>

      <div className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 min-w-0">
          <form action={changerOffreChambre}>
            <input type="hidden" name="chambreId" value={c.id} />
            <Panneau titre="Abonnement" teinte="rouge">
              <div className="flex items-end gap-2.5 flex-wrap mb-3">
                <Field label="Offre">
                  <select name="offreId" defaultValue={c.offreId} className={`${INPUT} sm:w-[240px]`}>
                    {offres.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
                  </select>
                </Field>
                <SubmitButton pendingLabel="Enregistrement…"><Save size={15} /> Enregistrer</SubmitButton>
              </div>
              <dl className="m-0 flex flex-col divide-y divide-line border-t border-line">
                <Ligne libelle="Coût actuel">
                  {estimation ? (
                    <>
                      <span className="tabular-nums">{fmtDollars(estimation.sousTotal)}</span> <span className="font-normal text-muted">/ mois avant taxes</span>
                      <span className="block text-[12px] font-normal text-muted">{fmtDollars(estimation.forfait)} + {estimation.payants} compte{estimation.payants > 1 ? "s" : ""} d’équipe</span>
                    </>
                  ) : "Rien à payer"}
                </Ligne>
                {c.offre.surMesure ? (
                  <Ligne libelle="Fonctions choisies">
                    {ouvertes.length ? FONCTIONS.filter((x) => ouvertes.includes(x.cle)).map((x) => x.libelle).join(", ") : <span className="font-normal text-muted">Aucune</span>}
                  </Ligne>
                ) : null}
                <Ligne libelle="Carte enregistrée">
                  {c.stripeCarteId ? <span className="tabular-nums">{c.carteMarque} •••• {c.carteFin} · {c.carteExpire}</span> : <span className="font-normal text-muted">Aucune</span>}
                </Ligne>
                <Ligne libelle="Cotisations par carte">
                  {c.stripeCompteActif ? (
                    <Pill tone="ok">Stripe actif{c.stripeComptePays ? ` (${c.stripeComptePays})` : ""}</Pill>
                  ) : c.stripeCompteId ? (
                    <Pill tone="warn">Inscription à terminer</Pill>
                  ) : (
                    <span className="font-normal text-muted">Non connecté</span>
                  )}
                </Ligne>
              </dl>
            </Panneau>
          </form>

          <Panneau titre="Factures de l’abonnement" teinte="bleu" corpsClassName="px-0 pb-0">
            {factures.length ? (
              <Tableau>
                <thead><tr><Th>Facture</Th><Th>Date</Th><Th className="text-right">Total</Th><Th>Statut</Th></tr></thead>
                <tbody>
                  {factures.map((x) => (
                    <tr key={x.id}>
                      <Td className="font-semibold">{x.numero}</Td>
                      <Td className="whitespace-nowrap">{jour(x.date)}</Td>
                      <Td className="text-right tabular-nums">{fmtDollars(x.total)}</Td>
                      <Td>
                        {x.payeeLe ? <Pill tone="ok">Payée le {jour(x.payeeLe)}</Pill> : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Pill tone="warn">À payer</Pill>
                            <form action={marquerFacturePayee}>
                              <input type="hidden" name="chambreId" value={c.id} />
                              <input type="hidden" name="factureId" value={x.id} />
                              <button type="submit" className="btn-contour btn-contour-sm text-ink hover:bg-surface-2">Marquer payée</button>
                            </form>
                          </div>
                        )}
                        {!x.payeeLe && x.dernierEchec ? <div className="text-[12px] text-bad mt-1">{x.dernierEchec}</div> : null}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            ) : <Vide>Aucune facture</Vide>}
            {factures.length ? (
              <ListeMobile>
                {factures.map((x) => (
                  <li key={x.id} className="px-5 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold text-[13.5px]">{x.numero}</span>
                      <span className="font-semibold text-[13.5px] tabular-nums">{fmtDollars(x.total)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[12.5px] text-muted">{jour(x.date)}</span>
                      {x.payeeLe ? <Pill tone="ok">Payée le {jour(x.payeeLe)}</Pill> : (
                        <span className="flex items-center gap-2">
                          <Pill tone="warn">À payer</Pill>
                          <form action={marquerFacturePayee}>
                            <input type="hidden" name="chambreId" value={c.id} />
                            <input type="hidden" name="factureId" value={x.id} />
                            <button type="submit" className="btn-contour btn-contour-sm text-ink hover:bg-surface-2">Marquer payée</button>
                          </form>
                        </span>
                      )}
                    </div>
                    {!x.payeeLe && x.dernierEchec ? <div className="text-[12px] text-bad mt-1">{x.dernierEchec}</div> : null}
                  </li>
                ))}
              </ListeMobile>
            ) : null}
          </Panneau>

          <Panneau titre="Équipe" teinte="vert" corpsClassName="px-0 pb-0">
            {equipe.length ? (
              <Tableau>
                <thead><tr><Th>Nom</Th><Th>Courriel</Th><Th>Rôle</Th><Th>Depuis</Th></tr></thead>
                <tbody>
                  {equipe.map((u) => (
                    <tr key={u.id}>
                      <Td className="font-semibold">{u.nom}</Td>
                      <Td className="break-all">{u.email}</Td>
                      <Td>{NIVEAU_EQUIPE_LABEL[u.niveauEquipe ?? "manager"]}</Td>
                      <Td className="whitespace-nowrap">{jour(u.createdAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            ) : <Vide>Aucun compte d’équipe</Vide>}
            {equipe.length ? (
              <ListeMobile>
                {equipe.map((u) => (
                  <li key={u.id} className="px-5 py-3 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold text-[13.5px] truncate">{u.nom}</span>
                      <span className="text-[12px] text-muted shrink-0">{NIVEAU_EQUIPE_LABEL[u.niveauEquipe ?? "manager"]}</span>
                    </div>
                    <div className="text-[12.5px] text-muted truncate">{u.email}</div>
                    <div className="text-[12px] text-faint">Depuis le {jour(u.createdAt)}</div>
                  </li>
                ))}
              </ListeMobile>
            ) : null}
          </Panneau>
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          <form action={modifierAdresseChambre}>
            <input type="hidden" name="chambreId" value={c.id} />
            <Panneau titre="Adresse" teinte="degrade">
              <div className="flex flex-col gap-4">
                <Field label="Sous-domaine">
                  <div className="flex min-w-0">
                    <input name="slug" required maxLength={63} defaultValue={c.slug} autoCapitalize="none" spellCheck={false} className={`${INPUT} min-w-0 flex-1 ${plateforme ? "rounded-r-none" : ""}`} />
                    {plateforme ? (
                      <span className="flex items-center min-w-0 max-w-[60%] border border-l-0 border-line-champ bg-surface-2 rounded-r-[var(--radius-s)] px-3 text-[13.6px] text-muted">
                        <span className="truncate">.{plateforme}</span>
                      </span>
                    ) : null}
                  </div>
                </Field>
                <Field label="Domaine propre">
                  <input name="domaine" maxLength={300} defaultValue={c.domaine ?? ""} placeholder="entreprise.com" autoCapitalize="none" spellCheck={false} className={INPUT} />
                </Field>
                <div className="flex justify-end">
                  <SubmitButton pendingLabel="Enregistrement…"><Save size={15} /> Enregistrer</SubmitButton>
                </div>
              </div>
            </Panneau>
          </form>

          <Panneau titre="Mode développeur" teinte="bleu">
            {c.accesDevJusqua && c.accesDevJusqua > new Date() ? (
              <form action={entrerDansChambre} className="flex items-center justify-between gap-3 flex-wrap">
                <input type="hidden" name="chambreId" value={c.id} />
                <span className="text-[14px] text-muted">
                  Autorisé jusqu’au {c.accesDevJusqua.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}{c.accesDevPar ? ` · par ${c.accesDevPar}` : ""}
                </span>
                <SubmitButton pendingLabel="Entrée…"><LogIn size={15} /> Entrer</SubmitButton>
              </form>
            ) : (
              <p className="m-0 text-[14px] text-muted">Non autorisé par la Chambre</p>
            )}
          </Panneau>

          <Panneau titre="Accès à l’espace" teinte="rouge">
            {c.statut === "suspendue" ? (
              <form action={reactiverChambre} className="flex flex-col gap-3">
                <input type="hidden" name="chambreId" value={c.id} />
                {c.suspendueLe ? <p className="m-0 text-[14px] text-muted">Suspendu le {jour(c.suspendueLe)}.</p> : null}
                <SubmitButton pendingLabel="Réactivation…"><Play size={15} /> Réactiver l’espace</SubmitButton>
              </form>
            ) : (
              <details className="group">
                <summary className="btn-contour btn-contour-sm text-bad hover:bg-surface-2 list-none cursor-pointer w-fit [&::-webkit-details-marker]:hidden">
                  <Pause size={14} aria-hidden /> Suspendre l’espace
                </summary>
                <form action={suspendreChambre} className="mt-3 flex items-center gap-2.5 flex-wrap">
                  <input type="hidden" name="chambreId" value={c.id} />
                  <span className="text-[13.5px] text-muted">Les membres et l’équipe n’y auront plus accès.</span>
                  <button type="submit" className="btn-contour btn-contour-sm text-white bg-bad border-bad hover:opacity-90">Confirmer</button>
                </form>
              </details>
            )}
          </Panneau>

          <Panneau titre="Historique" teinte="vert">
            {journal.length ? (
              <ul className="m-0 p-0 list-none flex flex-col gap-2.5">
                {journal.map((j) => (
                  <li key={j.id} className="text-[13.5px]">
                    <span className="text-ink">{j.detail ?? j.action}</span>
                    <div className="text-[12px] text-faint">{jour(j.createdAt)} · {j.acteur}</div>
                  </li>
                ))}
              </ul>
            ) : <Vide>Rien pour l’instant</Vide>}
          </Panneau>
        </div>
      </div>
    </>
  );
}
