import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import { BoutonEnvoi } from "@/components/public/BoutonMarque";
import { Alerte } from "@/components/public/CadreAuth";
import { ChampAuth, ChampMotDePasse, Saisie } from "@/components/public/ChampsAuth";
import { CadrePlateforme, CartePlateforme } from "@/components/plateforme/CadrePlateforme";
import { connexionPlateforme } from "@/lib/actions/plateforme";

export const metadata: Metadata = { title: { absolute: "Connexion · L’Alliée Virtuelle" } };

// Connexion depuis le site de la plateforme : on arrive dans l'espace de sa Chambre
export default async function ConnexionPlateforme({ searchParams }: { searchParams: Promise<{ erreur?: string; email?: string }> }) {
  const { erreur, email } = await searchParams;
  return (
    <CadrePlateforme illustration="acces">
      <CartePlateforme>
        <h1 className="titre text-[clamp(25px,3vw,32px)] m-0 mb-6">Connexion</h1>
        {erreur ? <Alerte>{erreur}</Alerte> : null}
        <form action={connexionPlateforme} className="flex flex-col gap-4">
          <ChampAuth label="Adresse e-mail" icone={<Mail size={16} />}>
            <Saisie avecIcone type="email" name="email" required autoComplete="email" autoFocus defaultValue={email ?? ""} />
          </ChampAuth>
          <ChampMotDePasse label="Mot de passe" icone={<Lock size={16} />} name="motDePasse" required autoComplete="current-password" />
          <BoutonEnvoi enCours="Connexion…">Se connecter</BoutonEnvoi>
        </form>
        <p className="text-[14px] m-0 mt-5">
          <Link href="/mot-de-passe-oublie" className="text-marque-vert font-medium no-underline hover:underline">Mot de passe oublié ?</Link>
        </p>
      </CartePlateforme>
    </CadrePlateforme>
  );
}
