import Image from "next/image";
import { initials } from "@/lib/format";
import type { Intervenant } from "@/lib/types";

// Les intervenants d'un événement : portrait rond, nom, fonction et entreprise, quelques mots de présentation
export function ListeIntervenants({ intervenants }: { intervenants: Intervenant[] }) {
  return (
    <ul className="list-none m-0 p-0 grid gap-3 grid-cols-1 sm:grid-cols-2">
      {intervenants.map((p, i) => {
        const role = [p.fonction, p.entreprise].filter(Boolean).join(" · ");
        return (
          <li key={`${p.nom}-${i}`} className="flex gap-3.5 items-start rounded-[var(--radius-m)] border border-line bg-surface p-3.5 min-w-0">
            {p.photo ? (
              <Image
                src={p.photo}
                alt=""
                width={56}
                height={56}
                sizes="56px"
                className="w-14 h-14 rounded-full object-cover shrink-0 border border-line"
              />
            ) : (
              <span className="w-14 h-14 rounded-full shrink-0 grid place-items-center bg-navy text-white font-bold text-[16px]">
                {initials(p.nom)}
              </span>
            )}
            <div className="min-w-0">
              <div className="text-[14.5px] font-semibold text-ink">{p.nom}</div>
              {role ? <div className="text-[12.8px] text-muted">{role}</div> : null}
              {p.bio ? <p className="m-0 mt-1.5 text-[13px] text-muted leading-relaxed whitespace-pre-line">{p.bio}</p> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
