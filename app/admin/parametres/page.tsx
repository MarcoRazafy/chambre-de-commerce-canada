import { Lock, Save, Send } from "lucide-react";
import { StatutExpediteur } from "@/components/admin/StatutExpediteur";
import { EnTeteAdmin, Panneau } from "@/components/admin/ui";
import { INPUT } from "@/components/champ-style";
import { Field, SubmitButton } from "@/components/form-bits";
import { Saillant } from "@/components/ui";
import { enregistrerExpediteur, envoyerTestExpediteur } from "@/lib/actions/parametres";
import { estAdministrateur } from "@/lib/autorisations";
import { etatDomaine } from "@/lib/brevo-domaines";
import { adresseServeur } from "@/lib/courriel";
import { getProfilChambreBrut } from "@/lib/profil-chambre";
import { completerProfil } from "@/lib/profil-chambre-defauts";
import { getCurrentUser } from "@/lib/session";

// Paramètres de la plateforme. Courriels : l'expéditeur (nom, adresse), la validation de son domaine chez Brevo,
// un envoi de test. Les super admins modifient ; les admins consultent.
export default async function Parametres() {
  const [moi, brut] = await Promise.all([getCurrentUser("admin"), getProfilChambreBrut()]);
  const gere = estAdministrateur(moi);
  const nom = brut?.expediteurNom ?? "";
  const email = brut?.expediteurEmail ?? "";

  return (
    <>
      <EnTeteAdmin surtitre="Administration" titre={<><Saillant>Paramètres</Saillant></>} />

      <form action={enregistrerExpediteur}>
        <Panneau titre="Courriels" sousTitre="Qui envoie les courriels de la plateforme : newsletter, rappels, factures, inscriptions" teinte="rouge">
          <fieldset disabled={!gere} className="m-0 p-0 border-0 min-w-0 flex flex-col gap-4">
            {!gere ? (
              <p className="m-0 flex items-center gap-2 text-[13px] text-muted"><Lock size={14} aria-hidden /> Réservé aux super admins.</p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom de l’expéditeur">
                <input name="expediteurNom" maxLength={100} defaultValue={nom} placeholder={completerProfil(brut).nom} className={INPUT} />
              </Field>
              <Field label="Adresse d’expédition">
                <input name="expediteurEmail" type="email" maxLength={200} defaultValue={email} placeholder="contact@entreprise.com" className={INPUT} />
              </Field>
            </div>
            <StatutExpediteur etat={await etatDomaine(email)} email={email} nom={nom || completerProfil(brut).nom} serveur={adresseServeur()} gere={gere} />
            {gere ? (
              <div className="flex items-center justify-end gap-2.5 flex-wrap pt-1">
                <button type="submit" formAction={envoyerTestExpediteur} className="btn-contour btn-contour-sm text-ink hover:bg-surface-2">
                  <Send size={14} /> M’envoyer un test
                </button>
                <SubmitButton pendingLabel="Enregistrement…"><Save size={15} /> Enregistrer</SubmitButton>
              </div>
            ) : null}
          </fieldset>
        </Panneau>
      </form>
    </>
  );
}
