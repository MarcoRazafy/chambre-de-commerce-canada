import type { Metadata } from "next";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { EnTeteAdmin, Onglets, Panneau } from "@/components/admin/ui";
import { INPUT } from "@/components/champ-style";
import { Field, SubmitButton } from "@/components/form-bits";
import { Saillant } from "@/components/ui";
import { enregistrerIdentitePlateforme, enregistrerReglages } from "@/lib/actions/gm";
import { changerMotDePasseGM, modifierCompteGM } from "@/lib/actions/gm-compte";
import { MOT_DE_PASSE_MIN } from "@/lib/auth";
import { exigerGM, reglagesPlateforme } from "@/lib/gm";
import { NOM_PLATEFORME } from "@/lib/identite-plateforme";
import { stripeConfigure } from "@/lib/stripe";

export const metadata: Metadata = { title: "Paramètres" };

const ONGLETS = [
  { cle: "compte", libelle: "Compte" },
  { cle: "plateforme", libelle: "Plateforme" },
  { cle: "facturation", libelle: "Facturation" },
  { cle: "paiement", libelle: "Paiement par carte" },
] as const;
type Onglet = (typeof ONGLETS)[number]["cle"];

const Etat = ({ ok, libelle, cle }: { ok: boolean; libelle: string; cle: string }) => (
  <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
    {ok ? <CheckCircle2 size={18} className="text-success shrink-0 mt-px" aria-hidden /> : <XCircle size={18} className="text-faint shrink-0 mt-px" aria-hidden />}
    <span className="min-w-0 flex-1">
      <span className="flex items-center justify-between gap-3">
        <span className="text-[14px] font-semibold text-ink">{libelle}</span>
        <span className={`text-[12px] font-semibold shrink-0 ${ok ? "text-success" : "text-faint"}`}>{ok ? "Réglée" : "Absente"}</span>
      </span>
      <code className="block text-[11.5px] text-muted break-all mt-0.5">{cle}</code>
    </span>
  </li>
);

// Paramètres : le compte GM, l'identité de la plateforme (factures), la facturation de l'abonnement, le paiement par carte
export default async function ParametresGM({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const sp = await searchParams;
  const onglet: Onglet = ONGLETS.find((o) => o.cle === sp.onglet)?.cle ?? "compte";
  const [gm, r] = await Promise.all([exigerGM(), reglagesPlateforme()]);
  const webhook = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  const webhookComptes = Boolean(process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim());

  return (
    <>
      <EnTeteAdmin surtitre="Administration" titre={<Saillant>Paramètres</Saillant>} />
      <Onglets actif={onglet} onglets={ONGLETS.map((o) => ({ cle: o.cle, libelle: o.libelle, href: `/gm/parametres?onglet=${o.cle}` }))} />

      {onglet === "compte" ? (
        <div className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-2">
          <form action={modifierCompteGM}>
            <Panneau titre="Mon compte" sousTitre="Le nom affiché et l’adresse de connexion" teinte="bleu">
              <div className="flex flex-col gap-4">
                <Field label="Nom">
                  <input name="nom" required maxLength={100} defaultValue={gm.nom} autoComplete="name" className={INPUT} />
                </Field>
                <Field label="Adresse e-mail">
                  <input name="email" type="email" required maxLength={200} defaultValue={gm.email} autoComplete="email" className={INPUT} />
                </Field>
                <div className="flex justify-end pt-1">
                  <SubmitButton pendingLabel="Enregistrement…"><Save size={15} /> Enregistrer</SubmitButton>
                </div>
              </div>
            </Panneau>
          </form>

          <form action={changerMotDePasseGM}>
            <Panneau titre="Mot de passe" sousTitre="Les autres sessions ouvertes se fermeront" teinte="rouge">
              <div className="flex flex-col gap-4">
                <Field label="Mot de passe actuel">
                  <input name="actuel" type="password" required autoComplete="current-password" className={INPUT} />
                </Field>
                <Field label={`Nouveau mot de passe (${MOT_DE_PASSE_MIN} caractères au moins)`}>
                  <input name="nouveau" type="password" required minLength={MOT_DE_PASSE_MIN} autoComplete="new-password" className={INPUT} />
                </Field>
                <Field label="Confirmation">
                  <input name="confirmation" type="password" required minLength={MOT_DE_PASSE_MIN} autoComplete="new-password" className={INPUT} />
                </Field>
                <div className="flex justify-end pt-1">
                  <SubmitButton pendingLabel="Enregistrement…"><Save size={15} /> Changer le mot de passe</SubmitButton>
                </div>
              </div>
            </Panneau>
          </form>
        </div>
      ) : null}

      {onglet === "plateforme" ? (
        <form action={enregistrerIdentitePlateforme} className="max-w-[760px]">
          <Panneau titre="Identité de la plateforme" sousTitre="L’émetteur des factures de l’abonnement des Chambres" teinte="degrade">
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nom">
                  <input name="nom" maxLength={120} defaultValue={r.nom} placeholder={NOM_PLATEFORME} className={INPUT} />
                </Field>
                <Field label="Raison sociale">
                  <input name="raisonSociale" maxLength={200} defaultValue={r.raisonSociale} className={INPUT} />
                </Field>
              </div>
              <Field label="Adresse">
                <textarea name="adresse" rows={3} maxLength={400} defaultValue={r.adresse} className={`${INPUT} block w-full leading-relaxed resize-y`} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Courriel">
                  <input name="courriel" type="email" maxLength={200} defaultValue={r.courriel} className={INPUT} />
                </Field>
                <Field label="Téléphone">
                  <input name="telephone" maxLength={60} defaultValue={r.telephone} className={INPUT} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="NEQ">
                  <input name="neq" maxLength={40} defaultValue={r.neq} className={INPUT} />
                </Field>
                <Field label="N° TPS">
                  <input name="numeroTps" maxLength={40} defaultValue={r.numeroTps} className={INPUT} />
                </Field>
                <Field label="N° TVQ">
                  <input name="numeroTvq" maxLength={40} defaultValue={r.numeroTvq} className={INPUT} />
                </Field>
              </div>
              <Field label="Hébergeur (mentions légales)">
                <input name="hebergeur" maxLength={300} defaultValue={r.hebergeur} placeholder="Nom et adresse de l’hébergeur" className={INPUT} />
              </Field>
              <div className="flex justify-end pt-1">
                <SubmitButton pendingLabel="Enregistrement…"><Save size={15} /> Enregistrer</SubmitButton>
              </div>
            </div>
          </Panneau>
        </form>
      ) : null}

      {onglet === "facturation" ? (
        <form action={enregistrerReglages} className="max-w-[760px]">
          <Panneau titre="Abonnement des Chambres" sousTitre="Relances et retards de paiement, part sur les cotisations" teinte="rouge">
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Relances (jours après la facture)">
                  <input name="relances" defaultValue={r.relances.join(", ")} placeholder="1, 7, 14" className={INPUT} />
                </Field>
                <Field label="Délai avant restriction (jours)">
                  <input name="delaiRetard" type="number" min={0} max={365} required defaultValue={r.delaiRetard} className={INPUT} />
                </Field>
              </div>
              <fieldset className="m-0 p-0 border-0 min-w-0">
                <legend className="block text-[12.3px] font-semibold text-muted mb-2">Après le délai</legend>
                <div className="flex flex-col gap-2">
                  {[
                    { v: "lecture", l: "Lecture seule : l’espace s’affiche, rien ne s’enregistre" },
                    { v: "blocage", l: "Blocage : l’espace est fermé, sauf l’abonnement" },
                  ].map((o) => (
                    <label key={o.v} className="flex items-center gap-2.5 text-[13.5px] cursor-pointer">
                      <input type="radio" name="actionRetard" value={o.v} defaultChecked={r.actionRetard === o.v} className="size-4 accent-[var(--accent)]" />
                      {o.l}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field label="Part de la plateforme sur les cotisations payées par carte (%)">
                <input name="commissionCotisations" inputMode="decimal" defaultValue={String(r.commissionCotisations).replace(".", ",")} className={`${INPUT} sm:max-w-[200px]`} />
              </Field>
              <div className="flex justify-end">
                <SubmitButton pendingLabel="Enregistrement…"><Save size={15} /> Enregistrer</SubmitButton>
              </div>
            </div>
          </Panneau>
        </form>
      ) : null}

      {onglet === "paiement" ? (
        <div className="max-w-[560px]">
          <Panneau titre="Paiement par carte" sousTitre="Variables du serveur (.env)" teinte="bleu">
            <ul className="m-0 p-0 list-none flex flex-col divide-y divide-line">
              <Etat ok={stripeConfigure()} libelle="Clé Stripe" cle="STRIPE_SECRET_KEY" />
              <Etat ok={webhook} libelle="Notifications Stripe" cle="STRIPE_WEBHOOK_SECRET" />
              <Etat ok={webhookComptes} libelle="Notifications des comptes des Chambres" cle="STRIPE_CONNECT_WEBHOOK_SECRET" />
            </ul>
          </Panneau>
        </div>
      ) : null}
    </>
  );
}
