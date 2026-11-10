"use client";

// Sauvegarde automatique d'une lettre : à chaque modification, le brouillon est enregistré (créé la première fois)
import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { sauverBrouillon } from "@/lib/actions/newsletter";

const DELAI = 1200;
// Ce qui ne fait pas partie de la lettre elle-même
const IGNORES = new Set(["intention", "programmeeLe", "id"]);

function empreinte(form: HTMLFormElement): string {
  return JSON.stringify(
    [...new FormData(form).entries()].filter(([k, v]) => !IGNORES.has(k) && typeof v === "string"),
  );
}

export function SauvegardeAuto({ id: idInitial }: { id?: string }) {
  const [id, setId] = useState(idInitial ?? "");
  const [etat, setEtat] = useState<{ quand: Date } | "enCours" | "erreur" | null>(null);
  const ancre = useRef<HTMLInputElement>(null);
  const reference = useRef<string | null>(null);
  const enCours = useRef(false);
  const idCourant = useRef(id);

  useEffect(() => {
    const form = ancre.current?.form;
    if (!form) return;
    reference.current = empreinte(form);

    const sauver = async () => {
      if (enCours.current) return;
      const e = empreinte(form);
      if (e === reference.current) return;
      enCours.current = true;
      setEtat("enCours");
      const fd = new FormData(form);
      fd.set("id", idCourant.current);
      try {
        const r = await sauverBrouillon(fd);
        if ("id" in r) {
          reference.current = e;
          if (!idCourant.current) {
            idCourant.current = r.id;
            setId(r.id);
            // Retour, actualisation : on retrouve la lettre enregistrée
            window.history.replaceState(window.history.state, "", `/admin/newsletter/${r.id}`);
          }
          setEtat({ quand: new Date() });
        } else {
          reference.current = e;
          setEtat(null);
        }
      } catch {
        setEtat("erreur");
      } finally {
        enCours.current = false;
      }
    };

    const minuterie = window.setInterval(sauver, DELAI);
    return () => window.clearInterval(minuterie);
  }, []);

  return (
    <>
      <input ref={ancre} type="hidden" name="id" value={id} />
      {etat ? (
        <span className="inline-flex items-center justify-center gap-1.5 text-[12px] text-muted" role="status">
          {etat === "enCours" ? (
            <><Loader2 size={13} className="animate-spin" /> Enregistrement…</>
          ) : etat === "erreur" ? (
            <span className="text-bad">Brouillon non enregistré, nouvel essai en cours</span>
          ) : (
            <><Check size={13} className="text-success" /> Brouillon enregistré à {etat.quand.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</>
          )}
        </span>
      ) : null}
    </>
  );
}
