import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { EnTeteAdmin } from "@/components/admin/ui";
import { INPUT } from "@/components/champ-style";
import { Field, SubmitButton } from "@/components/form-bits";
import { Card, Saillant } from "@/components/ui";
import { enregistrerCoordonneesPaiement } from "@/lib/actions/reglements";
import { getCoordonneesPaiement } from "@/lib/reglements";

export default async function CoordonneesPaiement() {
  const c = await getCoordonneesPaiement();

  return (
    <>
      <Link
        href="/admin/reglements"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted no-underline hover:text-accent"
      >
        <ArrowLeft size={14} /> Règlements
      </Link>
      <EnTeteAdmin
        surtitre="Compta"
        titre={
          <>
            Coordonnées de <Saillant>paiement</Saillant>
          </>
        }
      />

      <form action={enregistrerCoordonneesPaiement} className="grid gap-4">
        <Card className="grid gap-4 p-6">
          <h2 className="m-0 text-[15.5px] font-semibold">Compte bancaire</h2>
          <Field
            label="Titulaire du compte"
            hint="Tel qu’il doit être écrit sur un virement."
          >
            <input
              name="titulaire"
              defaultValue={c.titulaire}
              className={INPUT}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Banque">
              <input name="banque" defaultValue={c.banque} className={INPUT} />
            </Field>
            <Field label="Agence">
              <input name="agence" defaultValue={c.agence} className={INPUT} />
            </Field>
          </div>
          <Field
            label="RIB"
            hint="En clair, tel qu’on le recopie au guichet. Nécessaire au virement local et au dépôt."
          >
            <input name="rib" defaultValue={c.rib} className={INPUT} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="IBAN"
              hint="Proposé au membre avec le RIB, pour un virement."
            >
              <input name="iban" defaultValue={c.iban} className={INPUT} />
            </Field>
            <Field label="BIC / SWIFT">
              <input name="bic" defaultValue={c.bic} className={INPUT} />
            </Field>
          </div>
        </Card>

        <Card className="grid gap-4 p-6">
          <h2 className="m-0 text-[15.5px] font-semibold">
            Portefeuilles mobiles
          </h2>
          <p className="m-0 -mt-2 text-[12.8px] text-muted">
            Utiles tant que l’encaissement automatique n’est pas branché : le
            membre envoie au numéro, puis annonce son règlement.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="MVola">
              <input name="mvola" defaultValue={c.mvola} className={INPUT} />
            </Field>
            <Field label="Orange Money">
              <input
                name="orangeMoney"
                defaultValue={c.orangeMoney}
                className={INPUT}
              />
            </Field>
            <Field label="Airtel Money">
              <input
                name="airtelMoney"
                defaultValue={c.airtelMoney}
                className={INPUT}
              />
            </Field>
          </div>
        </Card>

        <Card className="grid gap-4 p-6">
          <h2 className="m-0 text-[15.5px] font-semibold">
            Espèces et plateformes
          </h2>
          <Field
            label="Adresse du bureau"
            hint="Où remettre un règlement en main propre."
          >
            <textarea
              name="adresseBureau"
              rows={2}
              defaultValue={c.adresseBureau}
              className={INPUT}
            />
          </Field>
          <Field label="Horaires">
            <input
              name="horaires"
              defaultValue={c.horaires}
              placeholder="Du lundi au vendredi, de 8 h à 17 h"
              className={INPUT}
            />
          </Field>
          <Field
            label="Plateformes acceptées"
            hint="Une par ligne : le nom, puis l’adresse ou l’identifiant."
          >
            <textarea
              name="plateformes"
              rows={3}
              defaultValue={c.plateformes}
              placeholder={
                "PayPal — dons@cancham.mg\nWise — CanCham Madagascar"
              }
              className={INPUT}
            />
          </Field>
        </Card>

        <div className="flex justify-end">
          <SubmitButton pendingLabel="Enregistrement…">
            <Check size={15} /> Enregistrer les coordonnées
          </SubmitButton>
        </div>
      </form>
    </>
  );
}
