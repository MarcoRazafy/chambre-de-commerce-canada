import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, Pause, Play, Save } from "lucide-react";
import { EnTeteAdmin, Panneau, Vide } from "@/components/admin/ui";
import { INPUT } from "@/components/champ-style";
import { Field, SubmitButton } from "@/components/form-bits";
import { Pill, Td, Th } from "@/components/ui";
import { changerOffreChambre, modifierAdresseChambre, reactiverChambre, suspendreChambre } from "@/lib/actions/gm";
import { adresseDeLaChambre } from "@/lib/adresse-chambre";
import { NIVEAU_EQUIPE_LABEL } from "@/lib/enums";
import { fmtDateShort } from "@/lib/format";
import { ficheChambre, offresPlateforme, STATUTS } from "@/lib/gm";
import { configPlateforme, facturePlateforme, fmtDollars, offreGratuite } from "@/lib/plateforme";

export const metadata: Metadata = { title: "Chambre" };

const jour = (d: Date) => fmtDateShort(d.toISOString().slice(0, 10));

// Tableau dans un panneau : défile sur petit écran, sans second cadre
function Tableau({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border-t border-line">
      <table className="w-full border-collapse text-[13.3px] [&_tbody_tr:last-child_td]:border-b-0">{children}</table>
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
  const estimation = offreGratuite(c.offre)
    ? null
    : facturePlateforme(equipe.length, { ...configPlateforme(), forfait: c.offre.forfait, parUtilisateur: c.offre.parUtilisateur }, c.offre.utilisateursOfferts);
  const chiffre = "flex justify-between gap-3 py-1.5 text-[14px] tabular-nums";

  return (
    <>
      <Link href="/gm/chambres" className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted no-underline hover:text-accent mb-3">
        <ChevronLeft size={15} aria-hidden /> Chambres
      </Link>
      <EnTeteAdmin
        surtitre={<span className="inline-flex items-center gap-2">Chambre <Pill tone={STATUTS[statut].ton}>{STATUTS[statut].libelle}</Pill></span>}
        titre={c.nom}
        actions={adresse ? (
          <a href={adresse} target="_blank" rel="noopener noreferrer" className="btn-contour btn-contour-sm text-ink hover:bg-surface-2 no-underline">
            <ExternalLink size={14} aria-hidden /> {adresse.replace(/^https?:\/\//, "")}
          </a>
        ) : undefined}
      />

      <div className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 min-w-0">
          <form action={changerOffreChambre}>
            <input type="hidden" name="chambreId" value={c.id} />
            <Panneau titre="Abonnement" teinte="rouge">
              <div className="flex flex-col gap-4">
                <div className="flex items-end gap-2.5 flex-wrap">
                  <Field label="Offre">
                    <select name="offreId" defaultValue={c.offreId} className={`${INPUT} sm:w-[240px]`}>
                      {offres.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
                    </select>
                  </Field>
                  <SubmitButton pendingLabel="Enregistrement…"><Save size={15} /> Enregistrer</SubmitButton>
                </div>
                <p className="m-0 text-[14px] text-muted">
                  {estimation
                    ? <>Aujourd’hui : <b className="text-ink tabular-nums">{fmtDollars(estimation.sousTotal)}</b> par mois avant taxes ({fmtDollars(estimation.forfait)} + {estimation.payants} compte{estimation.payants > 1 ? "s" : ""} d’équipe).</>
                    : "Rien à payer."}
                </p>
              </div>
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
                      <Td>{x.payeeLe ? <Pill tone="ok">Payée le {jour(x.payeeLe)}</Pill> : <Pill tone="warn">À payer</Pill>}</Td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            ) : <Vide>Aucune facture</Vide>}
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

          <Panneau titre="Chiffres" teinte="bleu">
            <div className="flex flex-col divide-y divide-line">
              <div className={chiffre}><span>Membres</span><b>{membres}</b></div>
              <div className={chiffre}><span>Comptes d’équipe</span><b>{equipe.length}</b></div>
              <div className={chiffre}><span>Événements</span><b>{evenements}</b></div>
              <div className={chiffre}><span>Créée le</span><b>{jour(c.createdAt)}</b></div>
            </div>
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
