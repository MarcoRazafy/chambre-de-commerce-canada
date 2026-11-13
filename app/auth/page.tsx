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
import { ConnexionGoogle } from "@/components/public/ConnexionGoogle";
import { Saillant } from "@/components/ui";
import { PIED_PLATEFORME } from "@/components/plateforme/site/MarqueSite";
import { connexion } from "@/lib/actions/auth";
import { adresseSitePlateforme } from "@/lib/adresse-chambre";
import { hoteActuel } from "@/lib/chambre-courante";
import { lienGoogle } from "@/lib/google";
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
  // Sur les espaces partagés (dev. : les équipes, client. : les membres), la page sert à toutes les Chambres
  const ici = await hoteActuel();
  const google = lienGoogle({ depuis: ici.partage ?? ici.chambreId, suite });
  const site = adresseSitePlateforme() ?? "";
  const equipe = ici.partage === "equipe";

  return (
    <CadreAuth
      illustration="acces"
      pied={ici.partage ? PIED_PLATEFORME : undefined}
      accroche={
        ici.partage ? undefined : (
          <>
            Deux pays. Un <Saillant>réseau</Saillant>. Des{" "}
            <Saillant ton="vert">opportunités</Saillant>
            <span aria-hidden>.</span>
          </>
        )
      }
      sous={ici.partage ? undefined : "Retrouvez l’annuaire des membres, les rendez-vous de la chambre et vos échanges."}
    >
      <span className="surtitre text-marque-rouge">{equipe ? "Espace équipe" : "Espace membre"}</span>
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
          L’équipe de la Chambre l’examine. Dès qu’elle sera validée, vous recevrez un
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
          de la Chambre ; un e-mail vous préviendra.
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

      {google ? <ConnexionGoogle href={google} /> : null}

      <p className="text-[13.5px] text-muted mt-6 mb-0 pt-5 border-t border-line">
        {equipe ? "Pas encore de Chambre ?" : "Pas encore membre ?"}{" "}
        <Link
          href={equipe ? `${site}/creer-une-chambre` : ici.partage ? `${site}/devenir-membre` : "/auth/inscription"}
          className="text-marque-vert font-semibold no-underline hover:underline inline-flex items-center gap-1"
        >
          {equipe ? "Créer ma Chambre" : "Demander une adhésion"} <ArrowRight size={14} />
        </Link>
      </p>
    </CadreAuth>
  );
}
