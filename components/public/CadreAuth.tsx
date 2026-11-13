import { LienSite } from "@/components/Application";
import { LogoOfficiel } from "@/components/public/Marque";

// photo, alt, accroche, sous : gardés pour les pages qui les passent encore ; la connexion n'affiche plus de photo.
// marque, pied : à la place du logo et de la mention de la Chambre (connexion de l'Admin GM : la plateforme) ;
// classe : sur le cadre (« espace-admin » : les couleurs et les titres de l'espace GM)
export function CadreAuth({
  large = false,
  marque,
  pied,
  classe = "",
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
  children: React.ReactNode;
}) {
  return (
    <div className={`h-dvh overflow-hidden ${classe}`}>
      <div className="relative h-full overflow-hidden bg-[#fbfcfe]">
        <div aria-hidden className="grille-fine absolute inset-0" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgb(255 255 255 / 0.82) 0%, rgb(255 255 255 / 0.55) 100%)",
          }}
        />
        <div
          aria-hidden
          className="halo-marque absolute -top-32 -left-24 w-[460px] h-[460px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgb(173 7 7 / 0.18), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="halo-marque absolute -bottom-32 -right-24 w-[520px] h-[520px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgb(0 113 64 / 0.18), transparent 70%)",
            animationDelay: "-7s",
          }}
        />

        <div className="relative h-full overflow-y-auto flex flex-col px-4 py-8 sm:px-6 lg:px-8">
          <main
            className={`apparition flex-1 flex flex-col justify-center w-full mx-auto ${
              large ? "max-w-[660px]" : "max-w-[520px]"
            }`}
          >
            <div className="carte-filet filet-fixe filet-degrade rounded-[var(--radius-l)] border border-line bg-surface shadow-[0_18px_44px_-24px_rgb(15_29_44/0.35)] px-6 py-8 sm:px-10 sm:py-11">
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
                © {new Date().getFullYear()} CanCham · Chambre de Commerce et de
                Coopération Canada–Madagascar
              </>
            )}
          </p>
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
