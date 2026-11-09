"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition, type ReactNode } from "react";

const DELAI_SAISIE = 350;

export function FiltresAuto({
  action,
  className,
  children,
}: {
  action?: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [enCours, demarrer] = useTransition();
  const formulaire = useRef<HTMLFormElement>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout>>(undefined);
  const soumis = useRef<string | null>(null);

  const appliquer = () => {
    clearTimeout(minuterie.current);
    const form = formulaire.current;
    if (!form) return;
    const q = new URLSearchParams();
    for (const [cle, valeur] of new FormData(form)) {
      // Plusieurs cases cochées sous le même nom : chacune garde sa valeur
      if (typeof valeur === "string" && valeur.trim() && !q.getAll(cle).includes(valeur.trim()))
        q.append(cle, valeur.trim());
    }
    const chaine = q.toString();
    soumis.current = chaine;
    demarrer(() =>
      router.replace(chaine ? `${pathname}?${chaine}` : pathname, {
        scroll: false,
      }),
    );
  };

  const chaine = params.toString();
  useEffect(() => {
    if (soumis.current === chaine) return;
    const form = formulaire.current;
    if (!form) return;
    for (const el of Array.from(form.elements)) {
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        el.checked = params.getAll(el.name).includes(el.value);
        continue;
      }
      const saisie =
        (el instanceof HTMLInputElement &&
          el.type !== "hidden" &&
          el.type !== "submit") ||
        el instanceof HTMLSelectElement;
      if (saisie) el.value = params.get(el.name) ?? "";
    }
  }, [chaine, params]);

  useEffect(() => () => clearTimeout(minuterie.current), []);

  return (
    <form
      ref={formulaire}
      action={action}
      role="search"
      aria-busy={enCours}
      className={`${className ?? ""} transition-opacity ${enCours ? "opacity-70" : ""}`}
      onChange={(e) => {
        if (e.target instanceof HTMLSelectElement) {
          appliquer();
        } else {
          clearTimeout(minuterie.current);
          minuterie.current = setTimeout(appliquer, DELAI_SAISIE);
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        appliquer();
      }}
    >
      {children}
      <button type="submit" className="sr-only">
        Filtrer
      </button>
    </form>
  );
}
