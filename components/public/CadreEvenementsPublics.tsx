import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, Globe, Mail, MapPin, Phone } from "lucide-react";
import type { EvenementPublic } from "@/lib/evenements-publics";
import { dateLongue } from "@/lib/evenements-publics";
import type { ProfilChambre } from "@/lib/profil-chambre-defauts";
import type { StylePage } from "@/lib/couleurs-evenement";

export function CadreEvenementsPublics({ slug, profil, style, children }: { slug: string; profil: ProfilChambre; style: StylePage; children: ReactNode }) {
  const site = profil.site ? (profil.site.startsWith("http") ? profil.site : `https://${profil.site}`) : null;
  const pied = style.piedSombre
    ? { titre: "text-white", texte: "text-white/80", lien: "text-white/80 hover:text-white", discret: "text-white/65" }
    : { titre: "text-ink", texte: "text-muted", lien: "text-muted hover:text-ink", discret: "text-faint" };
  return (
    <div className="site-plateforme min-h-dvh flex flex-col bg-white text-ink">
      <header className="sticky top-0 z-20 shadow-[0_1px_0_rgba(15,29,44,0.08)]" style={{ background: style.fondHaut }}>
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-[76px] flex items-center justify-between gap-4">
          <Link href={`/c/${slug}/evenements`} className="flex items-center min-w-0 no-underline" aria-label={`${profil.nom}, nos évènements`}>
            <span className={`flex items-center rounded-[10px] ${style.hautSombre ? "px-3 py-1.5" : ""}`} style={style.hautSombre ? { background: profil.logoFond ?? "#ffffff" } : undefined}>
              <Image src={profil.logo} alt={profil.nom} width={400} height={160} priority sizes="200px" className={`${style.hautSombre ? "h-10" : "h-12"} w-auto max-w-[200px] object-contain object-left`} />
            </span>
          </Link>
          <Link href={`/auth/inscription?chambre=${slug}`} className={`btn-action btn-action-sm no-underline shrink-0 ${style.boutonClair ? "bg-white! bg-none! text-ink!" : ""}`}>Devenir membre</Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer style={{ background: style.fondPied }}>
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-10 grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] items-start">
          <div className="min-w-0">
            <p className={`m-0 text-[17px] font-bold ${pied.titre}`}>{profil.nom}</p>
            <ul className={`m-0 mt-3 p-0 list-none flex flex-col gap-1.5 text-[14px] ${pied.texte}`}>
              {profil.adresse ? <li className="flex items-start gap-2"><MapPin size={15} className="shrink-0 mt-0.5" aria-hidden /> {profil.adresse}</li> : null}
              {profil.telephone ? <li className="flex items-center gap-2"><Phone size={15} className="shrink-0" aria-hidden /> <a href={`tel:${profil.telephone.replace(/\s/g, "")}`} className={`no-underline ${pied.lien}`}>{profil.telephone}</a></li> : null}
              {profil.email ? <li className="flex items-center gap-2"><Mail size={15} className="shrink-0" aria-hidden /> <a href={`mailto:${profil.email}`} className={`no-underline break-all ${pied.lien}`}>{profil.email}</a></li> : null}
              {site ? <li className="flex items-center gap-2"><Globe size={15} className="shrink-0" aria-hidden /> <a href={site} target="_blank" rel="noopener noreferrer" className={`no-underline break-all ${pied.lien}`}>{profil.site.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a></li> : null}
            </ul>
          </div>
          <p className={`m-0 text-[12.5px] ${pied.discret}`}>© {new Date().getFullYear()} {profil.nom}</p>
        </div>
      </footer>
    </div>
  );
}

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
