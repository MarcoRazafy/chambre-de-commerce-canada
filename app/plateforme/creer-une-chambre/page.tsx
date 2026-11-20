import type { Metadata } from "next";
import { Building2, Lock, Mail, MapPin, User } from "lucide-react";
import { BoutonEnvoi } from "@/components/public/BoutonMarque";
import { Alerte, CadreAuth, CHAMP_AUTH } from "@/components/public/CadreAuth";
import { ChampAuth, ChampMotDePasse, Saisie } from "@/components/public/ChampsAuth";
import { ChoixOffre } from "@/components/plateforme/ChoixOffre";
import { MarqueSite, PIED_PLATEFORME } from "@/components/plateforme/site/MarqueSite";
import { INDICATIFS, PAYS } from "@/lib/accueil";
import { creerChambre } from "@/lib/actions/plateforme";
import { MOT_DE_PASSE_MIN } from "@/lib/mots-de-passe";
import { offresPubliques } from "@/lib/plateforme-site";

export const metadata: Metadata = {
  title: { absolute: "Créer une Chambre · L’Alliée Virtuelle" },
};

type Saisies = {
  erreur?: string;
  nomChambre?: string;
  nom?: string;
  prenom?: string;
  email?: string;
  indicatif?: string;
  tel?: string;
  ville?: string;
  pays?: string;
  offre?: string;
  fonctions?: string;
};

export default async function CreerUneChambre({ searchParams }: { searchParams: Promise<Saisies> }) {
  const sp = await searchParams;
  const offres = await offresPubliques();
  const offreChoisie = offres.find((o) => o.id === sp.offre)?.id;
  const indicatif = INDICATIFS.some((i) => i.code === sp.indicatif) ? sp.indicatif : sp.indicatif === "" ? "" : "+261";
  const pays = (PAYS as readonly string[]).includes(sp.pays ?? "") ? sp.pays : "Madagascar";

  return (
    <CadreAuth large classe="site-plateforme" marque={<MarqueSite />} pied={PIED_PLATEFORME} illustration="chambre">
      <span className="surtitre text-marque-vert">Nouvelle Chambre</span>
      <h1 className="titre text-[clamp(26px,3.4vw,34px)] m-0 mt-2.5 mb-7">Créer une Chambre</h1>
      {sp.erreur ? <Alerte>{sp.erreur}</Alerte> : null}

      <form action={creerChambre} className="flex flex-col gap-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <ChampAuth label="Nom" icone={<User size={16} />}>
            <Saisie avecIcone name="nom" required maxLength={60} autoComplete="family-name" placeholder="Votre nom" defaultValue={sp.nom ?? ""} />
          </ChampAuth>
          <ChampAuth label="Prénom">
            <Saisie name="prenom" required maxLength={60} autoComplete="given-name" placeholder="Prénom" defaultValue={sp.prenom ?? ""} />
          </ChampAuth>
        </div>

        <ChampAuth label="Courriel" icone={<Mail size={16} />}>
          <Saisie avecIcone type="email" name="email" required autoComplete="email" placeholder="vous@entreprise.com" defaultValue={sp.email ?? ""} />
        </ChampAuth>

        <div>
          <span id="etiquette-tel" className="block text-[13px] font-semibold text-ink mb-1.5">
            Numéro de téléphone
          </span>
          <div className="flex gap-2">
            <select name="indicatif" defaultValue={indicatif} aria-label="Indicatif du pays" className={`${CHAMP_AUTH} px-2.5`} style={{ width: 118, flex: "none" }}>
              {INDICATIFS.map((i) => (
                <option key={i.code} value={i.code}>
                  {i.drapeau} {i.code}
                </option>
              ))}
              <option value="">Autre</option>
            </select>
            <Saisie type="tel" name="tel" required maxLength={24} autoComplete="tel-national" aria-labelledby="etiquette-tel" placeholder="34 00 000 00" defaultValue={sp.tel ?? ""} />
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <ChampAuth label="Ville" icone={<MapPin size={16} />}>
            <Saisie avecIcone name="ville" required maxLength={80} autoComplete="address-level2" placeholder="Antananarivo" defaultValue={sp.ville ?? ""} />
          </ChampAuth>
          <ChampAuth label="Pays">
            <select name="pays" defaultValue={pays} className={`${CHAMP_AUTH} px-3.5`}>
              {PAYS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </ChampAuth>
        </div>

        <ChampAuth label="Nom de la Chambre" icone={<Building2 size={16} />}>
          <Saisie avecIcone name="nomChambre" required maxLength={120} autoComplete="organization" defaultValue={sp.nomChambre ?? ""} />
        </ChampAuth>

        {offres.length ? <ChoixOffre offres={offres} choisie={offreChoisie} fonctions={sp.fonctions ? sp.fonctions.split(",") : []} /> : null}

        <ChampMotDePasse
          label="Mot de passe"
          hint={`${MOT_DE_PASSE_MIN} caractères au moins`}
          icone={<Lock size={16} />}
          name="motDePasse"
          required
          minLength={MOT_DE_PASSE_MIN}
          autoComplete="new-password"
        />

        <div className="mt-3">
          <BoutonEnvoi enCours="Création de l’espace…">Créer mon espace</BoutonEnvoi>
        </div>
      </form>
    </CadreAuth>
  );
}
