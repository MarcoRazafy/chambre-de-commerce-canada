import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, Globe, Mail, MapPin, Phone } from "lucide-react";
import type { EvenementPublic } from "@/lib/evenements-publics";
import { dateLongue } from "@/lib/evenements-publics";
import type { ProfilChambre } from "@/lib/profil-chambre-defauts";

// Cadre de la page publique des événements d'une Chambre : en tête son logo (Mon entreprise), en pied son nom et ses
// coordonnées
export function CadreEvenementsPublics({ slug, profil, children }: { slug: string; profil: ProfilChambre; children: ReactNode }) {
  const site = profil.site ? (profil.site.startsWith("http") ? profil.site : `https://${profil.site}`) : null;
  return (
    <div className="site-plateforme min-h-dvh flex flex-col bg-white text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-[76px] flex items-center justify-between gap-4">
          <Link href={`/c/${slug}/evenements`} className="flex items-center min-w-0 no-underline" aria-label={`${profil.nom}, nos évènements`}>
            <Image src={profil.logo} alt={profil.nom} width={400} height={160} priority sizes="200px" className="h-12 w-auto max-w-[220px] object-contain object-left" />
          </Link>
          <Link href={`/auth/inscription?chambre=${slug}`} className="btn-action btn-action-sm no-underline shrink-0">Devenir membre</Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-surface-2">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-10 grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] items-start">
          <div className="min-w-0">
            <p className="m-0 text-[17px] font-bold text-ink">{profil.nom}</p>
            <ul className="m-0 mt-3 p-0 list-none flex flex-col gap-1.5 text-[14px] text-muted">
              {profil.adresse ? <li className="flex items-start gap-2"><MapPin size={15} className="shrink-0 mt-0.5" aria-hidden /> {profil.adresse}</li> : null}
              {profil.telephone ? <li className="flex items-center gap-2"><Phone size={15} className="shrink-0" aria-hidden /> <a href={`tel:${profil.telephone.replace(/\s/g, "")}`} className="text-muted no-underline hover:text-ink">{profil.telephone}</a></li> : null}
              {profil.email ? <li className="flex items-center gap-2"><Mail size={15} className="shrink-0" aria-hidden /> <a href={`mailto:${profil.email}`} className="text-muted no-underline hover:text-ink break-all">{profil.email}</a></li> : null}
              {site ? <li className="flex items-center gap-2"><Globe size={15} className="shrink-0" aria-hidden /> <a href={site} target="_blank" rel="noopener noreferrer" className="text-muted no-underline hover:text-ink break-all">{profil.site.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a></li> : null}
            </ul>
          </div>
          <p className="m-0 text-[12.5px] text-faint">© {new Date().getFullYear()} {profil.nom}</p>
        </div>
      </footer>
    </div>
  );
}

// Une carte d'événement (liste publique) : la photo et son format, la date et le lieu, le titre, le début du texte
export function CarteEvenementPublic({ slug, e }: { slug: string; e: EvenementPublic }) {
  return (
    <Link href={`/c/${slug}/evenements/${e.id}`} className="group no-underline flex flex-col rounded-2xl border border-line bg-white overflow-hidden transition-shadow hover:shadow-[0_18px_40px_-20px_rgba(15,29,44,0.35)]">
      <div className="relative aspect-[16/9] bg-surface-2 overflow-hidden">
        {e.photo ? (
          <Image src={e.photo} alt="" fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-faint"><CalendarDays size={32} aria-hidden /></span>
        )}
        <span className="absolute left-4 bottom-4 rounded-full bg-white px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-ink shadow-sm">{e.format}</span>
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-muted">
          {dateLongue(e.date)}{e.lieu ? ` · ${e.lieu}` : ""}
        </p>
        <h3 className="m-0 mt-3 text-[21px] leading-snug text-ink group-hover:text-accent transition-colors">{e.titre}</h3>
        {e.desc ? <p className="m-0 mt-3 text-[14.5px] leading-relaxed text-muted line-clamp-3">{e.desc}</p> : null}
      </div>
    </Link>
  );
}
