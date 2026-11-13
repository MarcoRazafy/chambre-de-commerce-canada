import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Check,
  CreditCard,
  FolderOpen,
  Globe,
  Headset,
  LockKeyhole,
  Mail,
  Network,
  ShieldCheck,
  Tag,
  Users,
} from "lucide-react";
import {
  AppelFinal,
  EnTeteSection,
  FOCUS,
  FormulaireEmail,
  PageSite,
  Questions,
  Rassurances,
} from "@/components/plateforme/site/blocs";
import { CartesTarifs } from "@/components/plateforme/site/Tarifs";
import { VisiteEspace } from "@/components/plateforme/site/VisiteEspace";
import { offresPubliques } from "@/lib/plateforme-site";

export const metadata: Metadata = {
  title: {
    absolute: "L’Alliée Virtuelle · La plateforme des Chambres de commerce",
  },
  description:
    "Adhésions, cotisations payées par carte, événements, mises en relation et communication : l’espace de gestion des Chambres de commerce et des associations d’affaires, avec un espace pour leurs membres.",
};

const FONCTIONS = [
  {
    icone: Users,
    titre: "Membres et adhésions",
    texte:
      "Fiches des entreprises, formules d’adhésion, demandes à valider, statut à jour ou en retard.",
  },
  {
    icone: CreditCard,
    titre: "Cotisations et factures",
    texte:
      "Factures, relances et paiement par carte, encaissé directement sur le compte Stripe de la Chambre.",
  },
  {
    icone: CalendarDays,
    titre: "Événements",
    texte:
      "Programme, inscriptions, billets, présences et agenda partagé avec les membres.",
  },
  {
    icone: Network,
    titre: "Maillage",
    texte:
      "Mises en relation entre membres selon ce qu’ils cherchent et ce qu’ils proposent.",
  },
  {
    icone: CalendarClock,
    titre: "Rendez-vous",
    texte:
      "Les membres réservent en ligne un créneau avec l’équipe de la Chambre.",
  },
  {
    icone: Tag,
    titre: "Offres et promotions",
    texte: "Les avantages que les membres proposent au reste du réseau.",
  },
  {
    icone: FolderOpen,
    titre: "Ressources et services",
    texte: "Documents, vidéos et services réservés aux membres.",
  },
  {
    icone: Mail,
    titre: "Newsletter et messagerie",
    texte: "Lettres d’information, messages entre membres et avec l’équipe.",
  },
];

const ESPACES = [
  {
    titre: "L’espace de l’équipe",
    sous: "Le back-office de la Chambre",
    teinte: "bg-marque-rouge",
    points: [
      "Tableau de bord : membres, encaissements, événements",
      "Membres, demandes d’adhésion et contacts",
      "Paiements, factures et relances",
      "Événements, inscriptions et présences",
      "Newsletter et messagerie",
      "Paramètres : formules, paiement en ligne, courriels",
    ],
  },
  {
    titre: "L’espace des membres",
    sous: "Inclus pour chaque entreprise membre",
    teinte: "bg-marque-vert",
    points: [
      "Annuaire et maillage du réseau",
      "Inscription aux événements",
      "Cotisation et factures, payées par carte",
      "Rendez-vous avec l’équipe",
      "Messagerie et offres des membres",
      "Ressources et services",
    ],
  },
];

const ETAPES = [
  {
    titre: "Créez votre Chambre",
    texte:
      "Son nom, l’adresse de son espace et votre offre : l’espace est prêt tout de suite, sans carte bancaire.",
  },
  {
    titre: "Réglez-la à votre image",
    texte:
      "Logo, coordonnées, formules d’adhésion, paiement par carte avec Stripe et expéditeur des courriels.",
  },
  {
    titre: "Accueillez vos membres",
    texte:
      "Ils s’inscrivent à l’adresse de votre Chambre, règlent leur cotisation et retrouvent tout dans leur espace.",
  },
];

const CONFIANCE = [
  {
    icone: ShieldCheck,
    titre: "Données séparées",
    texte:
      "Chaque Chambre a son espace : ses membres, ses paiements et ses fichiers ne sont visibles que d’elle.",
  },
  {
    icone: CreditCard,
    titre: "Paiements par Stripe",
    texte:
      "Les cotisations arrivent sur le compte Stripe de la Chambre ; aucun numéro de carte n’est conservé.",
  },
  {
    icone: Globe,
    titre: "Votre adresse",
    texte:
      "Un espace à l’adresse de votre Chambre, qui peut aussi répondre à votre propre domaine.",
  },
  {
    icone: LockKeyhole,
    titre: "Vous gardez la main",
    texte:
      "Le support n’entre dans votre espace que si vous l’autorisez, pour la durée que vous choisissez.",
  },
];

const QUESTIONS = [
  {
    q: "Faut-il une carte bancaire pour commencer ?",
    r: "Non. Vous créez votre Chambre et choisissez votre offre ; la carte ne sert qu’au paiement de l’abonnement de l’offre payante.",
  },
  {
    q: "Mes membres peuvent-ils payer leur cotisation par carte ?",
    r: "Oui. Connectez le compte Stripe de la Chambre depuis Paramètres › Paiements en ligne : les membres paient sur une page sécurisée de Stripe et l’argent arrive sur votre compte.",
  },
  {
    q: "Comment mes membres rejoignent-ils la Chambre ?",
    r: "Depuis la page « Devenir membre » de ce site, ou directement à l’adresse de votre Chambre. Vous validez leur demande depuis votre espace.",
  },
  {
    q: "Puis-je utiliser mon propre nom de domaine ?",
    r: "Oui. Votre espace a une adresse sur la plateforme et peut aussi répondre à votre domaine : écrivez au Support IT depuis votre espace pour le relier. Vos courriels peuvent partir de votre domaine une fois celui-ci validé.",
  },
  {
    q: "Puis-je ajouter ou retirer des fonctions plus tard ?",
    r: "Oui. Depuis la page Abonnement de votre espace, composez votre offre à la carte : cochez ou décochez des fonctions, la facture suivante en tient compte. Vos données sont gardées.",
  },
  {
    q: "Qui contacter en cas de problème ?",
    r: "Le Support IT, depuis la bulle de votre espace : vous pouvez y joindre des captures d’écran ou des vidéos.",
  },
];

// Site public de la plateforme : présentation, fonctions, fonctionnement, tarifs (offres de l'Admin GM), questions
export default async function AccueilPlateforme() {
  const offres = await offresPubliques();

  return (
    <PageSite>
      {/* Accroche */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 site-grille" />
        <div
          aria-hidden
          className="absolute -top-40 -left-32 w-[560px] h-[560px] rounded-full blur-3xl opacity-60"
          style={{
            background:
              "radial-gradient(circle, rgb(173 7 7 / 0.16), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="absolute top-[38%] -right-40 w-[620px] h-[620px] rounded-full blur-3xl opacity-60"
          style={{
            background:
              "radial-gradient(circle, rgb(0 113 64 / 0.16), transparent 70%)",
          }}
        />

        <div className="relative max-w-[1200px] mx-auto px-5 sm:px-8 pt-14 pb-20 sm:pt-20 lg:pt-24 lg:pb-28">
          <div className="flex flex-col items-center text-center">
            <span className="entree inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3.5 py-1.5 text-[13px] font-semibold text-muted">
              <span
                aria-hidden
                className="size-2 rounded-full bg-marque-vert"
              />
              Pour les Chambres de commerce et les associations d’affaires
            </span>
            <h1 className="entree entree-2 mt-6 mb-0 max-w-[900px] text-[clamp(36px,6vw,66px)] leading-[1.03] font-extrabold tracking-[-0.035em] text-ink">
              Votre Chambre, ses membres et leurs cotisations,{" "}
              <span className="texte-degrade">au même endroit.</span>
            </h1>
            <p className="entree entree-3 mt-6 mb-0 max-w-[640px] text-[18px] leading-relaxed text-muted">
              Adhésions, paiements par carte, événements, mises en relation et
              communication : composez l’espace de votre Chambre avec les
              fonctions dont elle a besoin.
            </p>
            <div className="entree entree-4 mt-9 w-full flex justify-center">
              <FormulaireEmail bouton="Créer ma Chambre" />
            </div>
            <div className="entree entree-4 mt-6">
              <Rassurances
                centre
                points={[
                  "Gratuit pour démarrer",
                  "Sans carte bancaire",
                  "Fonctions au choix",
                ]}
              />
            </div>
            <p className="entree entree-4 mt-5 mb-0 text-[14.5px] text-muted">
              Vous êtes une entreprise ?{" "}
              <Link
                href="/devenir-membre"
                className={`font-semibold text-ink underline underline-offset-4 decoration-line hover:decoration-ink rounded-sm ${FOCUS}`}
              >
                Devenir membre d’une Chambre
              </Link>
            </p>
          </div>

          <div className="entree entree-4 mt-16 lg:mt-20 max-w-[1100px] mx-auto">
            <VisiteEspace />
          </div>
        </div>
      </section>

      {/* Fonctions */}
      <section id="fonctions" className="bg-[#f6f8fb] border-y border-line">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 lg:py-28">
          <EnTeteSection
            surtitre="Fonctions"
            titre="Tout ce que votre Chambre fait, dans un seul outil"
            texte="Plus de tableurs ni de relances à la main : chaque fonction est reliée aux autres, de l’adhésion au paiement."
          />
          <ul className="mt-14 m-0 p-0 list-none grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FONCTIONS.map(({ icone: Icone, titre, texte }) => (
              <li
                key={titre}
                className="group rounded-2xl border border-line bg-white p-6 transition-[border-color,box-shadow,transform] duration-200 hover:border-[#cdd6e1] hover:shadow-[0_18px_40px_-26px_rgba(15,29,44,0.4)] motion-safe:hover:-translate-y-0.5"
              >
                <span className="grid place-items-center size-11 rounded-xl bg-marque-nuit text-white">
                  <Icone size={20} aria-hidden />
                </span>
                <h3 className="mt-5 mb-0 text-[17px] font-bold text-ink">
                  {titre}
                </h3>
                <p className="mt-2 mb-0 text-[14.5px] leading-relaxed text-muted">
                  {texte}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Deux espaces */}
      <section className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 lg:py-28">
        <EnTeteSection
          surtitre="Deux espaces"
          titre="Un espace pour l’équipe, un espace pour les membres"
          texte="Votre équipe gère la Chambre ; chaque entreprise membre retrouve ses événements, ses factures et le réseau."
        />
        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          {ESPACES.map((e) => (
            <article
              key={e.titre}
              className="relative overflow-hidden rounded-2xl border border-line bg-white p-7 sm:p-9"
            >
              <span
                aria-hidden
                className={`absolute inset-x-0 top-0 h-1 ${e.teinte}`}
              />
              <h3 className="m-0 text-[22px] font-extrabold text-ink">
                {e.titre}
              </h3>
              <p className="mt-1.5 mb-0 text-[14.5px] text-muted">{e.sous}</p>
              <ul className="mt-6 m-0 p-0 list-none grid gap-3">
                {e.points.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-3 text-[15px] text-ink"
                  >
                    <span
                      className={`grid place-items-center size-5 rounded-full text-white shrink-0 mt-0.5 ${e.teinte}`}
                    >
                      <Check size={12} strokeWidth={3} aria-hidden />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Fonctionnement */}
      <section
        id="fonctionnement"
        className="bg-marque-nuit text-white relative overflow-hidden"
      >
        <div
          aria-hidden
          className="absolute -top-40 right-0 w-[520px] h-[520px] rounded-full blur-3xl opacity-40"
          style={{
            background:
              "radial-gradient(circle, rgb(0 113 64 / 0.5), transparent 70%)",
          }}
        />
        <div className="relative max-w-[1200px] mx-auto px-5 sm:px-8 py-20 lg:py-28">
          <div className="max-w-[680px]">
            <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#ff8a8a]">
              Fonctionnement
            </span>
            <h2 className="mt-3 mb-0 text-[clamp(28px,3.6vw,40px)] leading-[1.12] font-extrabold text-white">
              Votre espace en ligne en trois étapes
            </h2>
          </div>
          <ol className="mt-14 m-0 p-0 list-none grid gap-5 md:grid-cols-3">
            {ETAPES.map((e, i) => (
              <li
                key={e.titre}
                className="rounded-2xl border border-white/12 bg-white/[0.05] p-7"
              >
                <span
                  className="grid place-items-center size-11 rounded-full text-[17px] font-extrabold text-white"
                  style={{ background: "var(--marque-degrade)" }}
                >
                  {i + 1}
                </span>
                <h3 className="mt-5 mb-0 text-[19px] font-bold text-white">
                  {e.titre}
                </h3>
                <p className="mt-2 mb-0 text-[15px] leading-relaxed text-white/70">
                  {e.texte}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Tarifs */}
      <section
        id="tarifs"
        className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 lg:py-28"
      >
        <EnTeteSection
          centre
          surtitre="Tarifs"
          titre="Choisissez votre offre, ou composez-la"
          texte="Les membres et l’espace membre sont inclus dans chaque offre. À la carte : ne payez que les fonctions dont votre Chambre a besoin."
        />
        <div className="mt-14">
          <CartesTarifs offres={offres} />
        </div>
        <p className="mt-10 mb-0 text-center">
          <Link
            href="/tarifs"
            className={`inline-flex items-center gap-2 min-h-[44px] px-2 text-[15.5px] font-bold text-ink no-underline hover:text-marque-rouge rounded-md ${FOCUS}`}
          >
            Comparer les offres en détail <ArrowRight size={17} aria-hidden />
          </Link>
        </p>
      </section>

      {/* Confiance */}
      <section className="bg-[#f6f8fb] border-y border-line">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 lg:py-24">
          <EnTeteSection
            surtitre="Sécurité"
            titre="Vos données et vos paiements restent les vôtres"
          />
          <ul className="mt-12 m-0 p-0 list-none grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {CONFIANCE.map(({ icone: Icone, titre, texte }) => (
              <li key={titre}>
                <Icone size={26} className="text-marque-vert" aria-hidden />
                <h3 className="mt-4 mb-0 text-[17px] font-bold text-ink">
                  {titre}
                </h3>
                <p className="mt-2 mb-0 text-[14.5px] leading-relaxed text-muted">
                  {texte}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Questions */}
      <section
        id="questions"
        className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 lg:py-28 grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
      >
        <div>
          <EnTeteSection surtitre="Questions" titre="Questions fréquentes" />
          <p className="mt-5 mb-0 text-[15.5px] leading-relaxed text-muted inline-flex items-start gap-2.5">
            <Headset
              size={19}
              className="text-marque-rouge shrink-0 mt-0.5"
              aria-hidden
            />
            Une autre question ? Le Support IT répond depuis votre espace.
          </p>
        </div>
        <Questions questions={QUESTIONS} />
      </section>

      <AppelFinal />
    </PageSite>
  );
}
