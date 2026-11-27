"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import jsQR from "jsqr";
import {
  CameraOff,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock,
  ExternalLink,
  Info,
  Keyboard,
  ScanLine,
  Users,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { StatusPill } from "@/components/ui";
import {
  historiqueAccueil,
  pointerParCode,
  type ArriveeAccueil,
  type ResultatScan,
} from "@/lib/actions/events";
import { initialesDe } from "@/lib/avatars";

const REPOS_MS = 2500;
const CADENCE_MS = 160;
const LARGEUR_ANALYSE = 640;
const ANNONCE_MS = 2000;

function heure(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(":", " h ");
}

interface Detecteur {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

export function ScannerQr({
  eventId,
  termine,
}: {
  eventId: string;
  termine: boolean;
}) {
  return (
    <Modal
      title="Scanner les QR codes"
      largeur="max-w-[560px]"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          disabled={termine}
          title={termine ? "L’événement est terminé" : undefined}
          className="btn-action btn-action-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ScanLine size={15} /> Scanner les QR codes
        </button>
      )}
    >
      {() => <Lecteur eventId={eventId} />}
    </Modal>
  );
}

function Lecteur({ eventId }: { eventId: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<"demarrage" | "active" | "indisponible">(
    "demarrage",
  );
  const [motif, setMotif] = useState("");
  const [saisie, setSaisie] = useState("");
  const [enCours, demarrer] = useTransition();

  const [arrivees, setArrivees] = useState<ArriveeAccueil[] | null>(null);
  const [refus, setRefus] = useState<
    { id: number; code: string; message: string }[]
  >([]);
  const [annonce, setAnnonce] = useState<
    (ResultatScan & { id: number }) | null
  >(null);
  const [ouverte, setOuverte] = useState<string | null>(null);

  const occupe = useRef(false);
  const pause = useRef(false);
  const minuterieAnnonce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const derniere = useRef<{ code: string; vu: number } | null>(null);
  const compteur = useRef(0);

  useEffect(() => {
    let annule = false;
    historiqueAccueil(eventId)
      .then((liste) => {
        if (!annule) setArrivees(liste);
      })
      .catch(() => {
        if (!annule) setArrivees([]);
      });
    return () => {
      annule = true;
      clearTimeout(minuterieAnnonce.current);
    };
  }, [eventId]);

  const annoncer = useCallback((r: ResultatScan) => {
    clearTimeout(minuterieAnnonce.current);
    pause.current = true;
    setAnnonce({ ...r, id: ++compteur.current });
    minuterieAnnonce.current = setTimeout(() => {
      setAnnonce(null);
      pause.current = false;
    }, ANNONCE_MS);
  }, []);

  const pointer = useCallback(
    (lu: string) => {
      const code = lu.trim();
      if (!code || occupe.current || pause.current) return;
      occupe.current = true;
      demarrer(async () => {
        let r: ResultatScan;
        try {
          r = await pointerParCode(eventId, code);
        } catch {
          r = {
            etat: "erreur",
            code,
            message: "Le pointage n’a pas abouti. Réessayez.",
          };
        } finally {
          occupe.current = false;
        }
        annoncer(r);
        if (r.etat === "erreur") {
          navigator.vibrate?.([60, 60, 60]);
          setRefus((liste) =>
            [
              { id: ++compteur.current, code: r.code, message: r.message },
              ...liste,
            ].slice(0, 3),
          );
          return;
        }
        if (r.etat === "present") navigator.vibrate?.(90);
        const arrivee = r.arrivee;
        setArrivees((liste) => {
          const autres = (liste ?? [])
            .filter((a) => a.id !== arrivee.id)
            .map((a) => ({
              ...a,
              inscrits: a.inscrits.map((i) =>
                i.id === arrivee.id ? { ...i, statut: "present" as const } : i,
              ),
            }));
          const deja = liste?.find((a) => a.id === arrivee.id);
          return deja && r.etat === "deja"
            ? (liste ?? [])
            : [arrivee, ...autres];
        });
      });
    },
    [eventId, annoncer],
  );

  useEffect(() => {
    let flux: MediaStream | null = null;
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    let arrete = false;

    const toile = document.createElement("canvas");
    const ctx = toile.getContext("2d", { willReadFrequently: true });
    const Natif = (
      window as unknown as {
        BarcodeDetector?: new (o: { formats: string[] }) => Detecteur;
      }
    ).BarcodeDetector;
    const natif = Natif ? new Natif({ formats: ["qr_code"] }) : null;

    const analyser = async () => {
      if (arrete) return;
      const v = video.current;
      if (
        v &&
        v.readyState >= 2 &&
        v.videoWidth &&
        !occupe.current &&
        !pause.current
      ) {
        try {
          let lu: string | null = null;
          if (natif) {
            lu = (await natif.detect(v))[0]?.rawValue ?? null;
          } else if (ctx) {
            const echelle = Math.min(1, LARGEUR_ANALYSE / v.videoWidth);
            toile.width = Math.round(v.videoWidth * echelle);
            toile.height = Math.round(v.videoHeight * echelle);
            ctx.drawImage(v, 0, 0, toile.width, toile.height);
            const image = ctx.getImageData(0, 0, toile.width, toile.height);
            lu =
              jsQR(image.data, toile.width, toile.height, {
                inversionAttempts: "dontInvert",
              })?.data ?? null;
          }
          if (lu) {
            const code = lu.trim();
            const vu = derniere.current;
            if (vu && vu.code === code && Date.now() - vu.vu < REPOS_MS) {
              vu.vu = Date.now();
            } else {
              derniere.current = { code, vu: Date.now() };
              pointer(code);
            }
          }
        } catch {}
      }
      minuterie = setTimeout(analyser, CADENCE_MS);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera("indisponible");
        setMotif(
          "La caméra n’est accessible que sur une adresse sécurisée (https) ou sur cet ordinateur.",
        );
        return;
      }
      try {
        flux = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (arrete) {
          flux.getTracks().forEach((p) => p.stop());
          return;
        }
        const v = video.current;
        if (v) {
          v.srcObject = flux;
          await v.play().catch(() => {});
        }
        setCamera("active");
        analyser();
      } catch (e) {
        setCamera("indisponible");
        setMotif(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "L’accès à la caméra a été refusé. Autorisez-le dans le navigateur, ou saisissez le code."
            : "Aucune caméra disponible. Saisissez le code du billet.",
        );
      }
    })();

    return () => {
      arrete = true;
      clearTimeout(minuterie);
      flux?.getTracks().forEach((p) => p.stop());
    };
  }, [pointer]);

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="relative aspect-[4/3] rounded-[var(--radius-m)] overflow-hidden bg-[#0f1d2c]">
        <video
          ref={video}
          muted
          playsInline
          className={`w-full h-full object-cover ${camera === "active" ? "" : "invisible"}`}
        />
        {camera === "active" ? (
          <div
            aria-hidden
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-[58%] aspect-square rounded-2xl border-[3px] border-white/85 shadow-[0_0_0_9999px_rgba(15,29,44,0.45)]" />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/85 text-center px-8">
            {camera === "demarrage" ? (
              <>
                <ScanLine size={30} />
                <span className="text-[13.5px]">Ouverture de la caméra…</span>
              </>
            ) : (
              <>
                <CameraOff size={30} />
                <span className="text-[13.5px] leading-relaxed">{motif}</span>
              </>
            )}
          </div>
        )}
        {enCours ? (
          <span className="absolute top-3 left-3 text-[12px] font-semibold text-white bg-black/50 rounded-full px-3 py-1">
            Pointage…
          </span>
        ) : null}
        {annonce ? (
          <Annonce
            key={annonce.id}
            resultat={annonce}
            onFermer={() => {
              clearTimeout(minuterieAnnonce.current);
              setAnnonce(null);
              pause.current = false;
            }}
          />
        ) : null}
      </div>

      <p className="m-0 text-[12.8px] text-muted text-center">
        Placez le QR code du billet dans le cadre : la personne est pointée
        présente dès la lecture.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          pointer(saisie);
          setSaisie("");
        }}
        className="flex gap-2"
      >
        <label className="relative flex-1 min-w-0">
          <span className="sr-only">Code du billet</span>
          <Keyboard
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
          />
          <input
            value={saisie}
            onChange={(e) => setSaisie(e.target.value.toUpperCase())}
            placeholder="Ou saisissez le code : CC-E1-4040"
            autoCapitalize="characters"
            className="w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink pl-9 pr-3 py-2.5 text-[13.5px] font-[family-name:var(--font-mono)] outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={!saisie.trim() || enCours || annonce !== null}
          className="btn-contour btn-contour-sm disabled:opacity-50"
        >
          Valider
        </button>
      </form>

      <section aria-live="polite">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <h3 className="m-0 text-[14px] font-semibold text-ink">
            Historique des arrivées
          </h3>
          {arrivees ? (
            <span className="text-[12px] text-muted tabular-nums">
              {arrivees.length} présent{arrivees.length > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>

        {refus.length ? (
          <ul className="list-none m-0 mb-2 p-0 flex flex-col gap-1.5">
            {refus.map((r, i) => (
              <li
                key={r.id}
                className={`flex items-start gap-2.5 rounded-[var(--radius-s)] bg-bad-soft text-bad px-3 py-2 text-[12.5px] ${i ? "opacity-70" : ""}`}
              >
                <CircleAlert size={15} className="shrink-0 mt-px" />
                <span className="min-w-0">
                  <b className="font-semibold font-[family-name:var(--font-mono)]">
                    {r.code || "Code illisible"}
                  </b>{" "}
                  — {r.message}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {arrivees === null ? (
          <p className="m-0 py-4 text-center text-[12.8px] text-muted">
            Chargement de l’historique…
          </p>
        ) : arrivees.length === 0 ? (
          <p className="m-0 py-4 text-center text-[12.8px] text-muted border border-dashed border-line rounded-[var(--radius-s)]">
            Aucune arrivée pour l’instant : chaque personne pointée s’affichera
            ici.
          </p>
        ) : (
          <ul className="list-none m-0 p-0 max-h-[340px] overflow-y-auto rounded-[var(--radius-s)] border border-line divide-y divide-line">
            {arrivees.map((a) => (
              <LigneArrivee
                key={a.id}
                arrivee={a}
                ouverte={ouverte === a.id}
                onBasculer={() => setOuverte((o) => (o === a.id ? null : a.id))}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Annonce({
  resultat: r,
  onFermer,
}: {
  resultat: ResultatScan;
  onFermer: () => void;
}) {
  const [vide, setVide] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setVide(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const ton =
    r.etat === "present"
      ? {
          barre: "bg-success-strong",
          pastille: "bg-success-soft text-success-strong",
        }
      : r.etat === "deja"
        ? { barre: "bg-warn", pastille: "bg-warn-soft text-warn" }
        : { barre: "bg-bad", pastille: "bg-bad-soft text-bad" };

  return (
    <button
      type="button"
      onClick={onFermer}
      aria-label="Fermer l’annonce"
      className="absolute inset-0 z-10 flex items-center justify-center bg-[#0f1d2c]/70 backdrop-blur-[3px] cursor-pointer"
    >
      <span
        className={`relative w-[84%] max-w-[380px] overflow-hidden rounded-2xl bg-white px-5 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-5 text-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] transition-all duration-200 ${
          vide ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        {r.etat === "erreur" ? (
          <>
            <span className="mx-auto flex h-14 w-14 sm:h-[72px] sm:w-[72px] items-center justify-center rounded-full bg-bad-soft text-bad">
              <CircleAlert size={36} />
            </span>
            <span className="block mt-2.5 sm:mt-3.5 text-[18px] font-bold text-ink">
              Code refusé
            </span>
            <span className="block mt-1 text-[13.5px] text-muted leading-snug">
              {r.message}
            </span>
            {r.code ? (
              <span className="block mt-2 text-[12px] text-faint font-[family-name:var(--font-mono)]">
                {r.code}
              </span>
            ) : null}
          </>
        ) : (
          <>
            <LogoArrivee arrivee={r.arrivee} taille="annonce" />
            <span className="block mt-2.5 sm:mt-3.5 text-[18px] sm:text-[20px] leading-tight font-bold text-ink">
              {r.arrivee.membre?.nom ?? r.arrivee.entreprise}
            </span>
            <span className="block mt-1 text-[14.5px] text-muted">
              {r.arrivee.representant}
            </span>
            <span
              className={`mt-2.5 sm:mt-3.5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-bold ${ton.pastille}`}
            >
              {r.etat === "present" ? (
                <CheckCircle2 size={15} />
              ) : (
                <Info size={15} />
              )}
              {r.etat === "present"
                ? `Présent${r.arrivee.presentLe ? ` · ${heure(r.arrivee.presentLe)}` : ""}`
                : `Déjà pointé${r.arrivee.presentLe ? ` à ${heure(r.arrivee.presentLe)}` : ""}`}
            </span>
          </>
        )}
        <span
          aria-hidden
          className={`absolute bottom-0 left-0 h-1 ${ton.barre} transition-[width] ease-linear`}
          style={{
            width: vide ? "0%" : "100%",
            transitionDuration: `${ANNONCE_MS}ms`,
          }}
        />
      </span>
    </button>
  );
}

const TAILLES_LOGO = {
  annonce: {
    cadre: "w-16 h-16 text-[22px] sm:w-[88px] sm:h-[88px] sm:text-[30px]",
    sizes: "88px",
  },
  ligne: { cadre: "w-[38px] h-[38px] text-[13px]", sizes: "38px" },
} as const;

function LogoArrivee({
  arrivee: a,
  taille,
}: {
  arrivee: ArriveeAccueil;
  taille: keyof typeof TAILLES_LOGO;
}) {
  const m = a.membre;
  const { cadre, sizes } = TAILLES_LOGO[taille];
  if (m?.logo) {
    return (
      <span
        className={`relative mx-auto block shrink-0 overflow-hidden rounded-xl border border-line bg-white ${cadre}`}
      >
        <Image
          src={m.logo}
          alt=""
          fill
          sizes={sizes}
          className="object-contain p-[8%]"
        />
      </span>
    );
  }
  if (m?.photo) {
    return (
      <span
        className={`relative mx-auto block shrink-0 overflow-hidden rounded-full ${cadre}`}
      >
        <Image
          src={m.photo}
          alt=""
          fill
          sizes={sizes}
          className="object-cover"
        />
      </span>
    );
  }
  return (
    <span
      className={`mx-auto flex shrink-0 items-center justify-center rounded-xl bg-accent-soft font-bold text-accent-strong ${cadre}`}
    >
      {initialesDe(m?.nom ?? a.entreprise)}
    </span>
  );
}

const STATUT_INSCRIT = {
  present: { libelle: "Présent", classe: "text-success-strong" },
  a_valider: { libelle: "À valider", classe: "text-faint" },
  confirme: { libelle: "Attendu", classe: "text-muted" },
  absent: { libelle: "Absent", classe: "text-bad" },
} as const;

function LigneArrivee({
  arrivee: a,
  ouverte,
  onBasculer,
}: {
  arrivee: ArriveeAccueil;
  ouverte: boolean;
  onBasculer: () => void;
}) {
  const m = a.membre;
  return (
    <li className={ouverte ? "bg-surface-2" : ""}>
      <button
        type="button"
        onClick={onBasculer}
        aria-expanded={ouverte}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left cursor-pointer hover:bg-surface-2"
      >
        <LogoArrivee arrivee={a} taille="ligne" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-ink">
            {m?.nom ?? a.entreprise}
          </span>
          <span className="block truncate text-[12.3px] text-muted">
            {a.representant}
          </span>
        </span>
        {a.presentLe ? (
          <span className="shrink-0 text-[12px] text-muted tabular-nums">
            {heure(a.presentLe)}
          </span>
        ) : null}
        <ChevronDown
          size={16}
          className={`shrink-0 text-faint transition-transform ${ouverte ? "rotate-180" : ""}`}
        />
      </button>

      {ouverte ? (
        <div className="px-3.5 pb-3.5 pt-1 text-[12.8px]">
          <div className="flex items-center gap-2 flex-wrap">
            {m ? <StatusPill status={m.statut} /> : null}
            {a.code ? (
              <span className="rounded-full bg-surface-3 px-2.5 py-[3px] text-[11.3px] font-semibold text-muted font-[family-name:var(--font-mono)]">
                {a.code}
              </span>
            ) : null}
          </div>

          <dl className="m-0 mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {m ? (
              <>
                <dt className="text-muted">Activité</dt>
                <dd className="m-0 text-ink">
                  {m.secteur} · {m.ville}
                </dd>
              </>
            ) : null}
            <dt className="text-muted">Courriel</dt>
            <dd className="m-0 min-w-0 truncate">
              {a.email && a.email !== "—" ? (
                <a
                  href={`mailto:${a.email}`}
                  className="text-accent no-underline hover:underline"
                >
                  {a.email}
                </a>
              ) : (
                "—"
              )}
            </dd>
            {a.telephone ? (
              <>
                <dt className="text-muted">Téléphone</dt>
                <dd className="m-0">
                  <a
                    href={`tel:${a.telephone.replace(/\s/g, "")}`}
                    className="text-accent no-underline hover:underline"
                  >
                    {a.telephone}
                  </a>
                </dd>
              </>
            ) : null}
            {a.presentLe ? (
              <>
                <dt className="text-muted">Arrivée</dt>
                <dd className="m-0 text-ink inline-flex items-center gap-1">
                  <Clock size={12} className="text-faint" />
                  {heure(a.presentLe)}
                </dd>
              </>
            ) : null}
          </dl>

          {m && a.inscrits.length > 1 ? (
            <div className="mt-3">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted mb-1">
                <Users size={13} /> {a.inscrits.length} représentants inscrits
              </div>
              <ul className="list-none m-0 p-0 flex flex-col gap-0.5">
                {a.inscrits.map((i) => (
                  <li key={i.id} className="flex justify-between gap-3">
                    <span
                      className={
                        i.id === a.id ? "font-semibold text-ink" : "text-ink"
                      }
                    >
                      {i.nom}
                    </span>
                    <span
                      className={`text-[12px] font-semibold ${STATUT_INSCRIT[i.statut].classe}`}
                    >
                      {STATUT_INSCRIT[i.statut].libelle}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {m ? (
            <a
              href={`/admin/membres/${m.id}`}
              target="_blank"
              rel="noopener"
              className="mt-3 inline-flex items-center gap-1.5 text-[12.8px] font-semibold text-accent no-underline hover:underline"
            >
              Ouvrir la fiche du membre <ExternalLink size={13} />
            </a>
          ) : (
            <p className="m-0 mt-2.5 text-[12px] text-faint">
              {a.code
                ? "Inscription publique, sans compte : pas de fiche membre."
                : "Ajouté par l’équipe à l’accueil : pas de fiche membre."}
            </p>
          )}
        </div>
      ) : null}
    </li>
  );
}
