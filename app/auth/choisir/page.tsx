import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { CadreAuth } from "@/components/public/CadreAuth";
import { PIED_PLATEFORME } from "@/components/plateforme/site/MarqueSite";
import { LogoChambre } from "@/components/gm/LogoChambre";
import { choisirCompte } from "@/lib/actions/auth";
import { comptesDuChoix } from "@/lib/comptes-lies";

export default async function ChoisirChambrePage({ searchParams }: { searchParams: Promise<{ j?: string; suite?: string }> }) {
  const { j, suite } = await searchParams;
  const comptes = await comptesDuChoix(j);
  if (!comptes.length) redirect(`/auth?${new URLSearchParams({ erreur: "Ce choix a expiré : connectez-vous à nouveau." })}`);

  return (
    <CadreAuth illustration="acces" pied={PIED_PLATEFORME}>
      <span className="surtitre text-marque-rouge">Connexion</span>
      <h1 className="titre text-[clamp(25px,3vw,32px)] m-0 mt-2.5 mb-6">Choisissez votre Chambre</h1>

      <form action={choisirCompte} className="flex flex-col gap-2.5">
        <input type="hidden" name="j" value={j} />
        {suite?.startsWith("/") && !suite.startsWith("//") ? <input type="hidden" name="suite" value={suite} /> : null}
        {comptes.map((c) => (
          <button
            key={c.id}
            type="submit"
            name="compte"
            value={c.id}
            className="group flex w-full items-center gap-3.5 rounded-[var(--radius-m)] border border-line bg-surface px-4 py-3 text-left cursor-pointer transition-colors hover:border-marque-vert/50 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marque-vert"
          >
            <LogoChambre nom={c.chambre} logo={c.logo} fond={c.logoFond} taille={40} />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-ink truncate">{c.chambre}</span>
              <span className="block text-[12.5px] text-muted">{c.role === "admin" ? "Espace équipe" : "Espace membre"}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>
        ))}
      </form>

      <p className="text-[13.5px] text-muted mt-6 mb-0 pt-5 border-t border-line">
        <Link href="/auth" className="text-marque-vert font-semibold no-underline hover:underline">
          Changer de compte
        </Link>
      </p>
    </CadreAuth>
  );
}
