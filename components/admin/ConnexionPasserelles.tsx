"use client";

import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { Modal } from "@/components/Modal";
import { INPUT } from "@/components/champ-style";
import { CancelButton, Field, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import { connecterPaypal, connecterStripe } from "@/lib/actions/parametres";

function Etapes({ children }: { children: ReactNode }) {
  return <ol className="m-0 pl-5 list-decimal flex flex-col gap-2 text-[13.5px] leading-relaxed text-ink marker:text-muted marker:font-semibold">{children}</ol>;
}

export function ConnexionStripe({ enCours }: { enCours: boolean }) {
  return (
    <Modal
      title="Connecter votre compte Stripe"
      trigger={(ouvrir) => (
        <button type="button" onClick={ouvrir} className="btn-action btn-action-sm w-fit">
          {enCours ? "Terminer l’inscription" : "Connecter"}
        </button>
      )}
    >
      {(fermer) => (
        <form action={connecterStripe}>
          <ModalBody>
            <Etapes>
              <li>Cliquez sur « Continuer vers Stripe » : la page sécurisée de Stripe s’ouvre.</li>
              <li>Connectez-vous à votre compte Stripe, ou créez-en un avec l’adresse e-mail de la Chambre.</li>
              <li>Renseignez la Chambre : l’entreprise, son représentant et le compte bancaire qui recevra les paiements.</li>
              <li>Validez : vous revenez ici et la carte affiche « Connecté ».</li>
            </Etapes>
            <p className="m-0 text-[12.5px] text-muted">Les cotisations payées par carte arrivent directement sur ce compte bancaire.</p>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Ouverture de Stripe…">
              <ExternalLink size={14} aria-hidden /> Continuer vers Stripe
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function ConnexionPaypal() {
  return (
    <Modal
      title="Connecter votre compte PayPal"
      trigger={(ouvrir) => (
        <button type="button" onClick={ouvrir} className="btn-action btn-action-sm w-fit">
          Connecter
        </button>
      )}
    >
      {(fermer) => (
        <form action={connecterPaypal}>
          <ModalBody>
            <Etapes>
              <li>
                Ouvrez un compte PayPal Business au nom de la Chambre sur{" "}
                <a href="https://www.paypal.com/bizsignup/" target="_blank" rel="noopener noreferrer" className="text-ink underline">paypal.com</a>, ou utilisez celui que vous avez déjà.
              </li>
              <li>Écrivez ci-dessous l’adresse e-mail de ce compte PayPal, puis cliquez sur « Connecter ».</li>
              <li>Vos membres verront cette adresse pour vous envoyer leur paiement. Vous confirmez chaque paiement reçu dans Règlements annoncés.</li>
            </Etapes>
            <Field label="Adresse e-mail du compte PayPal">
              <input type="email" name="paypal" required maxLength={200} autoComplete="email" className={INPUT} />
            </Field>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Connexion…">Connecter</SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
