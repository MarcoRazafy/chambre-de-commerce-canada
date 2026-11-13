import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MailCheck, UserRound } from "lucide-react";
import { BoutonEnvoi } from "@/components/public/BoutonMarque";
import { Alerte } from "@/components/public/CadreAuth";
import { ChampAuth, Saisie } from "@/components/public/ChampsAuth";
import { CHAMP_AUTH } from "@/components/public/style-champs";
import { CadrePlateforme, CartePlateforme } from "@/components/plateforme/CadrePlateforme";
import { envoyerContact } from "@/lib/actions/plateforme";

export const metadata: Metadata = { title: { absolute: "Contact · L’Alliée Virtuelle" } };

type Saisies = { erreur?: string; nom?: string; email?: string; message?: string; envoye?: string };

// Contact depuis le site (sans compte) : le message arrive à l'Admin GM par courriel
export default async function Contact({ searchParams }: { searchParams: Promise<Saisies> }) {
  const sp = await searchParams;

  return (
    <CadrePlateforme illustration="questions">
      <CartePlateforme>
        {sp.envoye ? (
          <div className="apparition">
            <span className="mb-5 w-12 h-12 rounded-full bg-marque-vert/10 text-marque-vert flex items-center justify-center">
              <MailCheck size={22} aria-hidden />
            </span>
            <h1 className="titre text-[clamp(25px,3vw,32px)] m-0 mb-3">Message envoyé</h1>
            <p className="text-[15px] leading-6 text-muted m-0 mb-6">Nous vous répondons à l’adresse indiquée.</p>
            <Link href="/" className="btn-contour w-full no-underline">Retour à l’accueil</Link>
          </div>
        ) : (
          <>
            <h1 className="titre text-[clamp(25px,3vw,32px)] m-0 mb-2">Nous écrire</h1>
            <p className="text-[15px] leading-6 text-muted m-0 mb-6">Une question sur la plateforme, une demande de démonstration, un projet de Chambre.</p>
            {sp.erreur ? <Alerte>{sp.erreur}</Alerte> : null}
            <form action={envoyerContact} className="flex flex-col gap-4">
              {/* Piège à robots : laissé vide par une personne */}
              <div className="hidden" aria-hidden>
                <label>Site web <input type="text" name="site" tabIndex={-1} autoComplete="off" /></label>
              </div>
              <ChampAuth label="Votre nom" icone={<UserRound size={16} />}>
                <Saisie avecIcone name="nom" required maxLength={100} autoComplete="name" defaultValue={sp.nom ?? ""} />
              </ChampAuth>
              <ChampAuth label="Votre adresse e-mail" icone={<Mail size={16} />}>
                <Saisie avecIcone type="email" name="email" required autoComplete="email" defaultValue={sp.email ?? ""} />
              </ChampAuth>
              <label className="block">
                <span className="block text-[13px] font-semibold text-ink mb-1.5">Votre message</span>
                <textarea name="message" required minLength={10} maxLength={3000} rows={6} defaultValue={sp.message ?? ""} className={`${CHAMP_AUTH} px-3.5 block leading-relaxed resize-y`} />
              </label>
              <BoutonEnvoi enCours="Envoi…">Envoyer</BoutonEnvoi>
            </form>
          </>
        )}
      </CartePlateforme>
    </CadrePlateforme>
  );
}
