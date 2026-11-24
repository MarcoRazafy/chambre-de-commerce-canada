import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { CadreEvenementsPublics, CarteEvenementPublic } from "@/components/public/CadreEvenementsPublics";
import { pagePublique } from "@/lib/evenements-publics";
import { stylePagePublique } from "@/lib/couleurs-evenement";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await pagePublique((await params).slug);
  if (!p) return { title: { absolute: "Nos évènements" } };
  const titre = `Nos évènements · ${p.profil.nom}`;
  const description = `Les prochains évènements de ${p.profil.nom} : rencontres, ateliers et rendez-vous d’affaires, ouverts à l’inscription.`;
  return { title: { absolute: titre }, description };
}

export default async function EvenementsPublics({ params }: Params) {
  const p = await pagePublique((await params).slug);
  if (!p) notFound();
  return (
    <CadreEvenementsPublics slug={p.slug} profil={p.profil} cadreLogo={p.cadreLogo} style={stylePagePublique(null, p.couleurs)}>
      <section className="max-w-[1200px] mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-16">
        <h1 className="m-0 text-[clamp(32px,4.4vw,48px)] leading-tight">Nos évènements</h1>
        {p.aVenir.length ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {p.aVenir.map((e) => <CarteEvenementPublic key={e.id} slug={p.slug} e={e} />)}
          </div>
        ) : (
          <p className="mt-10 mb-0 flex items-center gap-2.5 text-[15px] text-muted"><CalendarDays size={18} aria-hidden /> Aucun évènement à venir pour le moment.</p>
        )}
      </section>
      {p.passes.length ? (
        <section className="max-w-[1200px] mx-auto px-5 sm:px-8 pb-20">
          <h2 className="m-0 text-[clamp(24px,3vw,32px)]">Évènements passés</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {p.passes.map((e) => <CarteEvenementPublic key={e.id} slug={p.slug} e={e} />)}
          </div>
        </section>
      ) : null}
    </CadreEvenementsPublics>
  );
}
