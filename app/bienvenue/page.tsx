import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Phone,
  Plus,
  User,
} from "lucide-react";
import { ChampAuth, CHAMP_AUTH, Saisie } from "@/components/public/CadreAuth";
import { BoutonPilule } from "@/components/public/BoutonMarque";
import { ChoixCarte, ChoixFormules } from "@/components/public/ChoixCarte";
import { LogoOfficiel } from "@/components/public/Marque";
import { OptionsSecteurs } from "@/components/OptionsSecteurs";
import {
  ETAPES_ACCUEIL,
  NOMBRE_ETAPES,
  PAYS,
  PROVISOIRE,
  nomDepuisCourriel,
  numeroEtape,
  saisi,
  type EtapeAccueil,
} from "@/lib/accueil";
import { enregistrerEtape, terminerAccueil } from "@/lib/actions/accueil";
import { PHOTOS_PAR_PRODUIT } from "@/lib/membership";
import { getMember } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import type { Member, User as Utilisateur } from "@/lib/types";
import { EntreeFichier } from "@/components/EnvoisSuivis";
import { getFormules } from "@/lib/formules";
import type { Formule } from "@/lib/membership";

const TEXTES: Record<EtapeAccueil, { titre: string; intro: string }> = {
  vous: {
    titre: "Faisons connaissance",
    intro:
      "Qui êtes-vous ? L’équipe CanCham saura qui contacter pour votre adhésion, et les autres membres aussi.",
  },
  entreprise: {
    titre: "Parlez-nous de votre entreprise",
    intro:
      "Ces informations composent votre fiche dans l’annuaire : c’est ce que les membres voient en premier.",
  },
  formule: {
    titre: "Votre adhésion",
    intro:
      "Votre formule fixe la cotisation annuelle, que l’équipe confirme avec vous avant tout règlement.",
  },
  activite: {
    titre: "Présentez votre activité",
    intro:
      "Ce que vous faites et ce que vous cherchez : c’est ce qui déclenche les mises en relation.",
  },
  visuels: {
    titre: "Votre logo et votre couverture",
    intro:
      "Ils habillent votre fiche dans l’annuaire. Facultatifs : vous pourrez les ajouter plus tard depuis « Mon entreprise ».",
  },
  produits: {
    titre: "Vos produits et services",
    intro:
      "Ce que vous proposez aux autres membres, avec des photos si vous en avez. Ajoutez-en autant que vous voulez, ou passez l’étape.",
  },
};

export default async function BienvenuePage({
  searchParams,
}: {
  searchParams: Promise<{ etape?: string }>;
}) {
  const user = await getCurrentUser("membre");
  const membre = user.memberId ? await getMember(user.memberId) : null;
  if (!membre) notFound();
  if (membre.statut === "candidature") redirect("/auth?attente=1");

  const numero = numeroEtape((await searchParams).etape);
  const etape = ETAPES_ACCUEIL[numero - 1].cle;
  const texte = TEXTES[etape];
  const derniere = numero === NOMBRE_ETAPES;

  return (
    <form
      key={etape}
      action={enregistrerEtape}
      className="min-h-dvh flex flex-col bg-white"
    >
      <input type="hidden" name="etape" value={numero} />

      <header className="flex items-center justify-between gap-4 px-5 sm:px-8 h-[72px] shrink-0">
        <LogoOfficiel className="w-[150px] sm:w-[200px] h-auto" priority />
        <Link
          href="/membre/profil"
          className="text-[14px] font-semibold text-muted no-underline hover:text-ink"
        >
          Terminer plus tard
        </Link>
      </header>

      <main className="flex-1 px-5 sm:px-8 pb-36">
        <div className="max-w-[1180px] mx-auto">
          <Progression numero={numero} />

          <div className="apparition text-center max-w-[760px] mx-auto">
            <span className="surtitre text-marque-vert">
              Étape {numero} sur {NOMBRE_ETAPES}
            </span>
            <h1 className="titre text-[clamp(28px,3.4vw,40px)] leading-[1.15] m-0 mt-3">
              {texte.titre}
            </h1>
            <p className="text-[16px] text-muted leading-relaxed m-0 mt-3">
              {texte.intro}
            </p>
          </div>

          <div
            className="apparition max-w-[680px] mx-auto mt-10 flex flex-col gap-4"
            style={{ animationDelay: "0.08s" }}
          >
            {etape === "vous" ? <EtapeVous user={user} /> : null}
            {etape === "entreprise" ? (
              <EtapeEntreprise membre={membre} />
            ) : null}
            {etape === "formule" ? <EtapeFormule membre={membre} formules={await getFormules()} /> : null}
            {etape === "activite" ? <EtapeActivite membre={membre} /> : null}
            {etape === "visuels" ? <EtapeVisuels membre={membre} /> : null}
            {etape === "produits" ? <EtapeProduits membre={membre} /> : null}
          </div>
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 bg-white border-t border-line">
        <div className="flex items-center gap-3 px-5 sm:px-8 h-[76px]">
          {numero > 1 ? (
            <Link
              href={`/bienvenue?etape=${numero - 1}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-5 py-2.5 text-[15px] font-semibold text-marque-vert no-underline hover:border-marque-vert/40 hover:bg-marque-vert/[0.05]"
            >
              <ArrowLeft size={16} /> Précédent
            </Link>
          ) : null}

          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            {derniere ? (
              <button
                type="submit"
                formAction={terminerAccueil}
                formNoValidate
                className="bg-transparent border-0 cursor-pointer px-3 py-2.5 text-[15px] font-semibold text-muted hover:text-ink"
              >
                Ignorer
              </button>
            ) : (
              <Link
                href={`/bienvenue?etape=${numero + 1}`}
                className="px-3 py-2.5 text-[15px] font-semibold text-muted no-underline hover:text-ink"
              >
                Ignorer
              </Link>
            )}
            <BoutonPilule enCours="Enregistrement…">
              {derniere ? "Terminer" : "Suivant"}
            </BoutonPilule>
          </div>
        </div>
      </footer>
    </form>
  );
}

function Progression({ numero }: { numero: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Progression de l’inscription"
      aria-valuemin={1}
      aria-valuemax={NOMBRE_ETAPES}
      aria-valuenow={numero}
      className="h-1 rounded-full bg-line overflow-hidden mt-3 mb-10"
    >
      <div
        className="h-full rounded-full bg-marque-vert transition-[width] duration-500"
        style={{ width: `${(numero / NOMBRE_ETAPES) * 100}%` }}
      />
    </div>
  );
}

function EtapeVous({ user }: { user: Utilisateur }) {
  const provisoire = user.nom === nomDepuisCourriel(user.email);
  const [prenom, ...reste] = provisoire ? [""] : user.nom.split(" ");
  return (
    <>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <ChampAuth label="Prénom" icone={<User size={16} />}>
          <Saisie
            avecIcone
            name="prenom"
            autoComplete="given-name"
            defaultValue={prenom}
            placeholder="Prénom"
          />
        </ChampAuth>
        <ChampAuth label="Nom">
          <Saisie
            name="nom"
            autoComplete="family-name"
            defaultValue={reste.join(" ")}
            placeholder="Nom"
          />
        </ChampAuth>
      </div>
      <ChampAuth label="Fonction" icone={<Briefcase size={16} />}>
        <Saisie
          avecIcone
          name="fonction"
          autoComplete="organization-title"
          defaultValue={saisi(user.fonction, PROVISOIRE.fonction)}
          placeholder="Ex. Directrice générale"
        />
      </ChampAuth>
      <ChampAuth label="Téléphone" icone={<Phone size={16} />}>
        <Saisie
          avecIcone
          type="tel"
          name="tel"
          autoComplete="tel"
          defaultValue={user.tel ?? ""}
          placeholder="+261 3…"
        />
      </ChampAuth>
    </>
  );
}

function EtapeEntreprise({ membre }: { membre: Member }) {
  return (
    <>
      <fieldset className="m-0 p-0 border-0">
        <legend className="block text-[13px] font-semibold text-ink mb-2">
          Vous adhérez en tant que
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoixCarte
            name="type"
            value="morale"
            defaultChecked={membre.type !== "physique"}
            titre="Entreprise"
            detail="Personne morale : société, association, ONG"
            icone={<Building2 size={26} strokeWidth={1.6} />}
          />
          <ChoixCarte
            name="type"
            value="physique"
            defaultChecked={membre.type === "physique"}
            titre="Indépendant"
            detail="Personne physique : consultant, travailleur autonome"
            icone={<User size={26} strokeWidth={1.6} />}
          />
        </div>
      </fieldset>

      <ChampAuth
        label="Nom de l’entreprise"
        hint="Indépendant : laissez vide, votre fiche portera votre nom."
        icone={<Building2 size={16} />}
      >
        <Saisie
          avecIcone
          name="nom"
          autoComplete="organization"
          defaultValue={saisi(membre.nom, PROVISOIRE.entreprise)}
          placeholder="Ex. Zafy Design"
        />
      </ChampAuth>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <ChampAuth label="Secteur d’activité">
          <select
            name="secteur"
            defaultValue={saisi(membre.secteur, PROVISOIRE.secteur)}
            className={`${CHAMP_AUTH} px-3.5`}
          >
            <OptionsSecteurs
              actuel={saisi(membre.secteur, PROVISOIRE.secteur)}
            />
          </select>
        </ChampAuth>
        <ChampAuth label="Ville">
          <Saisie
            name="ville"
            autoComplete="address-level2"
            defaultValue={membre.ville}
            placeholder="Antananarivo"
          />
        </ChampAuth>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <ChampAuth label="Statut juridique">
          <select
            name="statutJuridique"
            defaultValue={membre.statutJuridique ?? ""}
            className={`${CHAMP_AUTH} px-3.5`}
          >
            <option value="">À préciser</option>
            {[
              "Entreprise Individuelle (EI)",
              "SARL",
              "SA",
              "Association",
              "Autre",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </ChampAuth>
        <ChampAuth label="Pays d’implantation">
          <select
            name="pays"
            defaultValue={membre.pays ?? "Madagascar"}
            className={`${CHAMP_AUTH} px-3.5`}
          >
            {PAYS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </ChampAuth>
      </div>

      <ChampAuth label="Site web (facultatif)">
        <Saisie
          type="url"
          name="siteweb"
          autoComplete="url"
          defaultValue={membre.siteweb ?? ""}
          placeholder="https://www.entreprise.mg"
        />
      </ChampAuth>
    </>
  );
}

function EtapeFormule({ membre, formules }: { membre: Member; formules: Formule[] }) {
  return (
    <>
      <fieldset className="m-0 p-0 border-0">
        <legend className="block text-[13px] font-semibold text-ink mb-2">
          Formule d’adhésion
        </legend>
        <ChoixFormules formules={formules} actuelle={membre.formule?.id ?? null} />
      </fieldset>
      <ChampAuth
        label="Motivation à rejoindre CanCham"
        hint="Ce que vous attendez de la chambre : contacts au Canada, événements, accompagnement…"
      >
        <textarea
          name="motivation"
          rows={4}
          maxLength={1000}
          defaultValue={membre.motivation ?? ""}
          placeholder="Nous cherchons à exporter vers le Canada…"
          className={`${CHAMP_AUTH} px-3.5`}
        />
      </ChampAuth>
    </>
  );
}

function EtapeActivite({ membre }: { membre: Member }) {
  return (
    <>
      <ChampAuth
        label="Votre activité en une phrase"
        hint="Elle s’affiche sous votre nom, dans l’annuaire."
      >
        <Saisie
          name="activite"
          maxLength={120}
          defaultValue={saisi(membre.activite, PROVISOIRE.activite)}
          placeholder="Ex. Huiles essentielles bio du sud de Madagascar"
        />
      </ChampAuth>
      <ChampAuth label="Présentation">
        <textarea
          name="desc"
          rows={4}
          defaultValue={saisi(membre.desc, PROVISOIRE.desc)}
          placeholder="Vos produits ou services, vos marchés, ce qui vous distingue…"
          className={`${CHAMP_AUTH} px-3.5`}
        />
      </ChampAuth>
      <ChampAuth
        label="Ce que vous recherchez"
        hint="Une ligne par besoin : acheteurs au Canada, distributeur, partenaire…"
      >
        <textarea
          name="besoins"
          rows={3}
          defaultValue={membre.besoins ?? ""}
          placeholder="Des acheteurs au Canada…"
          className={`${CHAMP_AUTH} px-3.5`}
        />
      </ChampAuth>
    </>
  );
}

const CHAMP_FICHIER =
  "w-full min-w-0 rounded-lg border border-line bg-white text-ink text-[14px] px-3.5 py-2.5 outline-none focus:border-marque-vert/25 focus:bg-marque-vert/[0.06] file:mr-3 file:rounded-md file:border-0 file:bg-marque-vert/10 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-marque-vert file:cursor-pointer";

function EtapeVisuels({ membre }: { membre: Member }) {
  return (
    <>
      <ChampAuth
        label="Logo (facultatif)"
        hint={
          membre.logo
            ? "Un logo est déjà enregistré : choisissez-en un autre pour le remplacer."
            : "PNG sur fond transparent de préférence."
        }
      >
        <EntreeFichier name="logo" accept="image/*" className={CHAMP_FICHIER} />
      </ChampAuth>
      <ChampAuth
        label="Photo de couverture (facultatif)"
        hint={
          membre.cover
            ? "Une couverture est déjà enregistrée : choisissez-en une autre pour la remplacer."
            : "Le bandeau en tête de votre fiche : une photo au format paysage."
        }
      >
        <EntreeFichier
          name="cover"
          accept="image/*"
          className={CHAMP_FICHIER}
        />
      </ChampAuth>
    </>
  );
}

function EtapeProduits({ membre }: { membre: Member }) {
  return (
    <>
      {membre.produits.length ? (
        <div className="rounded-lg border border-marque-vert/25 bg-marque-vert/[0.05] px-4 py-3">
          <div className="text-[13px] font-semibold text-marque-vert mb-1.5">
            Déjà dans votre catalogue
          </div>
          <ul className="m-0 p-0 list-none flex flex-col gap-1">
            {membre.produits.map((p, i) => (
              <li key={p.id ?? i} className="text-[14px] text-ink">
                {p.label}
                <span className="text-muted">
                  {" "}
                  · {p.type === "produit" ? "produit" : "service"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-3.5 grid-cols-[minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_180px]">
        <ChampAuth label="Titre de l’offre">
          <Saisie
            name="label"
            maxLength={120}
            placeholder="Ex. Huiles essentielles de ravintsara"
          />
        </ChampAuth>
        <ChampAuth label="Type">
          <select
            name="type"
            defaultValue="service"
            className={`${CHAMP_AUTH} px-3.5`}
          >
            <option value="service">Service</option>
            <option value="produit">Produit</option>
          </select>
        </ChampAuth>
      </div>
      <ChampAuth label="Description (facultatif)">
        <textarea
          name="description"
          rows={3}
          maxLength={2000}
          placeholder="Ce que l’offre comprend, pour qui, à quelles conditions…"
          className={`${CHAMP_AUTH} px-3.5`}
        />
      </ChampAuth>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <ChampAuth
          label="Prix indicatif (facultatif)"
          hint="En clair : « 25 000 Ar le flacon », « Sur devis »…"
        >
          <Saisie name="prix" maxLength={80} placeholder="Sur devis" />
        </ChampAuth>
        <ChampAuth
          label="Photos (facultatif)"
          hint={`${PHOTOS_PAR_PRODUIT} au plus.`}
        >
          <EntreeFichier
            name="photos"
            accept="image/*"
            multiple
            className={CHAMP_FICHIER}
          />
        </ChampAuth>
      </div>
      <button
        type="submit"
        name="encore"
        value="1"
        className="self-start inline-flex items-center gap-1.5 rounded-full border border-marque-vert/40 bg-white px-5 py-2.5 text-[14px] font-semibold text-marque-vert cursor-pointer hover:bg-marque-vert/[0.06]"
      >
        <Plus size={16} aria-hidden /> Ajouter et en saisir une autre
      </button>
    </>
  );
}
