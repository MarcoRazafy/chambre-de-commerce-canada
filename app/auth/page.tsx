import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Lock, Mail } from "lucide-react";
import {
  Alerte,
  CadreAuth,
  ChampAuth,
  ChampMotDePasse,
  Confirmation,
  Saisie,
} from "@/components/public/CadreAuth";
import { BoutonEnvoi, EcranPassage } from "@/components/public/BoutonMarque";
import { Saillant } from "@/components/ui";
import { connexion } from "@/lib/actions/auth";
import { utilisateurConnecte } from "@/lib/session";

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{
    erreur?: string;
    email?: string;
    suite?: string;
    demande?: string;
    attente?: string;
  }>;
}) {
  const { erreur, email, suite, demande, attente } = await searchParams;
  const demandeDeposee = demande === "1" && !erreur;
  const enAttente = attente === "1" && !erreur;

  const connecte = await utilisateurConnecte();
  if (connecte && !enAttente) {
    redirect(connecte.role === "admin" ? "/admin" : "/membre");
  }

  return (
    <CadreAuth
      illustration="acces"
      accroche={
        <>
          Deux pays. Un <Saillant>réseau</Saillant>. Des{" "}
          <Saillant ton="vert">opportunités</Saillant>
          <span aria-hidden>.</span>
        </>
      }
      sous="Retrouvez l’annuaire des membres, les rendez-vous de la chambre et vos échanges."
    >
      <span className="surtitre text-marque-rouge">Espace membre</span>
      <h1 className="titre text-[clamp(25px,3vw,32px)] m-0 mt-2.5 mb-2">
        Connexion
      </h1>
      <p className="text-[14.5px] text-muted m-0 mb-6">
        Entrez vos identifiants pour accéder à votre espace.
      </p>

      {erreur ? <Alerte>{erreur}</Alerte> : null}
      {demandeDeposee ? (
        <Confirmation>
          <strong className="block mb-1">
            Votre demande d’adhésion est envoyée.
          </strong>
          L’équipe CanCham l’examine. Dès qu’elle sera validée, vous recevrez un
          e-mail avec un lien pour créer votre mot de passe : vous pourrez alors
          vous connecter et compléter votre fiche.
        </Confirmation>
      ) : null}
      {enAttente ? (
        <Confirmation>
          <strong className="block mb-1">
            Votre demande d’adhésion est en cours d’examen.
          </strong>
          Vous pourrez vous connecter dès qu’elle sera validée par l’équipe
          CanCham ; un e-mail vous préviendra.
        </Confirmation>
      ) : null}

      <form action={connexion} className="flex flex-col gap-4">
        {suite?.startsWith("/") ? (
          <input type="hidden" name="suite" value={suite} />
        ) : null}

        <ChampAuth label="Adresse courriel" icone={<Mail size={16} />}>
          <Saisie
            avecIcone
            type="email"
            name="email"
            required
            autoComplete="email"
            autoFocus
            defaultValue={email ?? ""}
            placeholder="vous@entreprise.mg"
          />
        </ChampAuth>

        <ChampMotDePasse
          label="Mot de passe"
          icone={<Lock size={16} />}
          name="motDePasse"
          required
          autoComplete="current-password"
          placeholder="Votre mot de passe"
        />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2.5 text-[13.5px] text-muted cursor-pointer w-fit">
            <input
              type="checkbox"
              name="souvenir"
              value="1"
              defaultChecked
              className="w-4 h-4 accent-[var(--marque-vert)] cursor-pointer"
            />
            Se souvenir de moi
          </label>
          <Link
            href="/auth/mot-de-passe-oublie"
            className="text-[13.5px] text-marque-vert font-semibold no-underline hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <div className="mt-1">
          <BoutonEnvoi enCours="Connexion…">Se connecter</BoutonEnvoi>
          <EcranPassage
            message="Ouverture de votre espace…"
            detail="Tableau de bord, messages et rendez-vous se préparent."
          />
        </div>
      </form>

      <p className="text-[13.5px] text-muted mt-6 mb-0 pt-5 border-t border-line">
        Pas encore membre ?{" "}
        <Link
          href="/auth/inscription"
          className="text-marque-vert font-semibold no-underline hover:underline inline-flex items-center gap-1"
        >
          Demander une adhésion <ArrowRight size={14} />
        </Link>
      </p>
    </CadreAuth>
  );
}
