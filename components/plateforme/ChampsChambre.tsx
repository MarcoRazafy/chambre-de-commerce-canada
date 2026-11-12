"use client";

// Nom de la Chambre et son adresse : l'adresse se propose à partir du nom, jusqu'à ce qu'on la modifie
import { useState } from "react";
import { ChampAuth, Saisie } from "@/components/public/ChampsAuth";

const versAdresse = (nom: string) =>
  nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
    .replace(/-+$/, "");

export function ChampsChambre({ nom: nomInitial, slug: slugInitial, suffixe }: { nom: string; slug: string; suffixe: string }) {
  const [nom, setNom] = useState(nomInitial);
  const [slug, setSlug] = useState(slugInitial);
  const [touchee, setTouchee] = useState(Boolean(slugInitial));
  return (
    <>
      <ChampAuth label="Nom de la Chambre">
        <Saisie
          name="nomChambre"
          required
          maxLength={120}
          autoComplete="organization"
          value={nom}
          onChange={(e) => {
            setNom(e.target.value);
            if (!touchee) setSlug(versAdresse(e.target.value));
          }}
        />
      </ChampAuth>
      <ChampAuth label="Adresse de l’espace">
        <span className="flex min-w-0">
          <Saisie
            name="slug"
            required
            maxLength={63}
            pattern="[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?"
            autoCapitalize="none"
            spellCheck={false}
            value={slug}
            onChange={(e) => {
              setTouchee(true);
              setSlug(e.target.value.toLowerCase());
            }}
            className="min-w-0 flex-1 rounded-r-none"
          />
          <span className="flex items-center min-w-0 max-w-[55%] border border-l-0 border-line bg-surface-2 rounded-r-[var(--radius-s)] px-3 text-[14px] text-muted">
            <span className="truncate">{suffixe}</span>
          </span>
        </span>
      </ChampAuth>
    </>
  );
}
