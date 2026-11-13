import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import { BoutonEnvoi } from "@/components/public/BoutonMarque";
import { Alerte } from "@/components/public/CadreAuth";
import { ChampAuth, Saisie } from "@/components/public/ChampsAuth";
import { CadrePlateforme, CartePlateforme } from "@/components/plateforme/CadrePlateforme";
import { demanderReinitialisationPlateforme } from "@/lib/actions/plateforme";

export const metadata: Metadata = { title: { absolute: "Mot de passe oublié · L’Alliée Virtuelle" } };

// Mot de passe oublié depuis le site : le lien part de la Chambre du compte et mène à son adresse
export default async function MotDePasseOubliePlateforme({ searchParams }: { searchParams: Promise<{ erreur?: string; email?: string; envoye?: string }> }) {
  const { erreur, email, envoye } = await searchParams;

  return (
    <CadrePlateforme illustration="connexion">
      <CartePlateforme>
        {envoye ? (
          <div className="apparition">
            <span className="mb-5 w-12 h-12 rounded-full bg-marque-vert/10 text-marque-vert flex items-center justify-center">
              <MailCheck size={22} aria-hidden />
            </span>
            <h1 className="titre text-[clamp(25px,3vw,32px)] m-0 mb-3">Vérifiez vos e-mails</h1>
            <p className="text-[15px] leading-6 text-muted m-0 mb-3">
              Si un compte existe pour <strong className="text-ink">{envoye}</strong>, un lien pour choisir un nouveau mot de passe vient d’y être envoyé. Il est valable une heure.
            </p>
            <p className="text-[14px] text-faint m-0">
              Rien reçu après quelques minutes ? Regardez dans les indésirables, ou{" "}
              <Link href={`/mot-de-passe-oublie?${new URLSearchParams({ email: envoye })}`} className="text-marque-vert font-medium no-underline hover:underline">
                refaites la demande
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <h1 className="titre text-[clamp(25px,3vw,32px)] m-0 mb-2">Mot de passe oublié</h1>
            <p className="text-[15px] leading-6 text-muted m-0 mb-6">Indiquez l’adresse de votre compte : vous recevrez un lien pour en choisir un nouveau.</p>
            {erreur ? <Alerte>{erreur}</Alerte> : null}
            <form action={demanderReinitialisationPlateforme} className="flex flex-col gap-4">
              <ChampAuth label="Adresse e-mail" icone={<Mail size={16} />}>
                <Saisie avecIcone type="email" name="email" required autoComplete="email" autoFocus defaultValue={email ?? ""} />
              </ChampAuth>
              <BoutonEnvoi enCours="Envoi…">Recevoir un lien</BoutonEnvoi>
            </form>
          </>
        )}
        <p className="text-[14px] text-muted mt-6 mb-0 pt-5 border-t border-line">
          <Link href="/connexion" className="text-marque-vert font-medium no-underline hover:underline inline-flex items-center gap-1">
            <ArrowLeft size={14} /> Retour à la connexion
          </Link>
        </p>
      </CartePlateforme>
    </CadrePlateforme>
  );
}
