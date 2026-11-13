import type { Metadata } from "next";
import { Lock, Mail, UserRound } from "lucide-react";
import { BoutonEnvoi } from "@/components/public/BoutonMarque";
import { Alerte } from "@/components/public/CadreAuth";
import { ChampAuth, ChampMotDePasse, Saisie } from "@/components/public/ChampsAuth";
import { CadrePlateforme, CartePlateforme } from "@/components/plateforme/CadrePlateforme";
import { ChampsChambre } from "@/components/plateforme/ChampsChambre";
import { creerChambre } from "@/lib/actions/plateforme";
import { MOT_DE_PASSE_MIN } from "@/lib/mots-de-passe";
import { offresPubliques } from "@/lib/plateforme-site";

export const metadata: Metadata = { title: { absolute: "Créer une Chambre · L’Alliée Virtuelle" } };

type Saisies = { erreur?: string; nomChambre?: string; slug?: string; nom?: string; email?: string; offre?: string; fonctions?: string };

export default async function CreerUneChambre({ searchParams }: { searchParams: Promise<Saisies> }) {
  const sp = await searchParams;
  const offres = await offresPubliques();
  const plateforme = process.env.DOMAINE_PLATEFORME?.trim().toLowerCase();
  const offreChoisie = offres.find((o) => o.id === sp.offre)?.id;

  return (
    <CadrePlateforme illustration="chambre">
      <CartePlateforme>
        <h1 className="titre text-[clamp(25px,3vw,32px)] m-0 mb-6">Créer une Chambre</h1>
        {sp.erreur ? <Alerte>{sp.erreur}</Alerte> : null}

        <form action={creerChambre} className="flex flex-col gap-4">
          <ChampsChambre nom={sp.nomChambre ?? ""} slug={sp.slug ?? ""} suffixe={`.${plateforme ?? "localhost"}`} />

          <ChampAuth label="Votre nom" icone={<UserRound size={16} />}>
            <Saisie avecIcone name="nom" required maxLength={100} autoComplete="name" defaultValue={sp.nom ?? ""} />
          </ChampAuth>
          <ChampAuth label="Votre adresse e-mail" icone={<Mail size={16} />}>
            <Saisie avecIcone type="email" name="email" required autoComplete="email" defaultValue={sp.email ?? ""} />
          </ChampAuth>
          <ChampMotDePasse
            label="Mot de passe"
            hint={`${MOT_DE_PASSE_MIN} caractères au moins`}
            icone={<Lock size={16} />}
            name="motDePasse"
            required
            minLength={MOT_DE_PASSE_MIN}
            autoComplete="new-password"
          />

          {/* L'offre choisie sur le site : présélectionnée au démarrage, après l'inscription */}
          {offreChoisie ? <input type="hidden" name="offre" value={offreChoisie} /> : null}
          {offreChoisie && sp.fonctions ? <input type="hidden" name="fonctions" value={sp.fonctions.slice(0, 300)} /> : null}

          <div className="pt-2">
            <BoutonEnvoi enCours="Création de l’espace…">Créer mon espace</BoutonEnvoi>
          </div>
        </form>
      </CartePlateforme>
    </CadrePlateforme>
  );
}
