import type { Metadata } from "next";
import { Save } from "lucide-react";
import { EnTeteAdmin, Panneau } from "@/components/admin/ui";
import { INPUT } from "@/components/champ-style";
import { Field, SubmitButton } from "@/components/form-bits";
import { Saillant } from "@/components/ui";
import { enregistrerOffre } from "@/lib/actions/gm";
import { FONCTIONS } from "@/lib/fonctions-plateforme";
import { offresPlateforme } from "@/lib/gm";

export const metadata: Metadata = { title: "Offres" };

const nombre = (n: number) => String(n).replace(".", ",");

// Les offres de la plateforme (Gratuite, Payante) : prix, limites, fonctions incluses
export default async function OffresGM() {
  const offres = await offresPlateforme();
  return (
    <>
      <EnTeteAdmin surtitre="Plateforme" titre={<>Les <Saillant>offres</Saillant></>} />
      <div className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-2">
        {offres.map((o, i) => (
          <form key={o.id} action={enregistrerOffre}>
            <input type="hidden" name="offreId" value={o.id} />
            <Panneau
              titre={o.nom}
              sousTitre={`${o._count.chambres} Chambre${o._count.chambres > 1 ? "s" : ""}`}
              teinte={i === 0 ? "vert" : "rouge"}
            >
              <div className="flex flex-col gap-4">
                <Field label="Nom">
                  <input name="nom" required maxLength={60} defaultValue={o.nom} className={INPUT} />
                </Field>
                <div className="grid gap-x-3 gap-y-4 grid-cols-2 items-end">
                  <Field label="Forfait mensuel ($)">
                    <input name="forfait" inputMode="decimal" required defaultValue={nombre(o.forfait)} className={INPUT} />
                  </Field>
                  <Field label="Par compte d’équipe ($/mois)">
                    <input name="parUtilisateur" inputMode="decimal" required defaultValue={nombre(o.parUtilisateur)} className={INPUT} />
                  </Field>
                  <Field label="Comptes d’équipe offerts">
                    <input name="utilisateursOfferts" type="number" min={0} defaultValue={o.utilisateursOfferts} className={INPUT} />
                  </Field>
                  <Field label="Comptes d’équipe au plus">
                    <input name="maxUtilisateurs" type="number" min={0} defaultValue={o.maxUtilisateurs ?? ""} placeholder="Sans limite" className={INPUT} />
                  </Field>
                  <Field label="Membres au plus">
                    <input name="maxMembres" type="number" min={0} defaultValue={o.maxMembres ?? ""} placeholder="Sans limite" className={INPUT} />
                  </Field>
                </div>
                <fieldset className="m-0 p-0 border-0 min-w-0">
                  <legend className="block text-[12.3px] font-semibold text-muted mb-2">Fonctions incluses</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {FONCTIONS.map((f) => (
                      <label key={f.cle} className="flex items-center gap-2.5 text-[13.5px] cursor-pointer">
                        <input type="checkbox" name="fonctions" value={f.cle} defaultChecked={o.fonctions.includes(f.cle)} className="size-4 accent-[var(--accent)]" />
                        {f.libelle}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex justify-end pt-1">
                  <SubmitButton pendingLabel="Enregistrement…"><Save size={15} /> Enregistrer</SubmitButton>
                </div>
              </div>
            </Panneau>
          </form>
        ))}
      </div>
    </>
  );
}
