import type { Metadata } from "next";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { EnTeteAdmin, Panneau } from "@/components/admin/ui";
import { INPUT } from "@/components/champ-style";
import { Field, SubmitButton } from "@/components/form-bits";
import { Saillant } from "@/components/ui";
import { enregistrerReglages } from "@/lib/actions/gm";
import { reglagesPlateforme } from "@/lib/gm";
import { stripeConfigure } from "@/lib/stripe";

export const metadata: Metadata = { title: "Paramètres" };

const Etat = ({ ok, libelle }: { ok: boolean; libelle: string }) => (
  <li className="flex items-center gap-2.5 text-[14px]">
    {ok ? <CheckCircle2 size={17} className="text-success" aria-hidden /> : <XCircle size={17} className="text-faint" aria-hidden />}
    <span className={ok ? "text-ink" : "text-muted"}>{libelle}</span>
  </li>
);

// Paramètres de la plateforme : retards de paiement de l'abonnement, paiement par carte
export default async function ParametresGM() {
  const r = await reglagesPlateforme();
  const webhook = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  const webhookComptes = Boolean(process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim());
  return (
    <>
      <EnTeteAdmin surtitre="Admin GM" titre={<Saillant>Paramètres</Saillant>} />
      <div className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <form action={enregistrerReglages}>
          <Panneau titre="Abonnement et paiements" teinte="rouge">
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

        <Panneau titre="Paiement par carte" teinte="bleu">
          <ul className="m-0 p-0 list-none flex flex-col gap-2.5">
            <Etat ok={stripeConfigure()} libelle="Clé Stripe (STRIPE_SECRET_KEY)" />
            <Etat ok={webhook} libelle="Notifications Stripe (STRIPE_WEBHOOK_SECRET)" />
            <Etat ok={webhookComptes} libelle="Notifications des comptes des Chambres (STRIPE_CONNECT_WEBHOOK_SECRET)" />
          </ul>
        </Panneau>
      </div>
    </>
  );
}
