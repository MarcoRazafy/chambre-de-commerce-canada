"use client";

// Icônes posées sur le logo et la couverture de « Mon entreprise » : changer l'image (enregistrée dès qu'elle est envoyée) ou la retirer
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { JetonsEnvoyes, pourcentage, useEnvois } from "@/components/EnvoisSuivis";
import { changerImageChambre } from "@/lib/actions/profil-chambre";

const ICONE =
  "w-8 h-8 rounded-full border border-line bg-white/95 text-ink grid place-items-center shadow-[var(--shadow)] cursor-pointer transition-colors hover:text-accent hover:border-accent focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-80";

function Attente({ pct }: { pct: number | null }) {
  return (
    <span className="relative grid place-items-center">
      <LoaderCircle size={15} className="animate-spin" />
      {pct !== null ? <span className="sr-only">{pct} %</span> : null}
    </span>
  );
}

function Changer({ champ, libelle, envoiEnCours, pct }: { champ: string; libelle: string; envoiEnCours: boolean; pct: number | null }) {
  const { pending } = useFormStatus();
  const occupe = pending || envoiEnCours;
  return (
    <label className={`${ICONE} ${occupe ? "pointer-events-none" : ""}`} title={libelle} aria-busy={occupe}>
      {occupe ? <Attente pct={pct} /> : <ImagePlus size={15} />}
      <span className="sr-only">{libelle}</span>
      <input type="file" accept="image/*" className="sr-only" data-champ={champ} disabled={occupe} />
    </label>
  );
}

function Retirer({ libelle }: { libelle: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={ICONE} title={libelle} disabled={pending}>
      {pending ? <Attente pct={null} /> : <Trash2 size={14} />}
      <span className="sr-only">{libelle}</span>
    </button>
  );
}

export function IconesImageChambre({
  champ,
  personnalisee,
  className = "",
}: {
  champ: "logo" | "couverture";
  /** Une image a été choisie (sinon c'est celle par défaut) : on peut la retirer */
  personnalisee: boolean;
  className?: string;
}) {
  const [fichiers, setFichiers] = useState<File[]>([]);
  const { etats, jetons } = useEnvois(fichiers);
  const envoi = etats[0];
  const formulaire = useRef<HTMLFormElement>(null);
  const parti = useRef<File | null>(null);
  const nom = champ === "logo" ? "le logo" : "la couverture";

  // Dès que l'image est envoyée (ou si l'envoi préalable échoue : elle part avec le formulaire), on enregistre
  useEffect(() => {
    const f = fichiers[0];
    if (!f || parti.current === f) return;
    if (jetons || envoi?.erreur) {
      parti.current = f;
      formulaire.current?.requestSubmit();
    }
  }, [fichiers, jetons, envoi?.erreur]);

  return (
    <div className={`flex gap-1.5 ${className}`}>
      <form
        ref={formulaire}
        action={changerImageChambre}
        onChange={(e) => {
          const cible = e.target;
          if (!(cible instanceof HTMLInputElement) || cible.type !== "file") return;
          const f = cible.files?.[0];
          if (!f) return;
          parti.current = null;
          setFichiers([f]);
        }}
      >
        <input type="hidden" name="champ" value={champ} />
        <JetonsEnvoyes name={champ} jetons={jetons} />
        {/* Si l'envoi préalable a échoué, le fichier part avec le formulaire */}
        {envoi?.erreur && fichiers[0] ? <FichierDeSecours name={champ} fichier={fichiers[0]} /> : null}
        <Changer
          champ={champ}
          libelle={`Changer ${nom}`}
          envoiEnCours={Boolean(fichiers.length && !jetons && !envoi?.erreur)}
          pct={envoi ? pourcentage(envoi) : null}
        />
      </form>
      {personnalisee ? (
        <form
          action={changerImageChambre}
          onSubmit={(e) => {
            if (!window.confirm(`Retirer ${nom} ? ${champ === "logo" ? "Le logo par défaut de la Chambre" : "Le dégradé aux couleurs de la Chambre"} reprendra sa place.`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="champ" value={champ} />
          <input type="hidden" name={`retirer-${champ}`} value="1" />
          <Retirer libelle={`Retirer ${nom}`} />
        </form>
      ) : null}
    </div>
  );
}

// Un champ fichier caché, rempli avec le fichier choisi, pour l'envoyer avec le formulaire
function FichierDeSecours({ name, fichier }: { name: string; fichier: File }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const dt = new DataTransfer();
    dt.items.add(fichier);
    ref.current.files = dt.files;
  }, [fichier]);
  return <input ref={ref} type="file" name={name} className="hidden" tabIndex={-1} aria-hidden />;
}
