"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Underline,
  X,
} from "lucide-react";
import { TAILLES, lienSur, type Ligne, type Taille } from "@/lib/blocs";
import { ChoixCouleur } from "./ChoixCouleur";
import {
  TAILLE_NAVIGATEUR,
  enHex,
  garderSelection,
  lignesDepuis,
  poserLignes,
  rendreSelection,
} from "./texte-riche-dom";

const BOUTON =
  "flex h-8 min-w-8 items-center justify-center rounded-[var(--radius-s)] px-1.5 text-muted hover:bg-surface-3 hover:text-ink";
const ENFONCE =
  "bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent";

function Outil({
  libelle,
  enfonce = false,
  onClick,
  children,
}: {
  libelle: string;
  enfonce?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={libelle}
      aria-label={libelle}
      aria-pressed={enfonce}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`${BOUTON} ${enfonce ? ENFONCE : ""}`}
    >
      {children}
    </button>
  );
}

interface Etat {
  g: boolean;
  i: boolean;
  s: boolean;
  ul: boolean;
  ol: boolean;
}
const NEUTRE: Etat = { g: false, i: false, s: false, ul: false, ol: false };

export function TexteRiche({
  lignes,
  onChange,
  actif,
}: {
  lignes: Ligne[];
  onChange: (lignes: Ligne[]) => void;
  actif: boolean;
}) {
  const zone = useRef<HTMLDivElement>(null);
  const depart = useRef(lignes);
  const memoire = useRef<Range | null>(null);
  const [etat, setEtat] = useState(NEUTRE);
  const [vide, setVide] = useState(() => !lignes.length);
  const [volet, setVolet] = useState<"lien" | null>(null);
  const [adresse, setAdresse] = useState("");
  const [refus, setRefus] = useState("");

  useEffect(() => {
    if (zone.current) poserLignes(zone.current, depart.current);
  }, []);

  useEffect(() => {
    const suivre = () => {
      const selection = document.getSelection();
      const z = zone.current;
      if (!z || !selection?.rangeCount || !z.contains(selection.anchorNode)) {
        return;
      }
      memoire.current = selection.getRangeAt(0).cloneRange();
      const suite: Etat = {
        g: document.queryCommandState("bold"),
        i: document.queryCommandState("italic"),
        s: document.queryCommandState("underline"),
        ul: document.queryCommandState("insertUnorderedList"),
        ol: document.queryCommandState("insertOrderedList"),
      };
      setEtat((avant) =>
        (Object.keys(suite) as (keyof Etat)[]).every(
          (k) => avant[k] === suite[k],
        )
          ? avant
          : suite,
      );
    };
    document.addEventListener("selectionchange", suivre);
    return () => document.removeEventListener("selectionchange", suivre);
  }, []);

  const relire = () => {
    const z = zone.current;
    if (!z) return;
    setVide(!z.textContent?.trim() && !z.querySelector("li"));
    onChange(lignesDepuis(z));
  };

  const retrouver = () => {
    const z = zone.current;
    if (!z) return;
    z.focus();
    const selection = document.getSelection();
    if (memoire.current && selection) {
      selection.removeAllRanges();
      selection.addRange(memoire.current);
    }
  };

  const commande = (nom: string, valeur?: string) => {
    const z = zone.current;
    if (!z) return;
    retrouver();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("defaultParagraphSeparator", false, "div");
    const gardee = nom.startsWith("insert") ? garderSelection(z) : null;
    document.execCommand(nom, false, valeur);
    if (gardee) rendreSelection(z, gardee);
    relire();
  };

  const colorer = (couleur: string) => commande("foreColor", couleur);

  const lier = () => {
    const lien = lienSur(adresse);
    if (!lien) {
      setRefus("Adresse non reconnue. Exemple : https://www.entreprise.com");
      return;
    }
    if (memoire.current?.collapsed ?? true) {
      setRefus("Sélectionnez d’abord le texte à transformer en lien.");
      return;
    }
    commande("createLink", lien);
    setVolet(null);
    setAdresse("");
    setRefus("");
  };

  const filet = <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />;

  return (
    <div>
      {actif ? (
        <div className="sticky top-[72px] z-20 mb-2 rounded-[var(--radius-m)] border border-line bg-surface shadow-[0_8px_20px_-14px_rgb(15_29_44/0.45)]">
          <div
            role="toolbar"
            aria-label="Mise en forme du texte"
            className="flex flex-wrap items-center gap-0.5 px-1.5 py-1"
          >
            <Outil
              libelle="Gras"
              enfonce={etat.g}
              onClick={() => commande("bold")}
            >
              <Bold size={16} />
            </Outil>
            <Outil
              libelle="Italique"
              enfonce={etat.i}
              onClick={() => commande("italic")}
            >
              <Italic size={16} />
            </Outil>
            <Outil
              libelle="Souligné"
              enfonce={etat.s}
              onClick={() => commande("underline")}
            >
              <Underline size={16} />
            </Outil>
            {filet}
            <select
              aria-label="Taille du texte"
              title="Taille du texte"
              value=""
              onChange={(e) => {
                const taille =
                  e.target.value === "normal" ? "" : e.target.value;
                commande("fontSize", TAILLE_NAVIGATEUR[taille as Taille | ""]);
              }}
              className="h-8 cursor-pointer rounded-[var(--radius-s)] border border-line bg-surface px-1.5 text-[12.6px] font-semibold text-ink"
            >
              <option value="" disabled>
                Taille
              </option>
              {TAILLES.map((t) => (
                <option key={t.nom} value={t.valeur || "normal"}>
                  {t.nom}
                </option>
              ))}
            </select>
            <Outil
              libelle="Lien"
              enfonce={volet === "lien"}
              onClick={() => {
                setRefus("");
                setVolet(volet === "lien" ? null : "lien");
              }}
            >
              <Link2 size={16} />
            </Outil>
            {filet}
            <Outil
              libelle="Liste à tirets"
              enfonce={etat.ul}
              onClick={() => commande("insertUnorderedList")}
            >
              <List size={16} />
            </Outil>
            <Outil
              libelle="Liste numérotée"
              enfonce={etat.ol}
              onClick={() => commande("insertOrderedList")}
            >
              <ListOrdered size={16} />
            </Outil>
            {filet}
            <Outil
              libelle="Aligner à gauche"
              onClick={() => commande("justifyLeft")}
            >
              <AlignLeft size={16} />
            </Outil>
            <Outil libelle="Centrer" onClick={() => commande("justifyCenter")}>
              <AlignCenter size={16} />
            </Outil>
            <Outil
              libelle="Aligner à droite"
              onClick={() => commande("justifyRight")}
            >
              <AlignRight size={16} />
            </Outil>
          </div>

          <ChoixCouleur
            libelle="Couleur du texte"
            onChoisir={(couleur) => {
              const base = zone.current
                ? enHex(getComputedStyle(zone.current).color)
                : null;
              colorer(couleur ?? base ?? "#0f1d2c");
            }}
            className="border-t border-line px-2.5 py-2"
          />

          {volet === "lien" ? (
            <div className="border-t border-line px-2.5 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="url"
                  inputMode="url"
                  aria-label="Adresse du lien"
                  placeholder="https://…"
                  value={adresse}
                  autoFocus
                  onChange={(e) => setAdresse(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      lier();
                    }
                  }}
                  className="h-8 min-w-[180px] flex-1 rounded-[var(--radius-s)] border border-line bg-surface px-2.5 text-[13px] text-ink"
                />
                <button
                  type="button"
                  onClick={lier}
                  className="h-8 rounded-[var(--radius-s)] bg-accent px-3 text-[12.6px] font-semibold text-white hover:bg-accent-strong"
                >
                  Appliquer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    commande("unlink");
                    setVolet(null);
                  }}
                  className="h-8 rounded-[var(--radius-s)] border border-line px-2.5 text-[12.6px] font-semibold text-muted hover:text-ink"
                >
                  Retirer le lien
                </button>
                <button
                  type="button"
                  aria-label="Fermer"
                  onClick={() => setVolet(null)}
                  className={BOUTON}
                >
                  <X size={15} />
                </button>
              </div>
              {refus ? (
                <p className="m-0 mt-1.5 text-[12px] font-semibold text-accent">
                  {refus}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        ref={zone}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        aria-label="Texte"
        data-vide={vide ? "oui" : "non"}
        data-invite="Écrivez votre texte…"
        onFocus={() =>
          document.execCommand("defaultParagraphSeparator", false, "div")
        }
        onInput={relire}
        onBlur={relire}
        onPaste={(e) => {
          e.preventDefault();
          const texte = e.clipboardData.getData("text/plain");
          if (texte) document.execCommand("insertText", false, texte);
        }}
        onDrop={(e) => e.preventDefault()}
        className="texte-riche champ-fondu relative min-h-[1.7em]"
      />
    </div>
  );
}
