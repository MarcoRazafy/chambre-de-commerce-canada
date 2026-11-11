"use client";

// Liste de l'équipe (onglet « Équipe & accès ») : les super admins en haut, les admins en dessous, avec une recherche
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { Vide } from "@/components/admin/ui";
import { CarteEquipier } from "@/components/forms/EquipeForms";
import { NIVEAU_EQUIPE_LABEL } from "@/lib/enums";
import type { CompteEquipe } from "@/lib/queries-admin";
import type { NiveauEquipe } from "@/lib/types";

const sansAccents = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const GROUPES: NiveauEquipe[] = ["administrateur", "manager"];

export function ListeEquipe({
  comptes,
  moiId,
  gere,
}: {
  comptes: CompteEquipe[];
  moiId: string;
  gere: boolean;
}) {
  const [q, setQ] = useState("");
  // Le compte offert de l'abonnement : le plus ancien super admin (la liste va du plus ancien au plus récent)
  const offertId = comptes.find((c) => c.niveau === "administrateur")?.id;

  const visibles = useMemo(() => {
    const mots = sansAccents(q.trim()).split(/\s+/).filter(Boolean);
    return comptes.filter((c) => {
      const texte = sansAccents(`${c.nom} ${c.email} ${c.fonction ?? ""} ${c.tel ?? ""}`);
      return mots.every((m) => texte.includes(m));
    });
  }, [comptes, q]);

  return (
    <>
      <div className="flex justify-end pb-3">
        <div className="relative w-full sm:w-[280px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom, courriel, fonction…"
            aria-label="Chercher dans l’équipe"
            className="w-full rounded-[var(--radius-s)] border border-line-champ bg-surface text-ink pl-9 pr-3 py-2 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
      </div>

      {visibles.length ? (
        <div className="flex flex-col gap-5">
          {GROUPES.map((niveau) => {
            const groupe = visibles.filter((c) => c.niveau === niveau);
            if (!groupe.length) return null;
            return (
              <section key={niveau}>
                <h3 className="m-0 flex items-center gap-2 border-b border-line pb-2 text-[13px] font-semibold text-muted">
                  {NIVEAU_EQUIPE_LABEL[niveau]}s
                  <span className="text-[11px] font-bold px-[7px] py-px rounded-full bg-surface-3 text-muted">{groupe.length}</span>
                </h3>
                <ul className="list-none m-0 p-0">
                  {groupe.map((a) => (
                    <li key={a.id} className="border-b border-line last:border-b-0">
                      <CarteEquipier compte={a} cestMoi={a.id === moiId} gere={gere} offert={a.id === offertId} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="py-4">
          <Vide icone={<Users size={24} />}>Personne ne correspond à « {q.trim()} ».</Vide>
        </div>
      )}
    </>
  );
}
