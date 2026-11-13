import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Search } from "lucide-react";
import { LogoChambre } from "@/components/gm/LogoChambre";
import { EnTeteSection, FOCUS, PageSite, Rassurances } from "@/components/plateforme/site/blocs";
import { Illustration } from "@/components/plateforme/site/Illustration";
import { Saillant } from "@/components/ui";
import { chambresPubliques } from "@/lib/plateforme-site";

export const metadata: Metadata = {
  title: { absolute: "Devenir membre · L’Alliée Virtuelle" },
  description: "Choisissez votre Chambre de commerce et déposez votre demande d’adhésion sur son espace.",
};

const ETAPES = [
  { titre: "Choisissez votre Chambre", texte: "Celle dont vous voulez rejoindre le réseau." },
  { titre: "Déposez votre demande", texte: "Votre entreprise, vos coordonnées, la formule souhaitée : quelques minutes sur l’espace de la Chambre." },
  { titre: "Recevez votre accès", texte: "L’équipe examine la demande ; une fois validée, un e-mail vous donne le lien pour créer votre mot de passe." },
];

const FILETS = ["filet-vert", "filet-rouge", "filet-degrade"];

// Les Chambres actives : on choisit la sienne, puis on s'inscrit à son adresse
export default async function DevenirMembre({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const chambres = await chambresPubliques(q);
  const n = chambres.length;

  return (
    <PageSite>
      {/* Accroche : le titre et la recherche à gauche, l'illustration à droite */}
      <section className="border-b border-line">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 pt-12 sm:pt-16 lg:pt-20 pb-14 lg:pb-20 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
          <div className="entree max-w-[640px]">
            <EnTeteSection
              niveau={1}
              surtitre="Pour les entreprises"
              titre={<>Devenir membre d’une <Saillant ton="vert">Chambre</Saillant></>}
              texte="Choisissez votre Chambre et déposez votre demande sur son espace. Une fois validée, vous recevez votre accès."
            />
            <form action="/devenir-membre" role="search" className="entree entree-2 mt-8 w-full max-w-[560px] flex flex-col sm:flex-row gap-2 sm:gap-1 sm:p-1 sm:rounded-[14px] sm:border sm:border-line sm:bg-surface sm:shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
              <label className="relative flex-1 min-w-0">
                <span className="sr-only">Rechercher une Chambre</span>
                <Search size={18} strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-faint pointer-events-none" aria-hidden />
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Nom de la Chambre"
                  className="w-full h-12 rounded-[10px] pl-11 pr-4 text-[16px] outline-none border sm:border-0 bg-surface sm:bg-transparent border-line-champ text-ink placeholder:text-faint focus-visible:ring-2 focus-visible:ring-marque-nuit/30"
                />
              </label>
              <button type="submit" className={`btn-action ${FOCUS}`}>
                Rechercher
              </button>
            </form>
            <div className="entree entree-3 mt-5">
              <Rassurances points={["Demande en quelques minutes", "Validée par l’équipe de la Chambre"]} />
            </div>
          </div>
          <Illustration nom="membres" priorite className="hidden lg:block w-full max-w-[480px] justify-self-end" />
        </div>
      </section>

      {/* Les Chambres */}
      <section className="bg-surface border-b border-line">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-14 lg:py-20">
          <div data-reveal="" className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 className="m-0 text-[clamp(24px,3vw,32px)] leading-[1.15] text-ink">
              {n} Chambre{n > 1 ? "s" : ""}
              {q ? <span className="text-muted font-normal"> pour « {q} »</span> : null}
            </h2>
            {q ? (
              <Link href="/devenir-membre" className={`text-[15px] font-medium text-marque-vert no-underline hover:underline rounded-sm ${FOCUS}`}>
                Toutes les Chambres
              </Link>
            ) : null}
          </div>

          {n ? (
            <ul data-reveal-groupe="" className="mt-8 m-0 p-0 list-none grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {chambres.map((c, i) => {
                const lieu = [c.profil?.ville, c.profil?.pays].filter(Boolean).join(", ");
                return (
                  <li key={c.id} className="grid">
                    <a
                      href={`${c.adresse}/auth/inscription`}
                      className={`group carte-filet ${FILETS[i % FILETS.length]} flex flex-col rounded-2xl border border-line bg-bg p-6 no-underline text-ink ${FOCUS}`}
                    >
                      <LogoChambre nom={c.nom} logo={c.profil?.logo ?? null} taille={56} />
                      <span className="block mt-5 text-[18px] font-semibold leading-snug">{c.nom}</span>
                      {lieu ? <span className="block mt-1 text-[14px] text-muted">{lieu}</span> : null}
                      <span className="mt-6 inline-flex items-center gap-2 text-[15px] font-medium text-marque-vert">
                        Demander une adhésion
                        <ArrowRight size={16} strokeWidth={1.5} aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5" />
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div data-reveal="" className="mt-8 rounded-2xl border border-dashed border-line-champ px-6 py-12 text-center">
              <span className="mx-auto grid place-items-center size-12 rounded-full bg-surface-2 text-muted">
                <Building2 size={22} strokeWidth={1.5} aria-hidden />
              </span>
              <p className="mt-4 mb-0 text-[16px] text-ink">Aucune Chambre ne correspond à « {q} ».</p>
              <p className="mt-2 mb-0 text-[15px] text-muted">
                <Link href="/devenir-membre" className={`text-marque-vert font-medium no-underline hover:underline rounded-sm ${FOCUS}`}>
                  Voir toutes les Chambres
                </Link>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Les trois étapes */}
      <section className="max-w-[1200px] mx-auto px-5 sm:px-8 py-14 lg:py-20">
        <EnTeteSection surtitre="Comment ça marche" titre={<>Trois étapes, <Saillant>une fois</Saillant></>} />
        <ol data-reveal-groupe="" className="mt-10 m-0 p-0 list-none grid gap-4 md:grid-cols-3">
          {ETAPES.map((e, i) => (
            <li key={e.titre} className={`carte-filet ${FILETS[i]} rounded-2xl border border-line bg-surface p-6`}>
              <span className="tabular-nums text-[13px] font-medium text-faint">{i + 1}</span>
              <h3 className="mt-4 mb-0 text-[18px] text-ink">{e.titre}</h3>
              <p className="mt-2 mb-0 text-[15px] leading-6 text-muted">{e.texte}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Pour les Chambres */}
      <section className="px-5 sm:px-8 pb-20 lg:pb-28">
        <div data-reveal="" className="sur-sombre max-w-[1200px] mx-auto rounded-[20px] bg-marque-nuit px-6 py-10 sm:px-12 flex flex-col sm:flex-row sm:items-center gap-6 text-white">
          <div className="flex-1">
            <h2 className="m-0 text-[clamp(22px,2.6vw,28px)] leading-[1.15]">Vous gérez une <span className="texte-degrade">Chambre</span> ?</h2>
            <p className="mt-2 mb-0 text-[15px] leading-6 text-white/70">Ouvrez son espace et accueillez vos membres ici.</p>
          </div>
          <Link href="/creer-une-chambre" className="btn-contour shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Créer ma Chambre
          </Link>
        </div>
      </section>
    </PageSite>
  );
}
