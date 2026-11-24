import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, MapPin, Ticket } from "lucide-react";
import { CadreEvenementsPublics } from "@/components/public/CadreEvenementsPublics";
import { couleursEvenement, dateLongue, evenementPublic, ouvertureInscription, pagePublique } from "@/lib/evenements-publics";
import { InscriptionPublique } from "@/components/public/InscriptionPublique";
import { stylePagePublique } from "@/lib/couleurs-evenement";
import { fmtMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, id } = await params;
  const p = await pagePublique(slug);
  const e = p ? await evenementPublic(p.chambreId, id) : null;
  if (!e || !p) return { title: { absolute: "Évènement" } };
  const titre = `${e.titre} · ${p.profil.nom}`;
  const description = e.desc.replace(/\s+/g, " ").trim().slice(0, 160);
  return { title: { absolute: titre }, description, openGraph: { title: titre, description, ...(e.photo ? { images: [{ url: e.photo, alt: e.titre }] } : {}) } };
}

export default async function EvenementPublicPage({ params }: Params) {
  const { slug, id } = await params;
  const p = await pagePublique(slug);
  if (!p) notFound();
  const e = await evenementPublic(p.chambreId, id);
  if (!e) notFound();
  const ouverture = await ouvertureInscription(p.chambreId, e.id);
  const autres = p.aVenir.filter((x) => x.id !== e.id).slice(0, 3);
  const paragraphes = e.desc.split(/\n{2,}|\r\n\r\n/).map((x) => x.trim()).filter(Boolean);
  const horaire = e.debut ? `${e.debut}${e.fin ? ` – ${e.fin}` : ""}` : null;

  return (
    <CadreEvenementsPublics slug={p.slug} profil={p.profil} cadreLogo={p.cadreLogo} style={stylePagePublique(couleursEvenement(e), p.couleurs)}>
      <div className="max-w-[1100px] mx-auto px-5 sm:px-8 pt-8 pb-20 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <article className="min-w-0">
          <Link href={`/c/${p.slug}/evenements`} className="inline-flex items-center gap-1.5 text-[13.5px] text-muted no-underline hover:text-ink">
            <ArrowLeft size={14} aria-hidden /> Tous les évènements
          </Link>
          <p className="m-0 mt-6 text-[12.5px] font-bold uppercase tracking-[0.12em] text-success">
            {e.format} <span className="font-normal normal-case tracking-normal text-muted">· {dateLongue(e.date)}</span>
          </p>
          <h1 className="m-0 mt-3 text-[clamp(30px,4vw,44px)] leading-[1.15]">{e.titre}</h1>
          {e.pourQui ? <p className="m-0 mt-4 text-[16px] leading-relaxed text-muted">{e.pourQui}</p> : null}
          {e.photo ? (
            <div className="relative mt-8 aspect-[16/9] rounded-2xl overflow-hidden bg-surface-2">
              <Image src={e.photo} alt="" fill sizes="(max-width: 1024px) 100vw, 740px" className="object-cover" priority />
            </div>
          ) : null}
          <div className="mt-8 flex flex-col gap-4 text-[15.5px] leading-[1.75] text-ink">
            {paragraphes.map((x, i) => <p key={i} className="m-0 whitespace-pre-line">{x}</p>)}
          </div>
        </article>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-[100px]">
          <div className="rounded-2xl border border-line p-6 flex flex-col gap-3 text-[14.5px]">
            <p className="m-0 flex items-start gap-2.5"><CalendarDays size={17} className="shrink-0 mt-0.5 text-muted" aria-hidden /> {dateLongue(e.date)}</p>
            {horaire ? <p className="m-0 flex items-start gap-2.5"><Clock size={17} className="shrink-0 mt-0.5 text-muted" aria-hidden /> {horaire}</p> : null}
            {e.lieu ? <p className="m-0 flex items-start gap-2.5"><MapPin size={17} className="shrink-0 mt-0.5 text-muted" aria-hidden /> {e.lieu}</p> : null}
            <p className="m-0 flex items-start gap-2.5"><Ticket size={17} className="shrink-0 mt-0.5 text-muted" aria-hidden /> {e.prixPublic > 0 ? fmtMoney(e.prixPublic) : "Gratuit"}</p>
            {ouverture.termine ? (
              <p className="m-0 mt-2 rounded-[var(--radius-s)] bg-surface-2 px-3.5 py-3 text-center text-[13.5px] font-semibold text-muted">Événement terminé</p>
            ) : ouverture.restantes > 0 ? (
              <div className="mt-2">
                <InscriptionPublique
                  chambre={p.slug}
                  event={{ id: e.id, titre: e.titre, lieu: e.lieu, payant: e.prixPublic > 0, prix: e.prixPublic, restantes: ouverture.restantes, enLigne: ouverture.enLigne }}
                />
              </div>
            ) : (
              <p className="m-0 mt-2 rounded-[var(--radius-s)] bg-surface-2 px-3.5 py-3 text-center text-[13.5px] font-semibold text-muted">Événement complet</p>
            )}
            {ouverture.termine ? null : (
              <Link href={`/auth?suite=${encodeURIComponent(`/membre/evenements/${e.id}`)}`} className="btn-contour w-full no-underline text-ink">Je suis membre : m’inscrire</Link>
            )}
            <Link href={`/auth/inscription?chambre=${p.slug}`} className="self-center text-[13px] font-semibold text-muted no-underline hover:text-accent">Devenir membre</Link>
          </div>
          {autres.length ? (
            <div>
              <p className="m-0 text-[12px] font-bold uppercase tracking-[0.12em] text-success">À venir aussi</p>
              <ul className="m-0 mt-3 p-0 list-none flex flex-col gap-3">
                {autres.map((x) => (
                  <li key={x.id}>
                    <Link href={`/c/${p.slug}/evenements/${x.id}`} className="group flex gap-3 no-underline rounded-xl border border-line p-3 hover:bg-surface-2">
                      <span className="relative w-20 h-14 shrink-0 rounded-lg overflow-hidden bg-surface-2">
                        {x.photo ? <Image src={x.photo} alt="" fill sizes="80px" className="object-cover" /> : <span className="absolute inset-0 grid place-items-center text-faint"><CalendarDays size={18} aria-hidden /></span>}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-ink leading-snug line-clamp-2 group-hover:text-accent">{x.titre}</span>
                        <span className="block mt-1 text-[12px] text-muted">{dateLongue(x.date)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </CadreEvenementsPublics>
  );
}
