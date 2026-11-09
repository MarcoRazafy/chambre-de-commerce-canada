"use client";

import { useState } from "react";
import { CalendarDays, Mail, Trash2, User } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Pill } from "@/components/ui";
import { retirerContactSeul } from "@/lib/actions/contacts";

export interface ContactSeul {
  id: string;
  prenom: string;
  email: string;
  origine: string;
  depuis: string;
  erreur: boolean;
}

// Un contact sans entreprise (page Contacts) : un clic ouvre sa fiche
export function LigneContactSeul({ contact: a, retour }: { contact: ContactSeul; retour: string }) {
  const [ouvert, setOuvert] = useState(false);
  const nom = a.prenom || a.email;

  const retirer = (
    <form action={retirerContactSeul}>
      <input type="hidden" name="id" value={a.id} />
      <input type="hidden" name="retour" value={retour} />
      <button type="submit" aria-label={`Retirer ${nom}`} title="Retirer"
        className="w-9 h-9 grid place-items-center rounded-[var(--radius-s)] border border-line bg-surface text-muted cursor-pointer hover:text-bad hover:border-bad"><Trash2 size={15} /></button>
    </form>
  );

  return (
    <li
      className="flex items-center gap-3.5 px-6 py-3 border-t border-line cursor-pointer hover:bg-surface-2 transition-colors duration-150"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a,button,dialog,form")) return;
        setOuvert(true);
      }}
    >
      <span className="w-9 h-9 shrink-0 rounded-full bg-surface-2 border border-line text-muted grid place-items-center"><User size={16} aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => setOuvert(true)} className="block p-0 border-0 bg-transparent font-semibold text-ink text-left truncate cursor-pointer hover:text-accent">{nom}</button>
        <a href={`mailto:${a.email}`} className="text-[12.5px] text-accent no-underline hover:underline break-all">{a.email}</a>
      </div>
      <span className="hidden sm:block text-[12px] text-muted whitespace-nowrap">{a.origine} · {a.depuis}</span>
      {a.erreur ? <Pill tone="warn">Adresse en erreur</Pill> : null}
      {retirer}

      <Modal title="Fiche du contact" ouvert={ouvert} onFermer={() => setOuvert(false)}>
        {() => (
          <div className="px-5 py-5 flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <span className="w-[52px] h-[52px] shrink-0 rounded-[var(--radius-s)] bg-surface-2 border border-line text-muted grid place-items-center"><User size={26} aria-hidden /></span>
              <div className="min-w-0">
                <div className="text-[17px] font-semibold text-ink">{nom}</div>
                <div className="text-[13px] text-muted">Contact sans entreprise</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Pill tone="info">Reçoit la newsletter envoyée à tous</Pill>
                  {a.erreur ? <Pill tone="warn">Adresse en erreur</Pill> : null}
                </div>
              </div>
            </div>

            <section className="rounded-[var(--radius-m)] border border-line bg-surface-2 p-4">
              <h4 className="m-0 mb-2.5 text-[11px] uppercase tracking-[0.07em] font-semibold text-faint">Coordonnées</h4>
              <dl className="m-0 grid gap-2 text-[13.4px]">
                <div className="flex items-center gap-2.5">
                  <dt className="sr-only">Courriel</dt>
                  <Mail size={15} className="shrink-0 text-muted" aria-hidden />
                  <dd className="m-0 min-w-0"><a href={`mailto:${a.email}`} className="text-accent no-underline hover:underline break-all">{a.email}</a></dd>
                </div>
                <div className="flex items-center gap-2.5">
                  <dt className="sr-only">Origine</dt>
                  <CalendarDays size={15} className="shrink-0 text-muted" aria-hidden />
                  <dd className="m-0 text-ink">{a.origine}, le {a.depuis}</dd>
                </div>
              </dl>
            </section>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="m-0 text-[12.5px] text-muted">Pour le rattacher à une entreprise, ajoutez-le avec « Ajouter un contact ».</p>
              <form action={retirerContactSeul}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="retour" value={retour} />
                <button type="submit" className="btn-contour btn-contour-sm text-bad"><Trash2 size={14} /> Retirer ce contact</button>
              </form>
            </div>
          </div>
        )}
      </Modal>
    </li>
  );
}
