import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { LienSite } from "@/components/Application";
import { Illustration, type NomIllustration } from "@/components/plateforme/site/Illustration";
import { LogoOfficiel } from "@/components/public/Marque";
import { adresseSitePlateforme } from "@/lib/adresse-chambre";

export function CadreAuth({
  large = false,
  marque,
  pied,
  classe = "",
  illustration,
  couverture,
  accroche,
  sous,
  children,
}: {
  photo?: string;
  alt?: string;
  accroche?: React.ReactNode;
  sous?: string;
  large?: boolean;
  marque?: React.ReactNode;
  pied?: React.ReactNode;
  classe?: string;
  illustration?: NomIllustration;
  couverture?: string | null;
  children: React.ReactNode;
}) {
  const panneau = Boolean(illustration || accroche);
  const logo = marque ?? (
    <LienSite className="inline-block">
      <LogoOfficiel className="text-[19px]" priority />
    </LienSite>
  );
  const mention = pied ?? <>© {new Date().getFullYear()} L’Alliée Virtuelle</>;
  const site = adresseSitePlateforme() ?? "/";

  return (
    <div className={`cadre-auth min-h-dvh bg-white text-ink ${classe}`}>
      <span aria-hidden className="fixed inset-x-0 top-0 z-10 h-[3px]" style={{ background: "var(--marque-degrade)" }} />
      <div className={`min-h-dvh ${panneau ? "lg:grid lg:grid-cols-[minmax(0,52fr)_minmax(0,48fr)]" : ""}`}>
        {panneau ? (
          couverture ? (
            <aside className="sur-couverture hidden lg:flex relative lg:sticky lg:top-0 lg:h-dvh flex-col overflow-hidden bg-marque-nuit text-white">
              <Image src={couverture} alt="" fill priority sizes="52vw" className="object-cover" />
              <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,29,44,0.12)_0%,rgba(15,29,44,0.4)_50%,rgba(15,29,44,0.9)_100%)]" />
              <div className="relative z-10 mt-auto flex flex-col gap-5 px-10 xl:px-14 pb-10 pr-24">
                {accroche ? <h2 className="m-0 max-w-[560px] text-[clamp(28px,2.8vw,40px)] leading-[1.12] text-white">{accroche}</h2> : null}
                {sous ? <p className="m-0 max-w-[480px] text-[16px] leading-[26px] text-white/80">{sous}</p> : null}
                <div className="mt-3 pt-5 border-t border-white/20 text-[13px] leading-[20px] text-white/75">{mention}</div>
              </div>
              <span aria-hidden className="absolute inset-y-0 right-0 z-10 w-14 bg-[var(--fond-connexion,#fff)]" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
            </aside>
          ) : (
            <aside className="panneau-connexion hidden lg:flex relative lg:sticky lg:top-0 lg:h-dvh flex-col bg-[var(--connexion,var(--surface-2))] overflow-hidden">
              <div className="px-10 xl:px-14 pt-9">{logo}</div>
              <div className="flex-1 flex flex-col items-center justify-center gap-8 px-12 xl:px-24 py-6">
                {illustration ? (
                  <Illustration nom={illustration} priorite contenir className="w-full max-w-[540px]" />
                ) : null}
                {accroche ? <h2 className="m-0 max-w-[520px] text-center text-[clamp(26px,2.6vw,36px)] leading-[1.15] text-ink">{accroche}</h2> : null}
                {sous ? <p className="m-0 max-w-[460px] text-center text-[16px] leading-[26px] text-muted">{sous}</p> : null}
              </div>
              <p className="m-0 px-10 xl:px-14 pb-8 pr-24 text-[12.5px] text-faint">{mention}</p>
              <span aria-hidden className="absolute inset-y-0 right-0 w-14 bg-[var(--fond-connexion,#fff)]" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
            </aside>
          )
        ) : null}

        <div className="colonne-connexion flex flex-col min-h-dvh px-5 py-8 sm:px-10 lg:px-14 xl:px-24">
          <div className="mb-10 flex items-center gap-4">
            {couverture ? null : <div className={`min-w-0 ${panneau ? "lg:hidden" : ""}`}>{logo}</div>}
            <a
              href={site}
              className="ml-auto inline-flex shrink-0 items-center gap-2 min-h-[44px] px-4 rounded-full border border-line bg-white text-[14px] font-medium text-ink no-underline transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marque-nuit"
            >
              <ArrowLeft size={16} strokeWidth={1.75} aria-hidden /> Retour au site
            </a>
          </div>
          <main className={`apparition flex-1 flex flex-col justify-center w-full mx-auto ${large ? "max-w-[640px]" : "max-w-[480px]"}`}>
            {couverture ? <div className="mb-8 flex justify-center [&_img]:h-32 [&_img]:max-w-[340px] [&_img]:object-center">{logo}</div> : null}
            {children}
          </main>
          <p className={`m-0 mt-10 text-[12px] text-faint text-center ${panneau ? "lg:hidden" : ""}`}>{mention}</p>
        </div>
      </div>
    </div>
  );
}

export function Alerte({ children }: { children: React.ReactNode }) {
  return (
    <div className="apparition">
      <p
        role="alert"
        className="anim-secousse m-0 mb-5 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-[13.5px] text-accent-strong"
        style={{ animationDelay: "0.35s" }}
      >
        {children}
      </p>
    </div>
  );
}

export function Confirmation({ children }: { children: React.ReactNode }) {
  return (
    <div className="apparition">
      <p
        role="status"
        className="m-0 mb-5 rounded-lg border border-marque-vert/30 bg-marque-vert/10 px-4 py-3 text-[13.5px] text-marque-vert"
      >
        {children}
      </p>
    </div>
  );
}

export {
  ChampAuth,
  ChampMotDePasse,
  Saisie,
} from "@/components/public/ChampsAuth";
export { CHAMP_AUTH } from "@/components/public/style-champs";
