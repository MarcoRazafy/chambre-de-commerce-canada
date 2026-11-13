import type { Metadata } from "next";
import { CreditCard, Headset, ShieldCheck, Users } from "lucide-react";
import { AppelFinal, EnTeteSection, PageSite, Questions } from "@/components/plateforme/site/blocs";
import { CartesTarifs, TableauOffres } from "@/components/plateforme/site/Tarifs";
import { Saillant } from "@/components/ui";
import { offresPubliques } from "@/lib/plateforme-site";

// Lu à chaque visite : les offres de l'Admin GM changent sans redéploiement (et la base n'est pas joignable à la construction)
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Tarifs · L’Alliée Virtuelle" },
  description: "Les offres de L’Alliée Virtuelle : gratuite pour démarrer, tout inclus, ou à la carte avec seulement les fonctions dont votre Chambre a besoin.",
};

const INCLUS = [
  { icone: Users, titre: "Espace membre", texte: "Chaque entreprise membre a son espace : cotisation, factures, événements et réseau" },
  { icone: CreditCard, titre: "Cotisations par carte", texte: "Les membres paient sur une page sécurisée de Stripe, l’argent arrive sur le compte de la Chambre" },
  { icone: Headset, titre: "Support IT", texte: "Écrivez au support depuis votre espace, captures d’écran et vidéos comprises" },
  { icone: ShieldCheck, titre: "Données séparées", texte: "Les membres, paiements et fichiers de votre Chambre ne sont visibles que d’elle" },
];

const QUESTIONS = [
  {
    q: "Comment fonctionne l’offre à la carte ?",
    r: "Vous payez un forfait de base, puis chaque fonction que vous cochez. Le total s’affiche en direct avant la création de votre Chambre.",
  },
  {
    q: "Puis-je ajouter ou retirer des fonctions plus tard ?",
    r: "Oui, depuis la page Abonnement de votre espace. Les menus de votre équipe et de vos membres suivent votre choix, et la facture suivante en tient compte.",
  },
  {
    q: "Comment sont comptés les comptes d’équipe ?",
    r: "Chaque compte actif de votre équipe au-delà de ceux offerts est facturé chaque mois. Les membres ne sont jamais facturés.",
  },
  {
    q: "Les prix comprennent-ils les taxes ?",
    r: "Non. Les prix sont en dollars canadiens, avant taxes ; la TPS et la TVQ s’ajoutent sur la facture.",
  },
  {
    q: "Faut-il une carte bancaire pour commencer ?",
    r: "Non. La carte n’est demandée que pour payer l’abonnement d’une offre payante.",
  },
];

// Tarifs de la plateforme : les offres de l'Admin GM, l'offre à la carte, le tableau comparatif
export default async function TarifsPlateforme() {
  const offres = await offresPubliques();

  return (
    <PageSite>
      <section className="border-b border-line">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-20 lg:pb-24">
          <div className="entree">
            <EnTeteSection
              niveau={1}
              centre
              surtitre="Tarifs"
              titre={<>Choisissez votre offre, <Saillant>ou composez-la</Saillant></>}
              texte="Commencez gratuitement, prenez tout, ou gardez seulement les fonctions dont votre Chambre a besoin."
            />
          </div>
          <div className="entree entree-2 mt-12">
            <h2 className="sr-only">Les offres</h2>
            <CartesTarifs offres={offres} />
          </div>
        </div>
      </section>

      <section className="bg-surface border-b border-line">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-16 lg:py-20">
          <h2 className="m-0 text-center text-[clamp(24px,3vw,32px)] leading-[1.15] text-ink">Toutes les offres <Saillant ton="vert">incluent</Saillant></h2>
          <ul data-reveal-groupe="" className="mt-10 m-0 p-0 list-none grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {INCLUS.map(({ icone: Icone, titre, texte }) => (
              <li key={titre} className="tuile-hote">
                <span className="tuile tuile-sm tuile-bleue">
                  <Icone size={20} aria-hidden />
                </span>
                <h3 className="mt-5 mb-0 text-[16px] text-ink">{titre}</h3>
                <p className="mt-2 mb-0 text-[14px] leading-[22px] text-muted">{texte}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="comparer" className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 lg:py-28">
        <EnTeteSection centre surtitre="Comparer" titre={<>Les offres, <Saillant>fonction par fonction</Saillant></>} />
        <div data-reveal="" className="mt-12 max-w-[1040px] mx-auto">
          <TableauOffres offres={offres} />
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-5 sm:px-8 pb-20 lg:pb-28 grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <EnTeteSection titre={<>Questions <Saillant>sur les tarifs</Saillant></>} />
        <Questions questions={QUESTIONS} />
      </section>

      <AppelFinal />
    </PageSite>
  );
}
