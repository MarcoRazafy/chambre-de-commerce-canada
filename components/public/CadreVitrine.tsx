import type { CSSProperties } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Mail, MapPin, Phone } from "lucide-react";
import { LienAncre } from "@/components/public/LienAncre";
import { NavigationPublique } from "@/components/public/NavigationPublique";
import { LogoOfficiel } from "@/components/public/Marque";
import { chiffres, COORDONNEES } from "@/lib/coordonnees";
import { fmtDate } from "@/lib/format";
import { getProchainsEvenements } from "@/lib/queries";

export const CONTENEUR = "max-w-[1400px] mx-auto px-5 md:px-10";

export const TITRE_GRAS =
  "font-[family-name:var(--font-texte)]! font-bold! tracking-[-0.015em]";

export const TITRE_SECTION = `${TITRE_GRAS} text-[clamp(30px,4.4vw,56px)] leading-[1.08] m-0`;

export const TITRE_BLOC = `${TITRE_GRAS} text-[clamp(22px,2.4vw,28px)] leading-[1.25] m-0`;

export const retard = (ms: number): CSSProperties =>
  ({ "--retard": `${ms}ms` }) as CSSProperties;

const LIENS = [
  { href: "/", libelle: "Accueil" },
  { href: "/#evenements", libelle: "Événements" },
  { href: "/#actualites", libelle: "Actualités" },
  { href: "/la-traversee", libelle: "La Traversée" },
  {
    href: "/auth/inscription",
    libelle: "Devenir membre",
    mobileSeulement: true,
  },
];

const lien =
  "relative inline-flex items-center min-h-11 lg:min-h-0 px-2.5 md:px-3 lg:px-4 py-1.5 md:py-2 text-[14px] md:text-[14.5px] font-semibold text-[#3d4b5c] no-underline whitespace-nowrap transition-colors hover:text-[var(--marque-nuit)] aria-[current=page]:text-[var(--marque-nuit)] after:absolute after:left-2.5 after:right-2.5 md:after:left-3 md:after:right-3 lg:after:left-4 lg:after:right-4 after:bottom-0.5 after:h-[2px] after:rounded-full after:bg-[linear-gradient(90deg,var(--marque-rouge),var(--marque-vert))] after:origin-left after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100 aria-[current=page]:after:scale-x-100";

const ANNONCES_PAR_DEFAUT = [
  { texte: "Le réseau des entreprises du Canada et de Madagascar", href: null },
  { texte: "Adhésions ouvertes toute l’année", href: "/auth/inscription" },
  { texte: "Événements et ressources", href: null },
];

const ANNONCES_MIN = 8;

const SECONDES_PAR_ANNONCE = 13;

export async function EnTetePublique() {
  await connection();
  const evenements = await getProchainsEvenements(6);
  const annonces = evenements.length
    ? evenements.map((e) => ({
        texte: [
          e.titre,
          fmtDate(e.date, { day: "numeric", month: "long", year: "numeric" }),
          e.lieu,
        ]
          .filter(Boolean)
          .join(" — "),
        href: `/evenements/${e.id}`,
      }))
    : ANNONCES_PAR_DEFAUT;

  let piste = annonces;
  while (piste.length < ANNONCES_MIN) piste = piste.concat(annonces);

  return (
    <header className="sticky top-0 z-40">
      <div
        className="bandeau-annonces overflow-hidden bg-marque-rouge text-white"
        aria-label="Prochains rendez-vous"
      >
        <div
          className="bandeau-piste flex w-max"
          style={{
            animationDuration: `${piste.length * SECONDES_PAR_ANNONCE}s`,
          }}
        >
          {[0, 1].map((copie) => (
            <ul
              key={copie}
              aria-hidden={copie === 1 ? true : undefined}
              className="flex shrink-0 list-none m-0 p-0"
            >
              {piste.map((a, i) => (
                <li
                  key={i}
                  className="flex items-center whitespace-nowrap text-[13px] font-semibold"
                >
                  {a.href ? (
                    <Link
                      href={a.href}
                      tabIndex={copie === 1 ? -1 : undefined}
                      className="px-6 py-2.5 text-white no-underline hover:underline underline-offset-2"
                    >
                      {a.texte}
                    </Link>
                  ) : (
                    <span className="px-6 py-2.5">{a.texte}</span>
                  )}
                  <span aria-hidden="true" className="text-white/80">
                    •
                  </span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-sm border-b border-[#e3e8ee] text-[#3d4b5c] shadow-[0_6px_24px_-18px_rgba(15,29,44,0.35)]">
        <div
          className={`${CONTENEUR} flex flex-wrap items-center justify-between gap-x-4 py-2.5 lg:py-0 lg:h-[72px]`}
        >
          <Link
            href="/"
            aria-label="Accueil CanCham Connect"
            className="order-1 shrink-0"
          >
            <LogoOfficiel
              className="text-[17px] sm:text-[20px] md:text-[22px]"
              priority
            />
          </Link>

          <div className="order-2 lg:order-3 flex items-center gap-2 shrink-0">
            <div className="hidden xl:block">
              <Link
                href="/auth/inscription"
                className="btn-contour text-[var(--marque-nuit)] border-[#c9d2dc] hover:border-[var(--marque-nuit)] hover:bg-[#f3f5f8]"
              >
                Devenir membre
              </Link>
            </div>
            <Link href="/auth" className="btn-action">
              Se connecter
            </Link>
          </div>

          <nav
            aria-label="Navigation principale"
            className="order-3 lg:order-2 w-full lg:w-auto flex items-center gap-1 md:gap-2 mt-1 lg:mt-0 -mx-1 px-1 lg:mx-0 lg:px-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-lg:[mask-image:linear-gradient(90deg,#000_calc(100%-36px),transparent)]"
          >
            <NavigationPublique liens={LIENS} className={lien} />
          </nav>
        </div>
      </div>
    </header>
  );
}

const COLONNES = [
  {
    titre: "Navigation",
    liens: [
      { libelle: "Accueil", href: "/" },
      { libelle: "Événements", href: "/#evenements" },
      { libelle: "Actualités", href: "/#actualites" },
    ],
  },
  {
    titre: "Membre",
    liens: [
      { libelle: "Devenir membre", href: "/auth/inscription" },
      { libelle: "Espace membre", href: "/auth" },
    ],
  },
];

const LEGAL = [
  { libelle: "Mentions légales", href: COORDONNEES.legal.mentions },
  {
    libelle: "Politique de confidentialité",
    href: COORDONNEES.legal.confidentialite,
  },
  { libelle: "cancham.mg", href: COORDONNEES.site },
];

export function PiedPublique() {
  const lien =
    "text-[13.5px] text-white/70 no-underline transition-colors hover:text-white";
  const reseau =
    "w-9 h-9 rounded-[8px] bg-white/8 border border-white/12 text-white/80 text-[13px] font-bold flex items-center justify-center no-underline transition-colors hover:bg-white/15 hover:text-white";

  return (
    <footer className="border-t border-white/10 bg-[var(--marque-nuit)] mt-auto">
      <div
        className={`scene ${CONTENEUR} py-12 grid gap-10 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.3fr]`}
      >
        <div className="reveler">
          <Link
            href="/"
            aria-label="Accueil CanCham Connect"
            className="inline-block"
          >
            <LogoOfficiel version="blanc" className="text-[20px]" />
          </Link>
          <p className="m-0 mt-4 text-[13.5px] leading-relaxed text-white/70 max-w-[34ch]">
            Chambre de Commerce et de Coopération Canada–Madagascar. Le pont
            entre nos deux pays depuis 2016.
          </p>
          <div className="flex gap-2 mt-5">
            <a
              href={COORDONNEES.reseaux.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="CanCham sur LinkedIn"
              className={reseau}
            >
              <span aria-hidden="true">in</span>
            </a>
            <a
              href={COORDONNEES.reseaux.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="CanCham sur Facebook"
              className={reseau}
            >
              <span aria-hidden="true">f</span>
            </a>
          </div>
        </div>

        {COLONNES.map((c, i) => (
          <nav
            key={c.titre}
            aria-label={c.titre}
            style={retard(80 + i * 70)}
            className="reveler"
          >
            <h2 className="surtitre m-0 mb-4 text-white/55">{c.titre}</h2>
            <ul className="list-none m-0 p-0 flex flex-col gap-3">
              {c.liens.map((l) => (
                <li key={l.href}>
                  <LienAncre href={l.href} className={lien}>
                    {l.libelle}
                  </LienAncre>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div style={retard(220)} className="reveler">
          <h2 className="surtitre m-0 mb-4 text-white/55">Contact</h2>
          <ul className="list-none m-0 p-0 flex flex-col gap-3 text-[13.5px] text-white/70">
            <li className="flex items-start gap-2.5">
              <MapPin size={15} className="mt-0.5 shrink-0 text-marque-rouge" />
              {COORDONNEES.adresse}
            </li>
            <li className="flex items-start gap-2.5">
              <Mail size={15} className="mt-0.5 shrink-0 text-marque-rouge" />
              <a href={`mailto:${COORDONNEES.email}`} className={lien}>
                {COORDONNEES.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone size={15} className="mt-0.5 shrink-0 text-marque-rouge" />
              <a
                href={`tel:${chiffres(COORDONNEES.telephone)}`}
                className={lien}
              >
                {COORDONNEES.telephone}
              </a>
            </li>
          </ul>
          <Link href="/auth/inscription" className="btn-action mt-6">
            Devenir membre
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div
          className={`${CONTENEUR} py-5 pb-20 sm:pb-5 flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-white/50`}
        >
          <span>
            © {new Date().getFullYear()} CanCham Madagascar — Tous droits
            réservés
          </span>
          <nav
            aria-label="Informations légales"
            className="flex flex-wrap gap-x-6 gap-y-2"
          >
            {LEGAL.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/50 no-underline hover:text-white/80"
              >
                {l.libelle}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
