"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { ArrowUpRight, Building2, Mail, MapPin, Phone } from "lucide-react";
import { Modal } from "@/components/Modal";
import { ModalBody } from "@/components/form-bits";
import { affichageSite } from "@/lib/liens";
import { positionObjet } from "@/lib/cadrage";
import type { Offer } from "@/lib/types";

export function ModaleOffre({
  offre,
  children,
}: {
  offre: Offer;
  children: ReactNode;
}) {
  return (
    <Modal
      title="Offre entre membres"
      largeur="max-w-[680px]"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          aria-label={`Voir l’offre « ${offre.titre} » de ${offre.membre}`}
          className="block w-full h-full text-left cursor-pointer bg-transparent border-0 p-0"
        >
          {children}
        </button>
      )}
    >
      {() => <Detail offre={offre} />}
    </Modal>
  );
}

function Detail({ offre: o }: { offre: Offer }) {
  return (
    <>
      <ModalBody>
        {o.cover ? (
          <div className="relative aspect-[16/9] rounded-[var(--radius-m)] overflow-hidden border border-line bg-surface-3">
            <Image
              src={o.cover}
              alt=""
              fill
              sizes="(max-width: 700px) 100vw, 640px"
              className="object-cover"
              style={
                o.cadrage
                  ? { objectPosition: positionObjet(o.cadrage) }
                  : undefined
              }
            />
          </div>
        ) : null}

        <div>
          <h3 className="m-0 text-[18px] font-semibold leading-snug text-ink [overflow-wrap:anywhere]">
            {o.titre}
          </h3>
          <p className="m-0 mt-1 text-[13px] text-muted">
            Proposée par <span className="font-semibold">{o.membre}</span>
          </p>
          {o.prix ? (
            <p className="m-0 mt-2 text-[16px] font-bold text-accent [overflow-wrap:anywhere]">{o.prix}</p>
          ) : null}
        </div>

        <p className="m-0 text-[14.2px] leading-relaxed text-muted whitespace-pre-line [overflow-wrap:anywhere]">
          {o.desc}
        </p>

        <div className="rounded-[var(--radius-m)] border border-line bg-surface-2 p-4">
          <div className="flex items-center gap-3">
            {o.membreLogo ? (
              <Image
                src={o.membreLogo}
                alt=""
                width={44}
                height={44}
                sizes="44px"
                className="w-11 h-11 rounded-[var(--radius-s)] object-contain bg-white border border-line shrink-0"
              />
            ) : (
              <span className="w-11 h-11 rounded-[var(--radius-s)] border border-line bg-surface text-faint flex items-center justify-center shrink-0">
                <Building2 size={18} />
              </span>
            )}
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-ink leading-snug [overflow-wrap:anywhere]">
                {o.membre}
              </div>
              <div className="text-[12.3px] text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
                {o.membreSecteur ? <span>{o.membreSecteur}</span> : null}
                {o.membreSecteur && o.membreVille ? (
                  <span aria-hidden>·</span>
                ) : null}
                {o.membreVille ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} /> {o.membreVille}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {o.contact ? (
            <div className="mt-3.5 pt-3.5 border-t border-line">
              <div className="text-[13.5px] font-semibold text-ink">
                {o.contact.nom}
              </div>
              <div className="text-[12.3px] text-muted">
                {o.contact.fonction}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
                <a
                  href={`mailto:${o.contact.email}`}
                  className="inline-flex items-center gap-1.5 text-ink no-underline hover:text-accent [overflow-wrap:anywhere]"
                >
                  <Mail size={13} className="shrink-0" /> {o.contact.email}
                </a>
                {o.contact.tel ? (
                  <a
                    href={`tel:${o.contact.tel}`}
                    className="inline-flex items-center gap-1.5 text-ink no-underline hover:text-accent"
                  >
                    <Phone size={13} className="shrink-0" /> {o.contact.tel}
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </ModalBody>

      {o.membreSite || o.lien ? (
        <div className="sticky bottom-0 flex items-center justify-end gap-2.5 border-t border-line bg-surface px-5 py-4">
          {o.membreSite ? (
            <a
              href={o.membreSite}
              target="_blank"
              rel="noopener noreferrer"
              className="mr-auto inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted no-underline hover:text-ink"
            >
              {affichageSite(o.membreSite)}
            </a>
          ) : null}
          {o.lien ? (
            <a
              href={o.lien}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-action btn-action-sm no-underline"
            >
              En profiter <ArrowUpRight size={15} />
            </a>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
