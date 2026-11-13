import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { Alerte, CadreAuth } from "@/components/public/CadreAuth";
import { BoutonEnvoi } from "@/components/public/BoutonMarque";
import { ChampAuth, ChampMotDePasse, Saisie } from "@/components/public/ChampsAuth";
import { connexionGM } from "@/lib/actions/gm";
import { compteGM } from "@/lib/gm";

export const metadata: Metadata = { title: "Connexion · Admin GM" };

// Marque de la plateforme (l'espace GM n'appartient à aucune Chambre)
const Marque = () => (
  <div className="mb-7">
    <span className="block text-[22px] font-bold leading-tight text-ink">L’Alliée Virtuelle</span>
    <span aria-hidden className="block mt-2 h-1 w-14 rounded-full" style={{ background: "var(--marque-degrade)" }} />
  </div>
);

export default async function ConnexionGM({ searchParams }: { searchParams: Promise<{ erreur?: string; email?: string; suite?: string }> }) {
  const { erreur, email, suite } = await searchParams;
  if (await compteGM()) redirect("/gm");

  return (
    <CadreAuth classe="espace-admin" marque={<Marque />} pied={<>© {new Date().getFullYear()} L’Alliée Virtuelle</>}>
      <span className="surtitre text-marque-rouge">Admin GM</span>
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
    </CadreAuth>
  );
}
