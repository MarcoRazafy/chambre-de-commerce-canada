import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, KeyRound, Mail, MapPin, User } from "lucide-react";
import {
  CadreAuth,
  ChampAuth,
  CHAMP_AUTH,
  Saisie,
} from "@/components/public/CadreAuth";
import { BoutonEnvoi, EcranPassage } from "@/components/public/BoutonMarque";
import { ChoixFormules } from "@/components/public/ChoixCarte";
import { OptionsSecteurs } from "@/components/OptionsSecteurs";
import { Saillant } from "@/components/ui";
import { INDICATIFS, PAYS } from "@/lib/accueil";
import { deposerCandidature } from "@/lib/actions/accueil";
import { utilisateurConnecte } from "@/lib/session";
import { getFormules } from "@/lib/formules";

export default async function InscriptionPage() {
  const connecte = await utilisateurConnecte();
  if (connecte) redirect(connecte.role === "admin" ? "/admin" : "/membre");
  const formules = await getFormules();

  return (
    <CadreAuth
      large
      photo="/photos/auth-rencontre.jpg"
      alt="Membres et partenaires réunis lors d’une rencontre CanCham"
      accroche={
        <>
          Votre prochain <Saillant>partenariat</Saillant> commence{" "}
          <Saillant ton="vert">ici</Saillant>.
        </>
      }
      sous="Déposez votre demande en quelques minutes : l’équipe CanCham l’examine, puis vous complétez votre fiche à votre rythme."
    >
      <span className="surtitre text-marque-vert">Demande d’adhésion</span>
      <h1 className="titre text-[clamp(26px,3.4vw,34px)] m-0 mt-2.5 mb-2">
        Rejoindre CanCham
      </h1>
      <p className="text-[14.5px] text-muted m-0 mb-7">
        L’équipe examine chaque demande. Une fois la vôtre validée, vous recevez
        un e-mail : connectez-vous alors pour compléter votre fiche.
      </p>

      <form action={deposerCandidature} className="flex flex-col gap-3.5">
        <input type="hidden" name="retour" value="/auth/inscription" />

        <div className="grid gap-3.5 sm:grid-cols-2">
          <ChampAuth label="Nom" icone={<User size={16} />}>
            <Saisie
              avecIcone
              name="nomRep"
              required
              maxLength={60}
              autoComplete="family-name"
              placeholder="Votre nom"
            />
          </ChampAuth>
          <ChampAuth label="Prénom">
            <Saisie
              name="prenomRep"
              required
              maxLength={60}
              autoComplete="given-name"
              placeholder="Prénom"
            />
          </ChampAuth>
        </div>

        <ChampAuth label="Courriel" icone={<Mail size={16} />}>
          <Saisie
            avecIcone
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="vous@entreprise.mg"
          />
        </ChampAuth>

        <div>
          <span
            id="etiquette-tel"
            className="block text-[13px] font-semibold text-ink mb-1.5"
          >
            Numéro de téléphone
          </span>
          <div className="flex gap-2">
            <select
              name="indicatif"
              defaultValue="+261"
              aria-label="Indicatif du pays"
              className={`${CHAMP_AUTH} px-2.5`}
              style={{ width: 118, flex: "none" }}
            >
              {INDICATIFS.map((i) => (
                <option key={i.code} value={i.code}>
                  {i.drapeau} {i.code}
                </option>
              ))}
              <option value="">Autre</option>
            </select>
            <Saisie
              type="tel"
              name="tel"
              required
              maxLength={24}
              autoComplete="tel-national"
              aria-labelledby="etiquette-tel"
              placeholder="34 00 000 00"
            />
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <ChampAuth label="Ville" icone={<MapPin size={16} />}>
            <Saisie
              avecIcone
              name="ville"
              required
              maxLength={80}
              autoComplete="address-level2"
              placeholder="Antananarivo"
            />
          </ChampAuth>
          <ChampAuth label="Pays">
            <select
              name="pays"
              defaultValue="Madagascar"
              className={`${CHAMP_AUTH} px-3.5`}
            >
              {PAYS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </ChampAuth>
        </div>

        <ChampAuth
          label="Nom de l’entreprise représentée"
          hint="Mettez N/A si vous n’avez pas d’entreprise."
          icone={<Building2 size={16} />}
        >
          <Saisie
            avecIcone
            name="nom"
            required
            maxLength={120}
            autoComplete="organization"
            placeholder="Ex. Zafy Design, ou N/A"
          />
        </ChampAuth>

        <ChampAuth label="Secteur d’activité (facultatif)">
          <select
            name="secteur"
            defaultValue=""
            className={`${CHAMP_AUTH} px-3.5`}
          >
            <OptionsSecteurs vide="Choisissez un secteur" />
          </select>
        </ChampAuth>

        {formules.length ? <fieldset className="m-0 p-0 border-0">
          <legend className="block text-[13px] font-semibold text-ink mb-1.5">
            Formule d’adhésion
          </legend>
          <p className="m-0 mb-3 text-[12.8px] text-muted">
            Choisissez celle qui correspond à votre profil. La cotisation se
            règle après validation de votre demande, jamais avant.
          </p>
          <ChoixFormules formules={formules} />
        </fieldset> : null}

        <ChampAuth label="Vos motivations à nous rejoindre">
          <textarea
            name="motivation"
            required
            rows={3}
            maxLength={1000}
            placeholder="Ce que vous attendez de la chambre : contacts au Canada, événements, accompagnement…"
            className={`${CHAMP_AUTH} px-3.5`}
          />
        </ChampAuth>

        <p className="m-0 flex gap-2.5 items-start text-[12.8px] text-muted bg-surface-2 rounded-lg px-3.5 py-3">
          <KeyRound size={16} className="shrink-0 mt-0.5 text-faint" />
          <span>
            Pas de mot de passe à choisir maintenant : dès que l’équipe CanCham
            aura validé votre demande, vous recevrez un e-mail avec un lien pour
            le créer.
          </span>
        </p>

        <div className="mt-3">
          <BoutonEnvoi enCours="Envoi de la demande…">
            Envoyer ma demande
          </BoutonEnvoi>
          <EcranPassage
            message="Envoi de votre demande…"
            detail="L’équipe CanCham est prévenue et l’examine au plus vite."
          />
        </div>
      </form>

      <p className="text-[13.5px] text-muted mt-6 mb-0">
        Déjà un compte ?{" "}
        <Link
          href="/auth"
          className="text-marque-vert font-semibold no-underline hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </CadreAuth>
  );
}
