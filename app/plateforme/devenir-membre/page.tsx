import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, LockKeyhole } from "lucide-react";
import { EnTeteSection, PageSite } from "@/components/plateforme/site/blocs";
import { ChoixChambre } from "@/components/plateforme/site/ChoixChambre";
import { Illustration } from "@/components/plateforme/site/Illustration";
import { Saillant } from "@/components/ui";
import { chambresPubliques } from "@/lib/plateforme-site";

export const metadata: Metadata = {
  title: { absolute: "Devenir membre · L’Alliée Virtuelle" },
  description: "Choisissez votre Chambre de commerce et déposez votre demande d’adhésion sur son espace.",
};

const CONFIANCE = [
  { icone: CreditCard, ton: "tuile-verte", titre: "Cotisation payable par carte", texte: "Sur une page sécurisée de Stripe. Aucun numéro de carte n’est conservé." },
  { icone: LockKeyhole, ton: "tuile-degrade", titre: "Vos données restent à votre Chambre", texte: "Votre fiche, vos factures et vos inscriptions ne sont visibles que par elle." },
];

const ETAPES = [
  { titre: "Choisissez votre Chambre", texte: "Celle dont vous voulez rejoindre le réseau." },
  { titre: "Déposez votre demande", texte: "Sur l’espace de la Chambre : votre entreprise, vos coordonnées et la formule souhaitée." },
  { titre: "Recevez votre accès", texte: "L’équipe examine la demande ; une fois validée, un e-mail vous donne le lien pour créer votre mot de passe." },
];

const FILETS = ["filet-vert", "filet-rouge", "filet-degrade"];

// Les Chambres actives : on choisit la sienne (la recherche filtre pendant la saisie), puis on dépose sa demande sur
// l'espace des membres, pour cette Chambre
export default async function DevenirMembre({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const chambres = (await chambresPubliques("")).filter((c): c is typeof c & { adresse: string } => !!c.adresse);

  return (
    <PageSite>
      <ChoixChambre
        chambres={chambres}
        initiale={q}
        avant={
          <EnTeteSection
            niveau={1}
            surtitre="Pour les entreprises"
            titre={<>Devenir membre d’une <Saillant ton="vert">Chambre</Saillant></>}
            texte="Choisissez votre Chambre et déposez votre demande sur son espace. Une fois validée, vous recevez votre accès."
          />
        }
        illustration={<Illustration nom="membres" priorite className="hidden lg:block w-full max-w-[480px] justify-self-end" />}
      />

      {/* Confiance */}
      <section className="max-w-[1200px] mx-auto px-5 sm:px-8 py-14 lg:py-20">
        <ul data-reveal-groupe="" className="m-0 p-0 list-none grid gap-x-8 gap-y-8 md:grid-cols-2 max-w-[880px]">
          {CONFIANCE.map(({ icone: Icone, ton, titre, texte }) => (
            <li key={titre} className="tuile-hote flex gap-4">
              <span className={`tuile tuile-sm ${ton}`}>
                <Icone size={20} aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="m-0 text-[16px] text-ink">{titre}</h3>
                <p className="mt-1 mb-0 text-[14px] leading-[22px] text-muted">{texte}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Les trois étapes */}
      <section className="bg-surface border-y border-line">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-14 lg:py-20">
          <EnTeteSection titre={<>Comment <Saillant>adhérer</Saillant></>} />
          <ol data-reveal-groupe="" className="mt-10 m-0 p-0 list-none grid gap-4 md:grid-cols-3">
            {ETAPES.map((e, i) => (
              <li key={e.titre} className={`carte-filet ${FILETS[i]} rounded-2xl border border-line bg-bg p-6`}>
                <span className="grid place-items-center size-8 rounded-full bg-marque-nuit text-[13px] font-semibold text-white tabular-nums">{i + 1}</span>
                <h3 className="mt-4 mb-0 text-[18px] text-ink">{e.titre}</h3>
                <p className="mt-2 mb-0 text-[15px] leading-6 text-muted">{e.texte}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pour les Chambres */}
      <section className="px-5 sm:px-8 py-14 lg:py-20">
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
