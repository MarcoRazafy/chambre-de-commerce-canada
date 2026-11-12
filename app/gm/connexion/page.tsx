import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { Alerte } from "@/components/public/CadreAuth";
import { BoutonEnvoi } from "@/components/public/BoutonMarque";
import { ChampAuth, ChampMotDePasse, Saisie } from "@/components/public/ChampsAuth";
import { connexionGM } from "@/lib/actions/gm";
import { compteGM } from "@/lib/gm";

export const metadata: Metadata = { title: "Connexion · Admin GM" };

export default async function ConnexionGM({ searchParams }: { searchParams: Promise<{ erreur?: string; email?: string; suite?: string }> }) {
  const { erreur, email, suite } = await searchParams;
  if (await compteGM()) redirect("/gm");

  return (
    <div className="min-h-screen bg-bg grid place-items-center px-4 py-10">
      <div className="w-full max-w-[400px] bg-surface border border-line rounded-[var(--radius-m)] shadow-[var(--shadow)] p-7">
        <span className="surtitre text-marque-rouge">L’Alliée Virtuelle</span>
        <h1 className="titre text-[28px] m-0 mt-2 mb-6">Admin GM</h1>

        {erreur ? <Alerte>{erreur}</Alerte> : null}

        <form action={connexionGM} className="flex flex-col gap-4">
          {suite?.startsWith("/gm/") ? <input type="hidden" name="suite" value={suite} /> : null}
          <ChampAuth label="Adresse courriel" icone={<Mail size={16} />}>
            <Saisie avecIcone type="email" name="email" required autoComplete="email" autoFocus defaultValue={email ?? ""} />
          </ChampAuth>
          <ChampMotDePasse label="Mot de passe" icone={<Lock size={16} />} name="motDePasse" required autoComplete="current-password" />
          <BoutonEnvoi enCours="Connexion…">Se connecter</BoutonEnvoi>
        </form>
      </div>
    </div>
  );
}
