"use client";

// Liste de l'équipe (onglet « Équipe & accès ») : recherche et filtre Tous / Administrateurs / Managers, sans rechargement
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { Vide } from "@/components/admin/ui";
import { CarteEquipier } from "@/components/forms/EquipeForms";
import type { CompteEquipe } from "@/lib/queries-admin";
import type { NiveauEquipe } from "@/lib/types";

type Filtre = "tous" | NiveauEquipe;

const sansAccents = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function ListeEquipe({
  comptes,
  moiId,
  gere,
}: {
  comptes: CompteEquipe[];
  moiId: string;
  gere: boolean;
}) {
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [q, setQ] = useState("");

  const onglets: { cle: Filtre; libelle: string; compte: number }[] = [
    { cle: "tous", libelle: "Tous", compte: comptes.length },
    { cle: "administrateur", libelle: "Administrateurs", compte: comptes.filter((c) => c.niveau === "administrateur").length },
    { cle: "manager", libelle: "Managers", compte: comptes.filter((c) => c.niveau === "manager").length },
  ];

  const visibles = useMemo(() => {
    const mots = sansAccents(q.trim()).split(/\s+/).filter(Boolean);
    return comptes.filter((c) => {
      if (filtre !== "tous" && c.niveau !== filtre) return false;
      const texte = sansAccents(`${c.nom} ${c.email} ${c.fonction ?? ""} ${c.tel ?? ""}`);
      return mots.every((m) => texte.includes(m));
    });
  }, [comptes, filtre, q]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-line mb-1">
        <div role="tablist" className="flex gap-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {onglets.map((o) => {
            const courant = o.cle === filtre;
            return (
              <button
                key={o.cle}
                type="button"
                role="tab"
                aria-selected={courant}
                onClick={() => setFiltre(o.cle)}
                className={`shrink-0 inline-flex items-center gap-2 px-1 py-2.5 mr-5 text-[13.5px] font-semibold bg-transparent border-0 border-b-2 cursor-pointer ${
                  courant ? "text-accent border-accent" : "text-muted border-transparent hover:text-ink"
                }`}
              >
                {o.libelle}
                <span
                  className={`text-[11px] font-bold px-[7px] py-px rounded-full ${
                    courant ? "bg-accent-soft text-accent-strong" : "bg-surface-3 text-muted"
                  }`}
                >
                  {o.compte}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-[280px] pb-2">
          <Search size={15} className="absolute left-3 top-[calc(50%-4px)] -translate-y-1/2 text-faint pointer-events-none" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom, courriel, fonction…"
            aria-label="Chercher dans l’équipe"
            className="w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink pl-9 pr-3 py-2 text-[13.5px] outline-none focus:border-accent"
          />
        </div>
      </div>

      {visibles.length ? (
        <ul className="list-none m-0 p-0">
          {visibles.map((a) => (
            <li key={a.id} className="border-b border-line last:border-b-0">
              <CarteEquipier compte={a} cestMoi={a.id === moiId} gere={gere} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-4">
          <Vide icone={<Users size={24} />}>
            {q.trim() ? `Personne ne correspond à « ${q.trim()} ».` : "Personne dans cette catégorie."}
          </Vide>
        </div>
      )}
    </>
  );
}
