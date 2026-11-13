import Link from "next/link";
import { ArrowLeft, ArrowRight, Link2Off, Lock } from "lucide-react";
import {
  Alerte,
  CadreAuth,
  ChampMotDePasse,
} from "@/components/public/CadreAuth";
import { BoutonEnvoi, EcranPassage } from "@/components/public/BoutonMarque";
import { Saillant } from "@/components/ui";
import { MOT_DE_PASSE_MIN } from "@/lib/auth";
import { definirMotDePasse } from "@/lib/actions/motdepasse";
import { jetonValide } from "@/lib/jetons";

export default async function NouveauMotDePassePage({
  searchParams,
}: {
  searchParams: Promise<{ jeton?: string; erreur?: string }>;
}) {
  const { jeton: brut, erreur } = await searchParams;
  const jeton = await jetonValide(brut);
  const invitation = jeton?.usage === "invitation";

  return (
    <CadreAuth
      illustration={!jeton ? "oubli" : invitation ? "bienvenue" : "mot-de-passe"}
      accroche={
        invitation ? (
          <>
            Bienvenue dans le <Saillant>réseau</Saillant>{" "}
            <Saillant ton="vert">CanCham</Saillant>.
          </>
        ) : (
          <>
            Un nouveau <Saillant>départ</Saillant>, en{" "}
            <Saillant ton="vert">toute sécurité</Saillant>.
          </>
        )
      }
      sous="Annuaire des membres, événements, messagerie et ressources : tout est à un mot de passe."
    >
      <span className="surtitre text-marque-rouge">Espace membre</span>

      {!jeton ? (
        <div className="apparition">
          <span className="mt-4 mb-5 w-12 h-12 rounded-full bg-accent-soft text-accent flex items-center justify-center">
            <Link2Off size={22} aria-hidden />
          </span>
          <h1 className="titre text-[clamp(25px,3vw,32px)] m-0 mb-3">
            Ce lien n’est plus valable
          </h1>
          <p className="text-[14.5px] text-muted m-0 mb-6">
            Il a déjà servi, ou il a expiré. Demandez-en un nouveau : il arrive
            en quelques secondes.
          </p>
          <Link
            href="/auth/mot-de-passe-oublie"
            className="btn-action w-full no-underline px-4 sm:px-[26px]"
          >
            Recevoir un nouveau lien{" "}
            <ArrowRight size={17} className="shrink-0" />
          </Link>
        </div>
      ) : (
        <>
          <h1 className="titre text-[clamp(25px,3vw,32px)] m-0 mt-2.5 mb-2">
            {invitation
              ? "Choisissez votre mot de passe"
              : "Nouveau mot de passe"}
          </h1>
          <p className="text-[14.5px] text-muted m-0 mb-6">
            {invitation ? "Votre accès" : "Le compte"}{" "}
            <strong className="text-ink">{jeton.user.email}</strong>
            {invitation
              ? " s’active dès que vous l’aurez choisi."
              : " : les sessions ouvertes ailleurs seront fermées."}
          </p>

          {erreur ? <Alerte>{erreur}</Alerte> : null}

          <form action={definirMotDePasse} className="flex flex-col gap-4">
            <input type="hidden" name="jeton" value={brut} />
            <input
              type="email"
              name="identifiant"
              autoComplete="username"
              value={jeton.user.email}
              readOnly
              hidden
            />
            <ChampMotDePasse
              label="Mot de passe"
              hint={`${MOT_DE_PASSE_MIN} caractères au moins.`}
              icone={<Lock size={16} />}
              name="motDePasse"
              required
              minLength={MOT_DE_PASSE_MIN}
              autoComplete="new-password"
              autoFocus
              placeholder="••••••••"
            />
            <ChampMotDePasse
              label="Confirmation"
              icone={<Lock size={16} />}
              name="confirmation"
              required
              minLength={MOT_DE_PASSE_MIN}
              autoComplete="new-password"
              placeholder="••••••••"
            />
            <div className="mt-1">
              <BoutonEnvoi enCours="Enregistrement…">
                {invitation ? "Activer mon accès" : "Enregistrer"}
              </BoutonEnvoi>
              <EcranPassage
                message="Ouverture de votre espace…"
                detail="Tableau de bord, messages et rendez-vous se préparent."
              />
            </div>
          </form>
        </>
      )}

      <p className="text-[13.5px] text-muted mt-6 mb-0 pt-5 border-t border-line">
        <Link
          href="/auth"
          className="text-marque-vert font-semibold no-underline hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Retour à la connexion
        </Link>
      </p>
    </CadreAuth>
  );
}
