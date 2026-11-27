"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
