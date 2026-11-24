"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FileArchive, Upload } from "lucide-react";
import { importerRessources } from "@/lib/actions/gm";

type Etat =
  | { phase: "pret" }
  | { phase: "envoi"; pct: number }
  | { phase: "import" }
  | { phase: "fini"; dossiers: number; ressources: number; ignorees: { titre: string; raison: string }[] }
  | { phase: "erreur"; message: string };

const MORCEAU = 8 * 1024 * 1024;
const pause = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

async function envoyer(fichier: File, progression: (pct: number) => void): Promise<string> {
  let jeton = "";
  let recu = 0;
  let essais = 0;
  while (recu < fichier.size) {
    const q = new URLSearchParams({ decalage: String(recu) });
    if (jeton) q.set("jeton", jeton);
    let reponse: Response | null = null;
    try {
      reponse = await fetch(`/api/gm/import-ressources?${q}`, {
        method: "POST",
        body: fichier.slice(recu, recu + MORCEAU),
        headers: { "Content-Type": "application/octet-stream" },
      });
    } catch {}
    const d = reponse ? ((await reponse.json().catch(() => ({}))) as { jeton?: string; recu?: number; erreur?: string }) : {};

    if (reponse?.status === 409 && typeof d.recu === "number") {
      recu = d.recu;
      continue;
    }
    if (!reponse || reponse.status >= 500) {
      if (++essais > 3) throw new Error("La connexion a été coupée pendant l’envoi.");
      await pause(1500 * essais);
      continue;
    }
    if (!reponse.ok || !d.jeton || typeof d.recu !== "number") throw new Error(d.erreur ?? "L’envoi a échoué.");
    essais = 0;
    jeton = d.jeton;
    recu = d.recu;
    progression(Math.round((recu / fichier.size) * 100));
  }
  return jeton;
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

export function ImporterRessources({ chambreId }: { chambreId: string }) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [etat, setEtat] = useState<Etat>({ phase: "pret" });
  const occupe = etat.phase === "envoi" || etat.phase === "import";

  async function lancer() {
    if (!fichier || occupe) return;
    if (!fichier.size) {
      setEtat({ phase: "erreur", message: "Le fichier est vide." });
      return;
    }
    setEtat({ phase: "envoi", pct: 0 });
    try {
      const jeton = await envoyer(fichier, (pct) => setEtat({ phase: "envoi", pct }));
      setEtat({ phase: "import" });
      const r = await importerRessources(chambreId, jeton);
      if (!r) return;
      if (!r.ok) {
        setEtat({ phase: "erreur", message: r.erreur });
        return;
      }
      setEtat({ phase: "fini", ...r.bilan });
      setFichier(null);
      if (champ.current) champ.current.value = "";
      router.refresh();
    } catch (e) {
      setEtat({ phase: "erreur", message: e instanceof Error ? e.message : "L’envoi a échoué." });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5 flex-wrap">
        <label
          className={`btn-contour btn-contour-sm text-ink hover:bg-surface-2 cursor-pointer min-w-0 max-w-full ${occupe ? "pointer-events-none opacity-60" : ""}`}
        >
          <FileArchive size={14} aria-hidden />
          <span className="truncate">{fichier ? fichier.name : "Choisir l’archive (.zip)"}</span>
          <input
            ref={champ}
            type="file"
            accept=".zip,application/zip"
            className="sr-only"
            disabled={occupe}
            onChange={(e) => {
              setFichier(e.target.files?.[0] ?? null);
              setEtat({ phase: "pret" });
            }}
          />
        </label>
        <button type="button" onClick={lancer} disabled={!fichier || occupe} className="btn-action btn-action-sm disabled:opacity-50">
          <Upload size={14} aria-hidden />
          {etat.phase === "envoi" ? <span className="tabular-nums">Envoi… {etat.pct} %</span> : etat.phase === "import" ? "Import…" : "Importer"}
        </button>
      </div>

      {etat.phase === "envoi" ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={etat.pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${etat.pct}%` }} />
        </div>
      ) : null}

      {etat.phase === "fini" ? (
        <div role="status" className="flex flex-col gap-1.5 text-[13.5px]">
          <p className="m-0 text-success-strong">
            {pluriel(etat.ressources, "ressource")} et {pluriel(etat.dossiers, "dossier")} ajoutés
          </p>
          {etat.ignorees.length ? (
            <>
              <p className="m-0 text-muted">Non importées :</p>
              <ul className="m-0 pl-5 text-muted">
                {etat.ignorees.map((r, i) => (
                  <li key={i}>
                    {r.titre} <span className="text-faint">({r.raison})</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      {etat.phase === "erreur" ? (
        <p role="alert" className="m-0 text-[13.5px] text-bad">
          {etat.message}
        </p>
      ) : null}
    </div>
  );
}
