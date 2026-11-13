// Blocs du site de la plateforme : cadre de page, titres de section, champ e-mail, questions, appel final
import type { ReactNode } from "react";
import Form from "next/form";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { EnTeteSite } from "@/components/plateforme/site/EnTeteSite";
import { PiedSite } from "@/components/plateforme/site/PiedSite";

export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marque-nuit";

// Une page du site : lien d'évitement, en-tête fixe, contenu, pied
export function PageSite({ children }: { children: ReactNode }) {
  return (
    <div className="site-plateforme min-h-dvh bg-bg text-ink">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lg">
        Aller au contenu
      </a>
      <EnTeteSite />
      <main id="contenu">{children}</main>
      <PiedSite />
    </div>
  );
}

export function EnTeteSection({ surtitre, titre, texte, centre = false, niveau = 2 }: { surtitre: string; titre: ReactNode; texte?: string; centre?: boolean; niveau?: 1 | 2 }) {
  const Titre = niveau === 1 ? "h1" : "h2";
  return (
    <div className={`max-w-[680px] ${centre ? "mx-auto text-center" : ""}`}>
      <p className="m-0 text-[15px] font-medium text-accent-strong">{surtitre}</p>
      <Titre className={`mt-3 mb-0 leading-[1.1] text-ink ${niveau === 1 ? "text-[clamp(36px,4.6vw,56px)]" : "text-[clamp(28px,3.4vw,40px)]"}`}>{titre}</Titre>
      {texte ? <p className="mt-4 mb-0 text-[17px] leading-[28px] text-muted">{texte}</p> : null}
    </div>
  );
}

// Champ e-mail qui ouvre la création d'une Chambre, adresse déjà remplie
export function FormulaireEmail({ sombre = false, bouton = "Créer ma Chambre" }: { sombre?: boolean; bouton?: string }) {
  return (
    <Form
      action="/creer-une-chambre"
      className={`w-full max-w-[520px] flex flex-col sm:flex-row gap-2 sm:gap-1 sm:p-1 sm:rounded-[14px] sm:border ${
        sombre ? "sm:border-white/15 sm:bg-white/[0.06]" : "sm:border-line sm:bg-surface sm:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
      }`}
    >
      <label className="flex-1 min-w-0">
        <span className="sr-only">Votre adresse e-mail</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="Votre adresse e-mail"
          className={`w-full h-12 rounded-[10px] px-4 text-[16px] outline-none border sm:border-0 focus-visible:ring-2 ${
            sombre
              ? "bg-white/[0.06] sm:bg-transparent border-white/15 text-white placeholder:text-white/50 focus-visible:ring-white/60"
              : "bg-surface sm:bg-transparent border-line-champ text-ink placeholder:text-faint focus-visible:ring-marque-nuit/30"
          }`}
        />
      </label>
      <button type="submit" className={`btn-action ${sombre ? "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" : FOCUS}`}>
        {bouton} <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
      </button>
    </Form>
  );
}

export function Rassurances({ points, sombre = false, centre = false }: { points: string[]; sombre?: boolean; centre?: boolean }) {
  return (
    <ul className={`m-0 p-0 list-none flex flex-wrap gap-x-5 gap-y-2 text-[14px] ${centre ? "justify-center" : ""} ${sombre ? "text-white/70" : "text-muted"}`}>
      {points.map((t) => (
        <li key={t} className="inline-flex items-center gap-2">
          <Check size={16} strokeWidth={2} className={`shrink-0 ${sombre ? "text-[#5fd39b]" : "text-success"}`} aria-hidden /> {t}
        </li>
      ))}
    </ul>
  );
}

export function Questions({ questions }: { questions: { q: string; r: string }[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {questions.map(({ q, r }) => (
        <details key={q} className="group">
          <summary className={`flex items-center justify-between gap-6 py-5 cursor-pointer list-none text-[16px] font-medium text-ink [&::-webkit-details-marker]:hidden ${FOCUS}`}>
            {q}
            <ChevronDown size={18} strokeWidth={1.5} aria-hidden className="text-muted shrink-0 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <p className="mt-0 mb-5 pr-10 text-[15px] leading-[24px] text-muted">{r}</p>
        </details>
      ))}
    </div>
  );
}

// Bandeau final : champ e-mail, lien vers l'adhésion
export function AppelFinal() {
  return (
    <section className="px-5 sm:px-8 pb-20 lg:pb-28">
      <div className="sur-sombre max-w-[1200px] mx-auto rounded-[20px] bg-marque-nuit px-6 py-14 sm:px-14 sm:py-16 text-center">
        <div className="flex flex-col items-center">
          <h2 className="m-0 max-w-[640px] text-[clamp(28px,3.4vw,40px)] leading-[1.1] text-white">Ouvrez l’espace de <span className="texte-degrade">votre Chambre</span></h2>
          <p className="mt-4 mb-0 max-w-[480px] text-[17px] leading-[28px] text-white/70">Créez-le maintenant, composez votre offre et accueillez vos premiers membres.</p>
          <div className="mt-8 w-full flex justify-center">
            <FormulaireEmail sombre />
          </div>
          <div className="mt-5">
            <Rassurances sombre centre points={["Gratuit pour démarrer", "Sans carte bancaire"]} />
          </div>
          <p className="mt-6 mb-0 text-[14px] text-white/70">
            Vous êtes une entreprise ?{" "}
            <Link href="/devenir-membre" className="font-medium text-white underline underline-offset-4 decoration-white/40 hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm">
              Devenir membre d’une Chambre
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

// Une page de texte (mentions légales, confidentialité, conditions) : une colonne, des titres de section
export function PageTexte({ titre, intro, maj, children }: { titre: string; intro?: string; maj?: string; children: ReactNode }) {
  return (
    <PageSite>
      <article className="max-w-[760px] mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-20 lg:pb-28">
        <header className="entree">
          <h1 className="m-0 text-[clamp(32px,4.2vw,48px)] leading-[1.08] text-ink">{titre}</h1>
          {intro ? <p className="mt-4 mb-0 text-[17px] leading-[28px] text-muted">{intro}</p> : null}
          {maj ? <p className="mt-3 mb-0 text-[14px] text-faint">Mise à jour le {maj}</p> : null}
        </header>
        <div className="texte-long mt-10">{children}</div>
      </article>
    </PageSite>
  );
}
