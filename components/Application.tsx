"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Download, Share, SquarePlus } from "lucide-react";
import { Modal } from "@/components/Modal";
import { ModalBody } from "@/components/form-bits";

const EN_APPLICATION = "(display-mode: standalone)";

function suivreMode(rappel: () => void) {
  const requete = window.matchMedia(EN_APPLICATION);
  requete.addEventListener("change", rappel);
  return () => requete.removeEventListener("change", rappel);
}

export function lireMode(): boolean {
  return (
    window.matchMedia(EN_APPLICATION).matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

export function useDansApplication(): boolean {
  return useSyncExternalStore(suivreMode, lireMode, () => false);
}

interface InvitationInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let invitation: InvitationInstallation | null = null;
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((rappel) => rappel());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (evenement) => {
    evenement.preventDefault();
    invitation = evenement as InvitationInstallation;
    prevenir();
  });
  window.addEventListener("appinstalled", () => {
    invitation = null;
    prevenir();
  });
}

function suivreInvitation(rappel: () => void) {
  abonnes.add(rappel);
  return () => {
    abonnes.delete(rappel);
  };
}

type Consigne = "ios" | "mac" | null;

export function lireConsigne(): Consigne {
  const ua = navigator.userAgent;
  const ipad =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/i.test(ua) || ipad) return "ios";
  if (
    /macintosh/i.test(ua) &&
    /safari/i.test(ua) &&
    !/chrome|chromium|edg|firefox/i.test(ua)
  ) {
    return "mac";
  }
  return null;
}

export function EnregistrementApplication() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {});
  }, []);
  return null;
}

export function BoutonInstaller() {
  const dansApplication = useDansApplication();
  const inv = useSyncExternalStore(
    suivreInvitation,
    () => invitation,
    () => null,
  );
  const consigne = useSyncExternalStore(
    () => () => {},
    lireConsigne,
    () => null,
  );
  const [aide, setAide] = useState(false);

  if (dansApplication || (!inv && !consigne)) return null;

  const installer = async () => {
    if (!inv) {
      setAide(true);
      return;
    }
    await inv.prompt();
    await inv.userChoice;
    invitation = null;
    prevenir();
  };

  return (
    <>
      <button
        type="button"
        onClick={installer}
        title="Installer l’application"
        aria-label="Installer l’application"
        className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-2.5 text-[13px] font-semibold text-white transition-colors duration-200 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Download size={16} aria-hidden />
        <span className="hidden sm:inline">Installer l’application</span>
      </button>

      {consigne ? (
        <Modal
          title="Installer l’application"
          ouvert={aide}
          onFermer={() => setAide(false)}
        >
          {() => (
            <ModalBody>
              <p className="m-0 text-[14px] text-muted">
                L’application s’ajoute à vos applications, avec son
                icône : elle s’ouvre directement sur votre espace.
              </p>
              {consigne === "ios" ? (
                <ol className="m-0 flex list-none flex-col gap-3 p-0">
                  <Etape n={1}>
                    Touchez le bouton{" "}
                    <b className="inline-flex items-center gap-1">
                      Partager <Share size={15} aria-hidden />
                    </b>{" "}
                    de Safari — en bas de l’écran sur iPhone, en haut sur iPad.
                  </Etape>
                  <Etape n={2}>
                    Choisissez{" "}
                    <b className="inline-flex items-center gap-1">
                      Sur l’écran d’accueil <SquarePlus size={15} aria-hidden />
                    </b>
                    .
                  </Etape>
                  <Etape n={3}>
                    Touchez <b>Ajouter</b> : l’icône rejoint vos
                    applications.
                  </Etape>
                </ol>
              ) : (
                <ol className="m-0 flex list-none flex-col gap-3 p-0">
                  <Etape n={1}>
                    Dans la barre des menus de Safari, ouvrez <b>Fichier</b>.
                  </Etape>
                  <Etape n={2}>
                    Choisissez <b>Ajouter au Dock</b>, puis confirmez.
                  </Etape>
                </ol>
              )}
            </ModalBody>
          )}
        </Modal>
      ) : null}
    </>
  );
}

function Etape({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3 text-[14.5px] leading-snug text-ink">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold text-accent">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

export function LienSite({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const dansApplication = useDansApplication();
  if (dansApplication) return <span className={className}>{children}</span>;
  return (
    <Link href="/" aria-label="Accueil" className={className}>
      {children}
    </Link>
  );
}

export function RenvoiApplication() {
  const dansApplication = useDansApplication();
  const chemin = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!dansApplication) return;
    const evenement = chemin.match(/^\/evenements\/([^/]+)/);
    const actualite = chemin.match(/^\/actualites\/([^/]+)/);
    router.replace(
      evenement
        ? `/membre/evenements/${evenement[1]}`
        : actualite
          ? `/membre/actualites/${actualite[1]}`
          : "/auth",
    );
  }, [dansApplication, chemin, router]);

  return null;
}
