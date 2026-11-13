import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import { MarqueGM, PIED_GM } from "@/components/gm/MarqueGM";
import { BoutonEnvoi } from "@/components/public/BoutonMarque";
import { Alerte, CadreAuth } from "@/components/public/CadreAuth";
import { ChampAuth, Saisie } from "@/components/public/ChampsAuth";
import { demanderReinitialisationGM } from "@/lib/actions/gm-compte";

export const metadata: Metadata = { title: "Mot de passe oublié · Admin GM" };

// Mot de passe oublié (Admin GM) : un lien par courriel, valable une heure
export default async function MotDePasseOublieGM({ searchParams }: { searchParams: Promise<{ erreur?: string; email?: string; envoye?: string }> }) {
  const { erreur, email, envoye } = await searchParams;

  return (
    <CadreAuth classe="espace-admin" marque={<MarqueGM />} pied={PIED_GM}>
      <span className="surtitre text-marque-rouge">Admin GM</span>

      {envoye ? (
        <div className="apparition">
          <span className="mt-4 mb-5 w-12 h-12 rounded-full bg-marque-vert/10 text-marque-vert flex items-center justify-center">
            <MailCheck size={22} aria-hidden />
          </span>
          <h1 className="titre text-[clamp(25px,3vw,32px)] m-0 mb-3">Vérifiez vos e-mails</h1>
          <p className="text-[14.5px] text-muted m-0 mb-3">
            Si un compte existe pour <strong className="text-ink">{envoye}</strong>, un lien pour choisir un nouveau mot de passe vient d’y être envoyé. Il est valable une heure.
          </p>
          <p className="text-[13.5px] text-faint m-0 mb-6">
            Rien reçu après quelques minutes ? Regardez dans les indésirables, ou{" "}
            <Link href={`/gm/mot-de-passe-oublie?${new URLSearchParams({ email: envoye })}`} className="text-marque-vert font-semibold no-underline hover:underline">
              refaites la demande
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <h1 className="titre text-[clamp(25px,3vw,32px)] m-0 mt-2.5 mb-2">Mot de passe oublié</h1>
          <p className="text-[14.5px] text-muted m-0 mb-6">Indiquez l’adresse de votre compte : vous recevrez un lien pour en choisir un nouveau.</p>
          {erreur ? <Alerte>{erreur}</Alerte> : null}
          <form action={demanderReinitialisationGM} className="flex flex-col gap-4">
            <ChampAuth label="Adresse courriel" icone={<Mail size={16} />}>
              <Saisie avecIcone type="email" name="email" required autoComplete="email" autoFocus defaultValue={email ?? ""} />
            </ChampAuth>
            <div className="mt-1">
              <BoutonEnvoi enCours="Envoi…">Recevoir un lien</BoutonEnvoi>
            </div>
          </form>
        </>
      )}

      <p className="text-[13.5px] text-muted mt-6 mb-0 pt-5 border-t border-line">
        <Link href="/gm/connexion" className="text-marque-vert font-semibold no-underline hover:underline inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Retour à la connexion
        </Link>
      </p>
    </CadreAuth>
  );
}
