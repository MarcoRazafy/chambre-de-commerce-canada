import { LienSite } from "@/components/Application";
import { Illustration, type NomIllustration } from "@/components/plateforme/site/Illustration";
import { LogoOfficiel } from "@/components/public/Marque";

// Cadre des pages d'authentification (connexion, adhésion, mot de passe) : le formulaire dans une carte à gauche ;
// sur grand écran, un panneau à droite avec l'illustration, l'accroche et une ligne d'explication.
// marque, pied : à la place du logo et de la mention de la Chambre (connexion de l'Admin GM : la plateforme) ;
// classe : sur le cadre (« espace-admin » : les couleurs et les titres de l'espace GM).
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
  return (
    <div className={`min-h-dvh flex flex-col bg-[#fbfcfe] ${classe}`}>
      <div className={`flex-1 grid ${panneau ? "lg:grid-cols-2" : ""}`}>
        <div className="flex flex-col px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
          <main className={`apparition flex-1 flex flex-col justify-center w-full mx-auto ${large ? "max-w-[660px]" : "max-w-[520px]"}`}>
            <div className="carte-filet filet-fixe filet-degrade rounded-2xl border border-line bg-surface shadow-[0_8px_24px_rgba(15,29,44,0.06)] px-6 py-8 sm:px-10 sm:py-10">
              {marque ?? (
                <LienSite className="block mb-6">
                  <LogoOfficiel className="w-[178px] h-auto" priority />
                </LienSite>
              )}
              {children}
            </div>
          </main>
          <p className="text-[12px] text-faint text-center m-0 mt-8">
            {pied ?? (
              <>
                © {new Date().getFullYear()} CanCham · Chambre de Commerce et de Coopération Canada–Madagascar
              </>
            )}
          </p>
        </div>

        {panneau ? (
          <aside className="hidden lg:flex lg:sticky lg:top-0 lg:h-dvh flex-col items-center justify-center gap-8 px-12 xl:px-20 py-12 bg-surface-2 border-l border-line overflow-hidden">
            {illustration ? <Illustration nom={illustration} priorite contenir className="w-full max-w-[460px]" /> : null}
            {accroche ? <h2 className="m-0 max-w-[520px] text-center text-[clamp(26px,2.6vw,36px)] leading-[1.15] text-ink">{accroche}</h2> : null}
            {sous ? <p className="m-0 max-w-[460px] text-center text-[16px] leading-[26px] text-muted">{sous}</p> : null}
          </aside>
        ) : null}
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
