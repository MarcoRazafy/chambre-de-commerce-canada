"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { House, RotateCw } from "lucide-react";
import { Incident } from "@/components/Incident";

export function IncidentErreur({
  error,
  retry,
  accueil,
  pleinEcran = false,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  accueil: string;
  pleinEcran?: boolean;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Incident
      pleinEcran={pleinEcran}
      illustration={
        <Image
          src="/marque/illustration-incident.png"
          alt=""
          width={880}
          height={756}
          priority
          sizes="(max-width: 460px) 64vw, 280px"
          className="mx-auto w-[min(280px,64vw)] h-auto"
        />
      }
      surtitre="Incident"
      titre="Cette page n’a pas pu s’afficher"
      actions={
        <>
          <button
            type="button"
            onClick={() => retry()}
            className="btn-action btn-action-sm"
          >
            <RotateCw size={15} aria-hidden /> Réessayer
          </button>
          <Link
            href={accueil}
            className="inline-flex items-center gap-[7px] rounded-[var(--radius-s)] font-semibold border border-line bg-surface text-ink no-underline text-[13.4px] px-[15px] py-[9px] hover:border-ink/30 transition-colors"
          >
            <House size={15} aria-hidden /> Retour à l’accueil
          </Link>
        </>
      }
    >
      <p className="m-0">
        Un problème est survenu de notre côté. Réessayez dans un instant ; s’il
        persiste, écrivez à l’équipe de la Chambre.
      </p>
      {error.digest ? (
        <p className="m-0 mt-3 text-[12px] text-faint">
          Référence à communiquer :{" "}
          <code className="font-mono text-muted select-all">
            {error.digest}
          </code>
        </p>
      ) : null}
    </Incident>
  );
}
