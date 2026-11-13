import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import { BoutonEnvoi } from "@/components/public/BoutonMarque";
import { Alerte, CadreAuth } from "@/components/public/CadreAuth";
import { ChampAuth, ChampMotDePasse, Saisie } from "@/components/public/ChampsAuth";
import { MarqueSite, PIED_PLATEFORME } from "@/components/plateforme/site/MarqueSite";
import { connexionPlateforme } from "@/lib/actions/plateforme";

export const metadata: Metadata = { title: { absolute: "Connexion · L’Alliée Virtuelle" } };

// Connexion depuis le site de la plateforme : on arrive dans l'espace de sa Chambre
export default async function ConnexionPlateforme({ searchParams }: { searchParams: Promise<{ erreur?: string; email?: string }> }) {
  const { erreur, email } = await searchParams;
  return (
    <CadreAuth classe="site-plateforme" marque={<MarqueSite />} pied={PIED_PLATEFORME} illustration="acces">
      <h1 className="titre m-0 mb-2">Se connecter</h1>
      <p className="text-[15px] leading-6 text-muted m-0 mb-7">Vous arrivez dans l’espace de votre Chambre.</p>
      {erreur ? <Alerte>{erreur}</Alerte> : null}
      <form action={connexionPlateforme} className="flex flex-col gap-5">
        <ChampAuth label="Adresse e-mail" icone={<Mail size={16} />}>
          <Saisie avecIcone type="email" name="email" required autoComplete="email" autoFocus defaultValue={email ?? ""} />
        </ChampAuth>
        <ChampMotDePasse label="Mot de passe" icone={<Lock size={16} />} name="motDePasse" required autoComplete="current-password" />
        <p className="m-0 -mt-2 text-right text-[14px]">
          <Link href="/mot-de-passe-oublie" className="text-marque-vert font-medium no-underline hover:underline">Mot de passe oublié ?</Link>
        </p>
        <BoutonEnvoi enCours="Connexion…">Se connecter</BoutonEnvoi>
      </form>
      <p className="text-[14px] text-muted text-center m-0 mt-8">
        Pas encore de Chambre ?{" "}
        <Link href="/creer-une-chambre" className="text-marque-vert font-medium no-underline hover:underline">Créer ma Chambre</Link>
      </p>
    </CadreAuth>
  );
}
