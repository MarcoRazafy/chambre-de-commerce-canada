import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { MarqueGM, PIED_GM } from "@/components/gm/MarqueGM";
import { Alerte, CadreAuth } from "@/components/public/CadreAuth";
import { BoutonEnvoi } from "@/components/public/BoutonMarque";
import { ChampAuth, ChampMotDePasse, Saisie } from "@/components/public/ChampsAuth";
import { connexionGM } from "@/lib/actions/gm";
import { compteGM } from "@/lib/gm";

export const metadata: Metadata = { title: "Connexion · Administrateur" };

export default async function ConnexionGM({ searchParams }: { searchParams: Promise<{ erreur?: string; email?: string; suite?: string }> }) {
  const { erreur, email, suite } = await searchParams;
  if (await compteGM()) redirect("/gm");

  return (
    <CadreAuth classe="espace-admin" marque={<MarqueGM />} pied={PIED_GM} illustration="admin">
      <span className="surtitre text-marque-rouge">Administrateur</span>
      <h1 className="titre text-[clamp(25px,3vw,32px)] m-0 mt-2.5 mb-6">Connexion</h1>

      {erreur ? <Alerte>{erreur}</Alerte> : null}

      <form action={connexionGM} className="flex flex-col gap-4">
        {suite?.startsWith("/gm/") ? <input type="hidden" name="suite" value={suite} /> : null}
        <ChampAuth label="Adresse courriel" icone={<Mail size={16} />}>
          <Saisie avecIcone type="email" name="email" required autoComplete="email" autoFocus defaultValue={email ?? ""} />
        </ChampAuth>
        <ChampMotDePasse label="Mot de passe" icone={<Lock size={16} />} name="motDePasse" required autoComplete="current-password" />
        <BoutonEnvoi enCours="Connexion…">Se connecter</BoutonEnvoi>
      </form>
      <p className="text-[13.5px] m-0 mt-5">
        <Link href="/gm/mot-de-passe-oublie" className="text-marque-vert font-semibold no-underline hover:underline">Mot de passe oublié ?</Link>
      </p>
    </CadreAuth>
  );
}
