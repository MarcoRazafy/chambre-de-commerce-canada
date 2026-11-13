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
import { AppelFinal, EnTeteSection, FOCUS, FormulaireEmail, IconePastel, PageSite, Questions, Rassurances } from "@/components/plateforme/site/blocs";
import { Saillant } from "@/components/ui";
import { Carrousel } from "@/components/plateforme/site/Carrousel";
import { Illustration } from "@/components/plateforme/site/Illustration";
import { CartesTarifs } from "@/components/plateforme/site/Tarifs";
import { VisiteEspace } from "@/components/plateforme/site/VisiteEspace";
import { offresPubliques } from "@/lib/plateforme-site";

export const metadata: Metadata = {
  title: { absolute: "L’Alliée Virtuelle · La plateforme des Chambres de commerce" },
  description:
    "Adhésions, cotisations payées par carte, événements et réseau : l’espace de gestion des Chambres de commerce et des associations d’affaires, avec un espace pour leurs membres.",
};

const FONCTIONS = [
  { icone: Users, titre: "Membres et adhésions", texte: "Fiches des entreprises, formules, demandes à valider, statut à jour ou en retard" },
  { icone: CreditCard, titre: "Cotisations et factures", texte: "Factures, relances et paiement par carte, encaissé sur le compte Stripe de la Chambre" },
  { icone: CalendarDays, titre: "Événements", texte: "Programme, inscriptions, billets, présences et agenda partagé avec les membres" },
  { icone: Network, titre: "Maillage", texte: "Mises en relation entre membres, selon ce qu’ils cherchent et ce qu’ils proposent" },
  { icone: CalendarClock, titre: "Rendez-vous", texte: "Les membres réservent un créneau avec l’équipe de la Chambre" },
  { icone: Tag, titre: "Offres et promotions", texte: "Les avantages que les membres proposent au reste du réseau" },
  { icone: FolderOpen, titre: "Ressources et services", texte: "Documents, vidéos et services réservés aux membres" },
  { icone: Mail, titre: "Newsletter et messagerie", texte: "Lettres d’information, messages entre membres et avec l’équipe" },
];

// Les deux encres de la plateforme : le rouge pour l'équipe, le vert pour les membres
const ESPACES = [
  {
    titre: "L’espace de l’équipe",
    encre: "bg-marque-rouge",
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
    encre: "bg-marque-vert",
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
  { titre: "Créez votre Chambre", texte: "Donnez-lui un nom et une adresse, puis choisissez votre offre." },
  { titre: "Configurez-la", texte: "Ajoutez votre logo, vos coordonnées et vos formules d’adhésion, branchez le paiement par carte et choisissez l’expéditeur des courriels." },
  { titre: "Accueillez vos membres", texte: "Ils s’inscrivent à l’adresse de votre Chambre et paient leur cotisation en ligne." },
];

const CONFIANCE = [
  { icone: ShieldCheck, titre: "Données séparées", texte: "Les membres, les paiements et les fichiers d’une Chambre ne sont visibles que par elle." },
  { icone: CreditCard, titre: "Paiements par Stripe", texte: "Les cotisations arrivent sur le compte Stripe de la Chambre. La plateforme ne garde aucun numéro de carte." },
  { icone: Globe, titre: "Votre adresse", texte: "L’espace a sa propre adresse et peut aussi fonctionner sur votre nom de domaine." },
  { icone: LockKeyhole, titre: "Le support, sur autorisation", texte: "Il n’entre dans votre espace que si vous l’autorisez, et pour la durée que vous choisissez." },
];

// Les tuiles de la sécurité : vert, rouge, bleu nuit, puis le dégradé de la marque
const TONS_CONFIANCE = ["tuile-verte", "tuile-rouge", "tuile-bleue", "tuile-degrade"];

const QUESTIONS = [
  {
    q: "Faut-il une carte bancaire pour commencer ?",
    r: "Non. Vous créez votre Chambre et choisissez votre offre ; la carte ne sert qu’au paiement de l’abonnement d’une offre payante.",
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
    r: "Oui. Depuis la page Abonnement de votre espace, cochez ou décochez des fonctions de l’offre à la carte ; la facture suivante en tient compte et vos données sont gardées.",
  },
  {
    q: "Qui contacter en cas de problème ?",
    r: "Le Support IT, depuis la bulle de votre espace. Vous pouvez y joindre des captures d’écran ou des vidéos.",
  },
];

// Site public de la plateforme : présentation, fonctions, fonctionnement, tarifs (offres de l'Admin GM), questions
export default async function AccueilPlateforme() {
  const offres = await offresPubliques();

  return (
    <PageSite enteteTransparent>
      {/* Accroche : le texte à gauche, l'aperçu du vrai produit en pleine largeur dessous, sur un fond dégradé */}
      <section className="accroche-site sur-sombre text-white -mt-16 pt-16">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 pt-12 sm:pt-16 lg:pt-20 pb-16 lg:pb-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
          <div className="max-w-[640px]">
            <p className="entree m-0 text-[15px] text-white/70">Pour les Chambres de commerce et les associations d’affaires</p>
            <h1 className="entree entree-2 mt-4 mb-0 text-[length:clamp(38px,5.2vw,64px)] leading-[1.04] text-white">
              Gérez votre Chambre en ligne, <span className="texte-degrade">avec un espace pour chaque membre</span>
            </h1>
            <p className="entree entree-3 mt-6 mb-0 max-w-[36rem] text-[18px] leading-[28px] text-white/75">
              Votre équipe suit les adhésions, les cotisations payées par carte et les événements depuis un espace à l’adresse de la Chambre.
            </p>
            <div className="entree entree-4 mt-8">
              <FormulaireEmail sombre />
            </div>
            <div className="entree entree-4 mt-5">
              <Rassurances sombre points={["Offre gratuite, sans carte bancaire", "Fonctions au choix"]} />
            </div>
            <p className="entree entree-4 mt-5 mb-0 text-[14px] text-white/70">
              Vous êtes une entreprise ?{" "}
              <Link href="/devenir-membre" className="font-medium text-white underline underline-offset-4 decoration-white/40 hover:decoration-white rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                Devenir membre d’une Chambre
              </Link>
            </p>
          </div>
          {/* L'aperçu de l'espace, qui flotte lentement */}
          <div className="illustration illustration-visible illustration-flotte w-full max-w-[620px] justify-self-end">
            <VisiteEspace />
          </div>
          </div>
        </div>
      </section>

      {/* Fonctions : un carrousel de cartes */}
      <section id="fonctions" className="bg-surface border-b border-line">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-center">
          <EnTeteSection
            surtitre="Fonctions"
            titre={<>Huit fonctions, <Saillant ton="vert">reliées entre elles</Saillant></>}
            texte="Une demande d’adhésion validée crée la fiche du membre ; sa cotisation devient une facture qu’il paie par carte."
          />
            <Illustration nom="evenements" className="hidden lg:block w-full max-w-[340px] justify-self-end" />
          </div>
          {/* Les huit fonctions en carrousel : carré pastel, titre, texte */}
          <div className="mt-12">
            <Carrousel
              etiquette="Fonctions"
              elements={FONCTIONS.map(({ icone: Icone, titre, texte }, i) => (
                <div key={titre} className="tuile-hote">
                  <IconePastel icone={Icone} teinte={i} grande />
                  <h3 className="mt-5 mb-0 text-[18px] text-ink">{titre}</h3>
                  <p className="mt-2 mb-0 text-[15px] leading-6 text-muted">{texte}</p>
                </div>
              ))}
            />
          </div>
        </div>
      </section>

      {/* Deux espaces */}
      <section className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-center">
        <EnTeteSection
          surtitre="Deux espaces"
          titre={<>Un espace pour <Saillant>l’équipe</Saillant>, un autre pour <Saillant ton="vert">les membres</Saillant></>}
        />
          <Illustration nom="reseau" className="hidden lg:block w-full max-w-[340px] justify-self-end" />
        </div>
        <div data-reveal-groupe="" className="mt-12 grid gap-4 lg:grid-cols-2">
          {ESPACES.map((e) => (
            <article key={e.titre} className={`carte-filet ${e.encre === "bg-marque-rouge" ? "filet-rouge" : "filet-vert"} rounded-2xl border border-line bg-surface p-6 sm:p-8`}>
              <h3 className="m-0 flex items-center gap-2.5 text-[20px] font-semibold text-ink">
                <span aria-hidden className={`size-2.5 rounded-[3px] shrink-0 ${e.encre}`} />
                {e.titre}
              </h3>
              <ul className="mt-5 m-0 p-0 list-none grid gap-2">
                {e.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-[15px] leading-6 text-ink">
                    <Check size={16} strokeWidth={2} className="text-success shrink-0 mt-1" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Fonctionnement */}
      <section id="fonctionnement" className="sur-sombre bg-marque-nuit text-white">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 lg:py-28">
          <div data-reveal="" className="max-w-[680px]">
            <p className="m-0 text-[15px] font-medium text-[#ff8a8a]">Fonctionnement</p>
            <h2 className="mt-3 mb-0 text-[clamp(28px,3.4vw,40px)] leading-[1.1] text-white">De la création aux <span className="texte-degrade">premiers membres</span></h2>
          </div>
          <ol data-reveal-groupe="" className="mt-12 m-0 p-0 list-none grid gap-4 md:grid-cols-3">
            {ETAPES.map((e, i) => (
              <li key={e.titre} className="carte-filet filet-degrade rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <span className="mono text-[13px] text-white/60">{i + 1}</span>
                <h3 className="mt-4 mb-0 text-[18px] font-semibold text-white">{e.titre}</h3>
                <p className="mt-2 mb-0 text-[15px] leading-6 text-white/70">{e.texte}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Tarifs */}
      <section id="tarifs" className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 lg:py-28">
        <EnTeteSection
          centre
          surtitre="Tarifs"
          titre={<>Choisissez votre offre, <Saillant>ou composez-la</Saillant></>}
          texte="Les membres et leur espace sont inclus dans chaque offre. À la carte, vous ne payez que les fonctions dont votre Chambre a besoin."
        />
        <div className="mt-12">
          <CartesTarifs offres={offres} revele />
        </div>
        <p data-reveal="" className="mt-8 mb-0 text-center">
          <Link href="/tarifs" className={`group inline-flex items-center gap-2 min-h-[44px] px-2 text-[15px] font-medium text-ink no-underline hover:text-accent-strong rounded-md ${FOCUS}`}>
            Comparer les offres en détail <ArrowRight size={16} strokeWidth={1.5} aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </p>
      </section>

      {/* Confiance */}
      <section className="bg-surface border-y border-line">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-center">
          <EnTeteSection surtitre="Sécurité" titre={<>Qui voit vos données, <Saillant ton="vert">et où va l’argent</Saillant></>} />
            <Illustration nom="paiement" className="hidden lg:block w-full max-w-[340px] justify-self-end" />
          </div>
          <ul data-reveal-groupe="" className="mt-12 m-0 p-0 list-none grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {CONFIANCE.map(({ icone: Icone, titre, texte }, i) => (
              <li key={titre} className="tuile-hote">
                <span className={`tuile tuile-sm ${TONS_CONFIANCE[i % TONS_CONFIANCE.length]}`}>
                  <Icone size={20} aria-hidden />
                </span>
                <h3 className="mt-5 mb-0 text-[16px] text-ink">{titre}</h3>
                <p className="mt-2 mb-0 text-[14px] leading-[22px] text-muted">{texte}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Questions */}
      <section id="questions" className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 lg:py-28 grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <EnTeteSection titre={<>Questions <Saillant>fréquentes</Saillant></>} />
          <p className="mt-5 mb-0 text-[15px] leading-6 text-muted inline-flex items-start gap-2.5">
            <Headset size={18} strokeWidth={1.5} className="shrink-0 mt-0.5" aria-hidden />
            <span>
              Une autre question ?{" "}
              <Link href="/contact" className={`font-medium text-ink underline underline-offset-4 decoration-line-champ hover:decoration-ink rounded-sm ${FOCUS}`}>
                Écrivez-nous
              </Link>
            </span>
          </p>
          <Illustration nom="questions" className="hidden lg:block mt-10 w-full max-w-[360px]" />
        </div>
        <Questions questions={QUESTIONS} />
      </section>

      <AppelFinal />
    </PageSite>
  );
}
