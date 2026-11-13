// Blocs du site de la plateforme : cadre de page, titres de section, champ e-mail, questions, appel final
import type { ReactNode } from "react";
import Form from "next/form";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { EnTeteSite } from "@/components/plateforme/site/EnTeteSite";
import { PiedSite } from "@/components/plateforme/site/PiedSite";

export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marque-nuit";

// Une page du site : lien d'évitement, en-tête fixe, contenu, pied
export function PageSite({ children }: { children: ReactNode }) {
  return (
    <div className="site-plateforme min-h-dvh bg-white text-ink">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg">
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
    <div className={`max-w-[700px] ${centre ? "mx-auto text-center" : ""}`}>
      <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-marque-rouge">{surtitre}</span>
      <Titre className={`mt-3 mb-0 leading-[1.1] font-extrabold text-ink ${niveau === 1 ? "text-[clamp(34px,4.6vw,52px)] tracking-[-0.03em]" : "text-[clamp(28px,3.6vw,40px)]"}`}>{titre}</Titre>
      {texte ? <p className="mt-4 mb-0 text-[17px] leading-relaxed text-muted">{texte}</p> : null}
    </div>
  );
}

// Champ e-mail qui ouvre la création d'une Chambre, adresse déjà remplie
export function FormulaireEmail({ sombre = false, bouton = "Créer ma Chambre" }: { sombre?: boolean; bouton?: string }) {
  return (
    <Form
      action="/creer-une-chambre"
      className={`w-full max-w-[540px] flex flex-col sm:flex-row gap-2.5 sm:gap-1.5 sm:p-1.5 sm:rounded-xl sm:border ${
        sombre ? "sm:border-white/20 sm:bg-white/[0.07]" : "sm:border-line sm:bg-white sm:shadow-[0_18px_40px_-28px_rgba(15,29,44,0.45)]"
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
          className={`w-full h-12 rounded-lg px-4 text-[16px] outline-none border sm:border-0 focus-visible:ring-2 ${
            sombre
              ? "bg-white/[0.07] sm:bg-transparent border-white/20 text-white placeholder:text-white/55 focus-visible:ring-white/60"
              : "bg-white sm:bg-transparent border-line text-ink placeholder:text-faint focus-visible:ring-marque-nuit/30"
          }`}
        />
      </label>
      <button type="submit" className={`btn-action h-12 ${sombre ? "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" : FOCUS}`}>
        {bouton} <ArrowRight size={17} aria-hidden />
      </button>
    </Form>
  );
}

export function Rassurances({ points, sombre = false, centre = false }: { points: string[]; sombre?: boolean; centre?: boolean }) {
  return (
    <ul className={`m-0 p-0 list-none flex flex-wrap gap-x-6 gap-y-2 text-[14px] ${centre ? "justify-center" : ""} ${sombre ? "text-white/75" : "text-muted"}`}>
      {points.map((t) => (
        <li key={t} className="inline-flex items-center gap-2">
          <Check size={16} className={`shrink-0 ${sombre ? "text-[#5fd39b]" : "text-marque-vert"}`} aria-hidden /> {t}
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
  );
}

// Bandeau final : champ e-mail, lien vers l'adhésion
export function AppelFinal() {
  return (
    <section className="px-5 sm:px-8 pb-20 lg:pb-28">
      <div className="relative overflow-hidden max-w-[1200px] mx-auto rounded-3xl bg-marque-nuit px-6 py-14 sm:px-14 sm:py-16 text-center">
        <div aria-hidden className="absolute -top-24 -left-20 w-[380px] h-[380px] rounded-full blur-3xl opacity-50" style={{ background: "radial-gradient(circle, rgb(173 7 7 / 0.7), transparent 70%)" }} />
        <div aria-hidden className="absolute -bottom-28 -right-20 w-[420px] h-[420px] rounded-full blur-3xl opacity-50" style={{ background: "radial-gradient(circle, rgb(0 113 64 / 0.7), transparent 70%)" }} />
        <div className="relative flex flex-col items-center">
          <h2 className="m-0 max-w-[720px] text-[clamp(28px,3.8vw,42px)] leading-[1.1] font-extrabold text-white">Le seul outil dont votre Chambre a besoin</h2>
          <p className="mt-4 mb-0 max-w-[520px] text-[17px] leading-relaxed text-white/75">Créez votre espace maintenant, composez votre offre et accueillez vos premiers membres.</p>
          <div className="mt-9 w-full flex justify-center">
            <FormulaireEmail sombre />
          </div>
          <div className="mt-6">
            <Rassurances sombre centre points={["Gratuit pour démarrer", "Sans carte bancaire"]} />
          </div>
          <p className="mt-6 mb-0 text-[14.5px] text-white/70">
            Vous êtes une entreprise ?{" "}
            <Link href="/devenir-membre" className="font-semibold text-white underline underline-offset-4 decoration-white/40 hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm">
              Devenir membre d’une Chambre
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
