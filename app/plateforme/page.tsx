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
import { ApercuEspace } from "@/components/plateforme/site/ApercuEspace";
import { EnTeteSite } from "@/components/plateforme/site/EnTeteSite";
import { PiedSite } from "@/components/plateforme/site/PiedSite";
import { offresPubliques } from "@/lib/plateforme-site";

export const metadata: Metadata = {
  title: { absolute: "L’Alliée Virtuelle · La plateforme des Chambres de commerce" },
  description:
    "Adhésions, cotisations payées par carte, événements, mises en relation et communication : l’espace de gestion des Chambres de commerce et des associations d’affaires, avec un espace pour leurs membres.",
};

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marque-nuit";

const FONCTIONS = [
  { icone: Users, titre: "Membres et adhésions", texte: "Fiches des entreprises, formules d’adhésion, demandes à valider, statut à jour ou en retard." },
  { icone: CreditCard, titre: "Cotisations et factures", texte: "Factures, relances et paiement par carte, encaissé directement sur le compte Stripe de la Chambre." },
  { icone: CalendarDays, titre: "Événements", texte: "Programme, inscriptions, billets, présences et agenda partagé avec les membres." },
  { icone: Network, titre: "Maillage", texte: "Mises en relation entre membres selon ce qu’ils cherchent et ce qu’ils proposent." },
  { icone: CalendarClock, titre: "Rendez-vous", texte: "Les membres réservent en ligne un créneau avec l’équipe de la Chambre." },
  { icone: Tag, titre: "Offres et promotions", texte: "Les avantages que les membres proposent au reste du réseau." },
  { icone: FolderOpen, titre: "Ressources et services", texte: "Documents, vidéos et services réservés aux membres." },
  { icone: Mail, titre: "Newsletter et messagerie", texte: "Lettres d’information, messages entre membres et avec l’équipe." },
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
  { titre: "Créez votre Chambre", texte: "Son nom, l’adresse de son espace et votre offre : l’espace est prêt tout de suite, sans carte bancaire." },
  { titre: "Réglez-la à votre image", texte: "Logo, coordonnées, formules d’adhésion, paiement par carte avec Stripe et expéditeur des courriels." },
  { titre: "Accueillez vos membres", texte: "Ils s’inscrivent à l’adresse de votre Chambre, règlent leur cotisation et retrouvent tout dans leur espace." },
];

const CONFIANCE = [
  { icone: ShieldCheck, titre: "Données séparées", texte: "Chaque Chambre a son espace : ses membres, ses paiements et ses fichiers ne sont visibles que d’elle." },
  { icone: CreditCard, titre: "Paiements par Stripe", texte: "Les cotisations arrivent sur le compte Stripe de la Chambre ; aucun numéro de carte n’est conservé." },
  { icone: Globe, titre: "Votre adresse", texte: "Un espace à l’adresse de votre Chambre, qui peut aussi répondre à votre propre domaine." },
  { icone: LockKeyhole, titre: "Vous gardez la main", texte: "Le support n’entre dans votre espace que si vous l’autorisez, pour la durée que vous choisissez." },
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
    q: "Puis-je changer d’offre plus tard ?",
    r: "Oui. Vous passez à l’offre payante depuis la page Abonnement de votre espace, sans perdre vos données.",
  },
  {
    q: "Qui contacter en cas de problème ?",
    r: "Le Support IT, depuis la bulle de votre espace : vous pouvez y joindre des captures d’écran ou des vidéos.",
  },
];

function EnTeteSection({ surtitre, titre, texte, centre = false }: { surtitre: string; titre: string; texte?: string; centre?: boolean }) {
  return (
    <div className={`max-w-[680px] ${centre ? "mx-auto text-center" : ""}`}>
      <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-marque-rouge">{surtitre}</span>
      <h2 className="mt-3 mb-0 text-[clamp(28px,3.6vw,40px)] leading-[1.12] font-extrabold text-ink">{titre}</h2>
      {texte ? <p className="mt-4 mb-0 text-[17px] leading-relaxed text-muted">{texte}</p> : null}
    </div>
  );
}

// Site public de la plateforme : présentation, fonctions, fonctionnement, tarifs (offres de l'Admin GM), questions
export default async function AccueilPlateforme() {
  const offres = await offresPubliques();

  return (
    <div className="site-plateforme min-h-dvh bg-white text-ink">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg">
        Aller au contenu
      </a>
      <EnTeteSite />

      <main id="contenu">
        {/* Accroche */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="absolute inset-0 site-grille" />
          <div aria-hidden className="absolute -top-40 -left-32 w-[560px] h-[560px] rounded-full blur-3xl opacity-60" style={{ background: "radial-gradient(circle, rgb(173 7 7 / 0.16), transparent 70%)" }} />
          <div aria-hidden className="absolute -bottom-48 -right-32 w-[620px] h-[620px] rounded-full blur-3xl opacity-60" style={{ background: "radial-gradient(circle, rgb(0 113 64 / 0.16), transparent 70%)" }} />

          <div className="relative max-w-[1200px] mx-auto px-5 sm:px-8 pt-14 pb-20 sm:pt-20 lg:pt-24 lg:pb-28 grid gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-center">
            <div>
              <span className="entree inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3.5 py-1.5 text-[13px] font-semibold text-muted">
                <span aria-hidden className="size-2 rounded-full bg-marque-vert" />
                Pour les Chambres de commerce et les associations d’affaires
              </span>
              <h1 className="entree entree-2 mt-6 mb-0 text-[clamp(36px,5.4vw,60px)] leading-[1.04] font-extrabold tracking-[-0.035em] text-ink">
                Votre Chambre, ses membres et leurs cotisations,{" "}
                <span className="texte-degrade">au même endroit.</span>
              </h1>
              <p className="entree entree-3 mt-6 mb-0 max-w-[560px] text-[18px] leading-relaxed text-muted">
                Adhésions, paiements par carte, événements, mises en relation et communication : votre équipe pilote tout depuis un espace à votre nom, et vos membres ont le leur.
              </p>
              <div className="entree entree-4 mt-9 flex flex-wrap items-center gap-3">
                <Link href="/creer-une-chambre" className={`btn-action ${FOCUS}`}>
                  Créer ma Chambre <ArrowRight size={17} aria-hidden />
                </Link>
                <Link href="/devenir-membre" className={`btn-contour text-ink bg-white hover:bg-surface-2 ${FOCUS}`}>
                  Devenir membre
                </Link>
              </div>
              <ul className="entree entree-4 mt-8 m-0 p-0 list-none flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-muted">
                {["Sans carte bancaire", "Espace membre inclus", "Paiements sur votre compte Stripe"].map((t) => (
                  <li key={t} className="inline-flex items-center gap-2">
                    <Check size={16} className="text-marque-vert shrink-0" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="entree entree-3 lg:pl-6">
              <ApercuEspace />
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
                <li key={titre} className="group rounded-2xl border border-line bg-white p-6 transition-[border-color,box-shadow,transform] duration-200 hover:border-[#cdd6e1] hover:shadow-[0_18px_40px_-26px_rgba(15,29,44,0.4)] motion-safe:hover:-translate-y-0.5">
                  <span className="grid place-items-center size-11 rounded-xl bg-marque-nuit text-white">
                    <Icone size={20} aria-hidden />
                  </span>
                  <h3 className="mt-5 mb-0 text-[17px] font-bold text-ink">{titre}</h3>
                  <p className="mt-2 mb-0 text-[14.5px] leading-relaxed text-muted">{texte}</p>
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
              <article key={e.titre} className="relative overflow-hidden rounded-2xl border border-line bg-white p-7 sm:p-9">
                <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${e.teinte}`} />
                <h3 className="m-0 text-[22px] font-extrabold text-ink">{e.titre}</h3>
                <p className="mt-1.5 mb-0 text-[14.5px] text-muted">{e.sous}</p>
                <ul className="mt-6 m-0 p-0 list-none grid gap-3">
                  {e.points.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-[15px] text-ink">
                      <span className={`grid place-items-center size-5 rounded-full text-white shrink-0 mt-0.5 ${e.teinte}`}>
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
        <section id="fonctionnement" className="bg-marque-nuit text-white relative overflow-hidden">
          <div aria-hidden className="absolute -top-40 right-0 w-[520px] h-[520px] rounded-full blur-3xl opacity-40" style={{ background: "radial-gradient(circle, rgb(0 113 64 / 0.5), transparent 70%)" }} />
          <div className="relative max-w-[1200px] mx-auto px-5 sm:px-8 py-20 lg:py-28">
            <div className="max-w-[680px]">
              <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#ff8a8a]">Fonctionnement</span>
              <h2 className="mt-3 mb-0 text-[clamp(28px,3.6vw,40px)] leading-[1.12] font-extrabold text-white">Votre espace en ligne en trois étapes</h2>
            </div>
            <ol className="mt-14 m-0 p-0 list-none grid gap-5 md:grid-cols-3">
              {ETAPES.map((e, i) => (
                <li key={e.titre} className="rounded-2xl border border-white/12 bg-white/[0.05] p-7">
                  <span className="grid place-items-center size-11 rounded-full text-[17px] font-extrabold text-white" style={{ background: "var(--marque-degrade)" }}>
                    {i + 1}
                  </span>
                  <h3 className="mt-5 mb-0 text-[19px] font-bold text-white">{e.titre}</h3>
                  <p className="mt-2 mb-0 text-[15px] leading-relaxed text-white/70">{e.texte}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 lg:py-28">
          <EnTeteSection centre surtitre="Tarifs" titre="Une offre pour démarrer, une offre pour grandir" texte="Les membres et l’espace membre sont inclus dans chaque offre." />
          <div className={`mt-14 grid gap-5 mx-auto ${offres.length > 1 ? "md:grid-cols-2 max-w-[920px]" : "max-w-[460px]"}`}>
            {offres.map((o) => {
              const miseEnAvant = !o.gratuite;
              return (
                <article
                  key={o.id}
                  className={`relative flex flex-col rounded-2xl bg-white p-7 sm:p-9 ${
                    miseEnAvant ? "border-2 border-marque-rouge shadow-[0_30px_60px_-34px_rgba(173,7,7,0.45)]" : "border border-line"
                  }`}
                >
                  {miseEnAvant ? (
                    <span className="absolute -top-3.5 left-9 rounded-full bg-marque-rouge px-3 py-1 text-[12px] font-bold uppercase tracking-[0.08em] text-white">Pour grandir</span>
                  ) : null}
                  <h3 className="m-0 text-[20px] font-extrabold text-ink">{o.nom}</h3>
                  <p className="mt-5 mb-0 flex items-baseline gap-2">
                    <span className="text-[44px] leading-none font-extrabold tracking-[-0.03em] text-ink tabular-nums">{o.prix}</span>
                    {o.periode ? <span className="text-[15px] text-muted">par {o.periode}, avant taxes</span> : null}
                  </p>
                  {o.detail ? <p className="mt-3 mb-0 text-[14px] leading-relaxed text-muted">{o.detail}</p> : null}
                  <ul className="mt-7 m-0 p-0 list-none grid gap-2.5 flex-1">
                    {["Membres, contacts et factures", "Espace membre", ...o.fonctions].map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[14.5px] text-ink">
                        <Check size={17} className="text-marque-vert shrink-0 mt-0.5" aria-hidden /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/creer-une-chambre?offre=${encodeURIComponent(o.id)}`}
                    className={`mt-8 w-full ${miseEnAvant ? "btn-action" : "btn-contour text-ink hover:bg-surface-2"} ${FOCUS}`}
                  >
                    Choisir {o.nom}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        {/* Confiance */}
        <section className="bg-[#f6f8fb] border-y border-line">
          <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 lg:py-24">
            <EnTeteSection surtitre="Sécurité" titre="Vos données et vos paiements restent les vôtres" />
            <ul className="mt-12 m-0 p-0 list-none grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {CONFIANCE.map(({ icone: Icone, titre, texte }) => (
                <li key={titre}>
                  <Icone size={26} className="text-marque-vert" aria-hidden />
                  <h3 className="mt-4 mb-0 text-[17px] font-bold text-ink">{titre}</h3>
                  <p className="mt-2 mb-0 text-[14.5px] leading-relaxed text-muted">{texte}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Questions */}
        <section id="questions" className="max-w-[1200px] mx-auto px-5 sm:px-8 py-20 lg:py-28 grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <EnTeteSection surtitre="Questions" titre="Questions fréquentes" />
            <p className="mt-5 mb-0 text-[15.5px] leading-relaxed text-muted inline-flex items-start gap-2.5">
              <Headset size={19} className="text-marque-rouge shrink-0 mt-0.5" aria-hidden />
              Une autre question ? Le Support IT répond depuis votre espace.
            </p>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {QUESTIONS.map(({ q, r }) => (
              <details key={q} className="group">
                <summary className={`flex items-center justify-between gap-6 py-5 cursor-pointer list-none text-[17px] font-bold text-ink [&::-webkit-details-marker]:hidden ${FOCUS}`}>
                  {q}
                  <span aria-hidden className="grid place-items-center size-8 rounded-full border border-line text-muted shrink-0 transition-transform duration-200 group-open:rotate-45">
                    <span className="text-[20px] leading-none">+</span>
                  </span>
                </summary>
                <p className="mt-0 mb-5 pr-12 text-[15.5px] leading-relaxed text-muted">{r}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Appel final */}
        <section className="px-5 sm:px-8 pb-20 lg:pb-28">
          <div className="relative overflow-hidden max-w-[1200px] mx-auto rounded-3xl bg-marque-nuit px-7 py-14 sm:px-14 sm:py-16 text-center">
            <div aria-hidden className="absolute -top-24 -left-20 w-[380px] h-[380px] rounded-full blur-3xl opacity-50" style={{ background: "radial-gradient(circle, rgb(173 7 7 / 0.7), transparent 70%)" }} />
            <div aria-hidden className="absolute -bottom-28 -right-20 w-[420px] h-[420px] rounded-full blur-3xl opacity-50" style={{ background: "radial-gradient(circle, rgb(0 113 64 / 0.7), transparent 70%)" }} />
            <div className="relative">
              <h2 className="m-0 text-[clamp(28px,3.8vw,42px)] leading-[1.1] font-extrabold text-white">Lancez l’espace de votre Chambre</h2>
              <p className="mt-4 mb-0 mx-auto max-w-[520px] text-[17px] leading-relaxed text-white/75">Créez-le maintenant, invitez votre équipe et accueillez vos premiers membres.</p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link href="/creer-une-chambre" className="btn-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  Créer ma Chambre <ArrowRight size={17} aria-hidden />
                </Link>
                <Link href="/devenir-membre" className="btn-contour text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  Devenir membre
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PiedSite />
    </div>
  );
}
