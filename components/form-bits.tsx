"use client";

import { useFormStatus } from "react-dom";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Check, ImagePlus, LoaderCircle } from "lucide-react";
import {
  JetonsEnvoyes,
  pourcentage,
  useEnvois,
  type Envoi,
} from "@/components/EnvoisSuivis";

export const INPUT =
  "w-full border border-line-champ bg-surface text-ink rounded-[var(--radius-s)] px-3 py-[9px] text-[13.6px] disabled:opacity-60";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[12.3px] font-semibold text-muted mb-1.5">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="block text-[11.5px] text-faint mt-1">{hint}</span>
      ) : null}
    </label>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  sm = false,
  className = "",
  disabled = false,
  ...rest
}: ComponentProps<"button"> & {
  pendingLabel?: string;
  variant?: "primary" | "line" | "ghost" | "danger";
  sm?: boolean;
}) {
  const { pending } = useFormStatus();

  const variants = {
    primary: "btn-action",
    line: "bg-transparent border-line text-ink hover:border-faint hover:bg-surface-2",
    ghost:
      "bg-transparent border-transparent text-muted hover:text-ink hover:bg-surface-2",
    danger: "bg-bad text-white border-transparent hover:opacity-90",
  };
  const primaire = variant === "primary";
  const size = primaire
    ? sm
      ? "btn-action-sm"
      : ""
    : sm
      ? "text-[12.4px] px-[11px] py-1.5"
      : "text-[13.4px] px-[15px] py-[9px]";

  const base = primaire
    ? ""
    : "inline-flex items-center gap-[7px] rounded-[var(--radius-s)] font-semibold cursor-pointer border no-underline whitespace-nowrap transition-colors";

  return (
    <button
      type="submit"
      {...rest}
      disabled={pending || disabled}
      className={`${base} disabled:opacity-60 disabled:cursor-wait ${size} ${variants[variant]} ${className}`}
    >
      {pending ? (
        <>
          <LoaderCircle
            size={14}
            aria-hidden
            className="animate-spin shrink-0"
          />
          {pendingLabel ?? "Envoi…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="px-5 py-4 border-t border-line flex flex-wrap justify-end gap-2.5">
      {children}
    </div>
  );
}

export function ModalBody({ children }: { children: ReactNode }) {
  return <div className="px-5 py-5 flex flex-col gap-3.5">{children}</div>;
}

export function VoileEnvoi({ envoi }: { envoi: Envoi }) {
  const pct = pourcentage(envoi);
  return (
    <span
      role="status"
      aria-live="polite"
      className={`absolute inset-0 flex flex-col items-center justify-center gap-1 text-white transition-colors duration-300 ${
        envoi.termine && !envoi.erreur ? "bg-black/0" : "bg-[#0f1d2c]/55"
      }`}
    >
      {envoi.erreur ? (
        <span className="px-2 text-center text-[11.5px] font-semibold leading-tight">
          Envoi interrompu — elle partira avec le formulaire
        </span>
      ) : envoi.termine ? (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f7a45] shadow">
          <Check size={17} aria-label="Photo prête" />
        </span>
      ) : (
        <span className="text-[20px] font-bold tabular-nums drop-shadow">
          {pct} %
        </span>
      )}
      {!envoi.termine ? (
        <span className="absolute inset-x-0 bottom-0 h-1.5 bg-white/25">
          <span
            className="block h-full bg-[#7ee2a8] transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
        </span>
      ) : null}
    </span>
  );
}

export function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-[7px] rounded-[var(--radius-s)] font-semibold cursor-pointer border border-line bg-transparent text-ink hover:bg-surface-2 text-[13.4px] px-[15px] py-[9px]"
    >
      Annuler
    </button>
  );
}

export function FermerApresEnvoi({ fermer }: { fermer: () => void }) {
  const { pending } = useFormStatus();
  const enCours = useRef(false);
  useEffect(() => {
    if (pending) enCours.current = true;
    else if (enCours.current) {
      enCours.current = false;
      fermer();
    }
  }, [pending, fermer]);
  return null;
}

export function ChampPhoto({
  name,
  retirer,
  apercu,
  libelle = "Photo",
  aide = "JPEG, PNG ou WebP. Elle est redimensionnée à l’envoi.",
  ratio = "aspect-[16/9]",
  rond = false,
  entier = false,
  large = false,
}: {
  name: string;
  retirer?: string;
  apercu?: string | null;
  libelle?: string;
  aide?: string;
  ratio?: string;
  rond?: boolean;
  /** Montrer l'image en entier (un logo), sans la recadrer */
  entier?: boolean;
  /** Aperçu sur toute la largeur (une couverture), bouton en dessous */
  large?: boolean;
}) {
  const [choisie, setChoisie] = useState<string | null>(null);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [retiree, setRetiree] = useState(false);
  const vue = choisie ?? (retiree ? null : (apercu ?? null));
  const { etats, jetons } = useEnvois(fichiers);
  const envoi = etats[0];

  return (
    <div>
      <span className="block text-[12.3px] font-semibold text-muted mb-1.5">
        {libelle}
      </span>
      <div className={large ? "flex flex-col gap-3" : "flex gap-4 items-center flex-wrap sm:flex-nowrap"}>
        <div
          className={`shrink-0 border border-line bg-surface-2 overflow-hidden flex items-center justify-center ${
            rond
              ? "w-[112px] h-[112px] rounded-full"
              : `${ratio} w-full ${large ? "" : "sm:w-[220px]"} rounded-[var(--radius-m)] ${entier ? "bg-white" : ""}`
          }`}
        >
          {vue ? (
            <span className="relative block h-full w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={vue} alt="" className={`w-full h-full ${entier ? "object-contain p-3" : "object-cover"}`} />
              {envoi && !envoi.masque ? <VoileEnvoi envoi={envoi} /> : null}
            </span>
          ) : (
            <span className="flex flex-col items-center gap-1.5 text-faint text-[12px]">
              <ImagePlus size={22} />
              Aucune photo
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          <label className="btn-contour btn-contour-sm text-ink hover:bg-surface-2 cursor-pointer self-start">
            <ImagePlus size={14} />
            {vue ? "Remplacer la photo" : "Ajouter une photo"}
            <input
              type="file"
              name={jetons ? undefined : name}
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setChoisie(f ? URL.createObjectURL(f) : null);
                setFichiers(f ? [f] : []);
                if (f) setRetiree(false);
              }}
            />
          </label>
          <JetonsEnvoyes name={name} jetons={jetons} />
          {retirer && apercu && !choisie ? (
            <label className="flex items-center gap-2 text-[12.8px] text-muted cursor-pointer">
              <input
                type="checkbox"
                name={retirer}
                value="1"
                checked={retiree}
                onChange={(e) => setRetiree(e.target.checked)}
              />
              Retirer la photo actuelle
            </label>
          ) : null}
          <span className="text-[11.8px] text-faint">{aide}</span>
        </div>
      </div>
    </div>
  );
}
