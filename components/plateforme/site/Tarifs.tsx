// Tarifs du site : les offres de l'Admin GM en cartes (l'offre à la carte ouvre une fenêtre de choix), le tableau comparatif
import type { ReactNode } from "react";
import Link from "next/link";
import { Check, Minus, Plus } from "lucide-react";
import { FOCUS } from "@/components/plateforme/site/blocs";
import { BoutonComposer } from "@/components/plateforme/site/FenetreComposeur";
import { FONCTIONS } from "@/lib/fonctions-plateforme";
import { fmtDollars } from "@/lib/plateforme";
import type { OffrePublique } from "@/lib/plateforme-site";

export const TOUJOURS_INCLUS = ["Membres, contacts et factures", "Espace membre", "Cotisations payées par carte", "Support IT"];
const DEPART = ["evenements", "newsletter"];

// Ce qui distingue une offre, en deux mots
const etiquette = (o: OffrePublique) =>
  o.surMesure ? "À la carte" : o.gratuite ? "Pour démarrer" : o.cles.length === FONCTIONS.length ? "Tout inclus" : "Pour grandir";

const COCHE = <Check size={16} strokeWidth={1.5} className="text-success shrink-0 mt-1" aria-hidden />;

function CarteOffre({ o, miseEnAvant }: { o: OffrePublique; miseEnAvant: boolean }) {
  return (
    <article
      id={o.surMesure ? "sur-mesure" : undefined}
      className={`carte-filet ${o.gratuite ? "filet-vert" : o.surMesure ? "filet-degrade" : "filet-rouge"} flex flex-col rounded-2xl bg-surface p-6 sm:p-8 ${miseEnAvant ? "border-2 border-marque-nuit" : "border border-line"}`}
    >
      <p className="m-0 flex items-baseline justify-between gap-3">
        <span className="text-[18px] font-semibold text-ink">{o.nom}</span>
        <span className="text-[13px] font-medium text-muted whitespace-nowrap">{etiquette(o)}</span>
      </p>
      {o.surMesure ? (
        <>
          <p className="serif mt-5 mb-0 text-[32px] leading-none font-medium text-ink">Selon vos choix</p>
          <p className="mt-3 mb-0 text-[14px] leading-[22px] text-muted">Cochez les fonctions dont votre Chambre a besoin, le prix s’affiche avant la création</p>
        </>
      ) : (
        <p className="mt-5 mb-0 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="serif text-[44px] leading-none font-medium text-ink tabular-nums">{o.prix}</span>
          {o.periode ? <span className="text-[14px] text-muted">par {o.periode}, avant taxes</span> : null}
        </p>
      )}
      {o.detail ? <p className="mt-3 mb-0 text-[14px] leading-[22px] text-muted">{o.detail}</p> : null}
      <ul className="mt-6 m-0 p-0 list-none grid gap-2 content-start">
        {[...TOUJOURS_INCLUS.slice(0, 2), ...(o.surMesure ? [] : o.fonctions)].map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[14px] leading-6 text-ink">
            {COCHE} {f}
          </li>
        ))}
      </ul>
      {o.surMesure ? (
        <>
          <p className="mt-5 mb-2 text-[13px] font-medium text-muted">Au choix</p>
          <ul className="m-0 p-0 list-none grid gap-2 flex-1 content-start">
            {o.options.map((x) => (
              <li key={x.cle} className="flex items-start gap-2.5 text-[14px] leading-6 text-ink">
                <Plus size={16} strokeWidth={1.5} className="text-muted shrink-0 mt-1" aria-hidden /> {x.libelle}
              </li>
            ))}
          </ul>
          <BoutonComposer
            offre={{ id: o.id, nom: o.nom, base: o.base, parUtilisateur: o.parUtilisateur, offerts: o.offerts, options: o.options }}
            initiales={DEPART}
          />
        </>
      ) : (
        <>
          <span className="flex-1" />
          <Link href={`/creer-une-chambre?offre=${encodeURIComponent(o.id)}`} className={`mt-8 w-full ${miseEnAvant ? "btn-action" : "btn-contour"} ${FOCUS}`}>
            Choisir {o.nom}
          </Link>
        </>
      )}
    </article>
  );
}

// Les offres en cartes, côte à côte ; l'offre à la carte ouvre sa fenêtre de choix
export function CartesTarifs({ offres }: { offres: OffrePublique[] }) {
  const cartes = offres.filter((o) => !o.surMesure || o.options.length);
  const n = cartes.length;
  return (
    <div className={`mx-auto grid gap-4 ${n >= 3 ? "max-w-[1200px] md:grid-cols-2 lg:grid-cols-3" : n === 2 ? "max-w-[920px] md:grid-cols-2" : "max-w-[500px]"}`}>
      {cartes.map((o, i) => (
        <div key={o.id} className={`grid ${n === 3 && i === 2 ? "md:col-span-2 lg:col-span-1" : ""}`}>
          <CarteOffre o={o} miseEnAvant={!o.gratuite && !o.surMesure} />
        </div>
      ))}
    </div>
  );
}

// --- Tableau comparatif ---

const Oui = () => (
  <span className="inline-grid place-items-center text-success">
    <Check size={16} strokeWidth={1.5} aria-hidden /><span className="sr-only">Inclus</span>
  </span>
);
const Non = () => (
  <span className="inline-grid place-items-center text-faint">
    <Minus size={16} strokeWidth={1.5} aria-hidden /><span className="sr-only">Non inclus</span>
  </span>
);

type Groupe = { titre: string; lignes: { libelle: string; valeurs: ReactNode[] }[] };

export function TableauOffres({ offres }: { offres: OffrePublique[] }) {
  const groupes: Groupe[] = [
    {
      titre: "Prix",
      lignes: [
        { libelle: "Par mois, avant taxes", valeurs: offres.map((o) => (o.gratuite ? "Gratuit" : o.surMesure ? "Selon vos choix" : fmtDollars(o.base))) },
        { libelle: "Compte d’équipe en plus", valeurs: offres.map((o) => (o.parUtilisateur > 0 ? `${fmtDollars(o.parUtilisateur)} / mois` : <Non key="n" />)) },
      ],
    },
    {
      titre: "Limites",
      lignes: [
        { libelle: "Membres", valeurs: offres.map((o) => (o.maxMembres != null ? `Jusqu’à ${o.maxMembres}` : "Illimités")) },
        { libelle: "Comptes d’équipe", valeurs: offres.map((o) => (o.maxUtilisateurs != null ? `${o.maxUtilisateurs} au plus` : "Sans limite")) },
        { libelle: "Comptes d’équipe offerts", valeurs: offres.map((o) => String(o.offerts)) },
      ],
    },
    { titre: "Toujours inclus", lignes: TOUJOURS_INCLUS.map((l) => ({ libelle: l, valeurs: offres.map((o) => <Oui key={o.id} />) })) },
    {
      titre: "Fonctions",
      lignes: FONCTIONS.map((f) => ({
        libelle: f.libelle,
        valeurs: offres.map((o) => {
          if (!o.cles.includes(f.cle)) return <Non key={o.id} />;
          if (!o.surMesure) return <Oui key={o.id} />;
          return <span key={o.id} className="text-[13px] font-medium text-ink">Au choix</span>;
        }),
      })),
    },
  ];

  return (
    <div className="relative overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[620px] border-collapse text-[14px]">
        <caption className="sr-only">Comparaison des offres</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-surface text-left px-5 py-5 w-[34%]"><span className="sr-only">Offre</span></th>
            {offres.map((o) => (
              <th key={o.id} scope="col" className="px-4 py-5 text-center align-bottom">
                <span className="block text-[16px] font-semibold text-ink">{o.nom}</span>
                <span className="block mt-1 text-[13px] font-normal text-muted">{etiquette(o)}</span>
              </th>
            ))}
          </tr>
        </thead>
        {groupes.map((g) => (
          <tbody key={g.titre}>
            <tr>
              <th scope="colgroup" colSpan={offres.length + 1} className="sticky left-0 bg-surface-2 text-left px-5 py-2 text-[13px] font-medium text-muted border-y border-line">
                {g.titre}
              </th>
            </tr>
            {g.lignes.map((l) => (
              <tr key={l.libelle} className="border-b border-line last:border-b-0">
                <th scope="row" className="sticky left-0 z-10 bg-surface text-left px-5 py-3 font-normal text-ink">{l.libelle}</th>
                {l.valeurs.map((v, i) => (
                  <td key={offres[i].id} className="px-4 py-3 text-center text-ink tabular-nums">{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
