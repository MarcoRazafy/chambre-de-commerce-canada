import { LienSite } from "@/components/Application";
import { Illustration, type NomIllustration } from "@/components/plateforme/site/Illustration";
import { LogoOfficiel } from "@/components/public/Marque";

// Cadre des pages d'authentification (connexion, adhésion, mot de passe, Admin GM, site de la plateforme) :
// sur grand écran, l'illustration et ses ornements animés à gauche (avec le logo en haut et la mention en bas, le
// bord en biais), le formulaire posé à nu à droite ; sur téléphone, le logo, le formulaire, la mention.
// marque, pied : à la place du logo et de la mention de la Chambre (Admin GM, site : la plateforme) ;
// classe : sur le cadre (« espace-admin », « site-plateforme » : leurs couleurs et leurs titres).
// photo, alt : gardés pour les pages qui les passent encore ; ils ne s'affichent plus.
export function CadreAuth({
  large = false,
  marque,
  pied,
  classe = "",
  illustration,
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
  children: React.ReactNode;
}) {
  const panneau = Boolean(illustration || accroche);
  const logo = marque ?? (
    <LienSite className="inline-block">
      <LogoOfficiel className="w-[170px] h-auto" priority />
    </LienSite>
  );
  const mention = pied ?? <>© {new Date().getFullYear()} CanCham · Chambre de Commerce et de Coopération Canada–Madagascar</>;

  return (
    <div className={`cadre-auth min-h-dvh bg-white text-ink ${classe}`}>
      <span aria-hidden className="fixed inset-x-0 top-0 z-10 h-[3px]" style={{ background: "var(--marque-degrade)" }} />
      <div className={`min-h-dvh ${panneau ? "lg:grid lg:grid-cols-[minmax(0,52fr)_minmax(0,48fr)]" : ""}`}>
        {panneau ? (
          <aside className="hidden lg:flex relative lg:sticky lg:top-0 lg:h-dvh flex-col bg-surface-2 overflow-hidden">
            <div className="px-10 xl:px-14 pt-9">{logo}</div>
            <div className="flex-1 flex flex-col items-center justify-center gap-8 px-12 xl:px-24 py-6">
              {illustration ? <Illustration nom={illustration} priorite contenir className="w-full max-w-[540px]" /> : null}
              {accroche ? <h2 className="m-0 max-w-[520px] text-center text-[clamp(26px,2.6vw,36px)] leading-[1.15] text-ink">{accroche}</h2> : null}
              {sous ? <p className="m-0 max-w-[460px] text-center text-[16px] leading-[26px] text-muted">{sous}</p> : null}
            </div>
            <p className="m-0 px-10 xl:px-14 pb-8 pr-24 text-[12.5px] text-faint">{mention}</p>
            {/* Le bord en biais, du haut à droite vers le bas */}
            <span aria-hidden className="absolute inset-y-0 right-0 w-14 bg-white" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
          </aside>
        ) : null}

        <div className="flex flex-col min-h-dvh px-5 py-8 sm:px-10 lg:px-14 xl:px-24">
          <div className={`mb-10 ${panneau ? "lg:hidden" : ""}`}>{logo}</div>
          <main className={`apparition flex-1 flex flex-col justify-center w-full mx-auto ${large ? "max-w-[640px]" : "max-w-[480px]"}`}>{children}</main>
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
