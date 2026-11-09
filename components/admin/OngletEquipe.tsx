// Onglet « Équipe & accès » d'Abonnement & utilisateurs : promouvoir un compte existant, l'équipe et ses rôles
import Link from "next/link";
import { Lock, Search } from "lucide-react";
import { Panneau, Vide } from "@/components/admin/ui";
import { FiltresAuto } from "@/components/FiltresAuto";
import {
  CarteEquipier,
  PromouvoirButton,
} from "@/components/forms/EquipeForms";
import { Pastille } from "@/components/messagerie/outils";
import { StatusPill } from "@/components/ui";
import { estAdministrateur } from "@/lib/autorisations";
import { initialesDe } from "@/lib/avatars";
import { fmtDate } from "@/lib/format";
import {
  chercherComptes,
  getAdministrateurs,
  type CompteMembre,
} from "@/lib/queries-admin";
import { getCurrentUser } from "@/lib/session";

export async function OngletEquipe({ q }: { q?: string }) {
  const moi = await getCurrentUser("admin");
  const recherche = q?.trim() ?? "";
  const gere = estAdministrateur(moi);

  const [admins, trouves] = await Promise.all([
    getAdministrateurs(),
    gere ? chercherComptes(recherche) : Promise.resolve([]),
  ]);

  return (
    <>
      <div className="flex flex-col gap-4">
        {gere ? (
          <div className="flex flex-col gap-4 min-w-0">
            <Panneau
              titre="Promouvoir un compte existant"
              sousTitre="Quelqu’un qui a déjà un compte de membre et rejoint l’équipe"
              teinte="bleu"
              corpsClassName="px-6 pb-3"
            >
              <FiltresAuto action="/admin/abonnement" className="relative mb-4">
                <input type="hidden" name="onglet" value="equipe" />
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
                />
                <input
                  type="search"
                  name="q"
                  defaultValue={recherche}
                  placeholder="Nom, adresse courriel, entreprise…"
                  aria-label="Chercher un compte"
                  className="w-full max-w-[420px] rounded-[var(--radius-s)] border border-line bg-surface text-ink pl-9 pr-3 py-2.5 text-[13.5px] outline-none focus:border-accent"
                />
              </FiltresAuto>

              {!recherche ? (
                <p className="m-0 pb-3 text-[13px] text-muted">
                  Tapez quelques lettres pour retrouver un compte.
                </p>
              ) : trouves.length ? (
                <ul className="list-none m-0 p-0">
                  {trouves.map((c) => (
                    <Inscription key={c.id} compte={c} />
                  ))}
                </ul>
              ) : (
                <Vide icone={<Search size={26} />}>
                  Aucun compte ne correspond à « {recherche} ».
                </Vide>
              )}
            </Panneau>
          </div>
        ) : (
          <Panneau titre="Votre rôle : manager" teinte="bleu">
            <div className="flex gap-3 items-start pb-2">
              <Lock size={18} className="text-faint shrink-0 mt-0.5" />
              <p className="m-0 text-[13.4px] text-muted">
                Vous avez accès à tout le back-office — membres, paiements,
                événements, contenus, messagerie —, sauf à la gestion de
                l’équipe : ajouter quelqu’un, changer son rôle ou retirer son
                accès revient à un administrateur.
              </p>
            </div>
          </Panneau>
        )}

        <Panneau
          titre="L’équipe"
          sousTitre={`${admins.length} compte${admins.length > 1 ? "s" : ""} avec accès au back-office`}
          teinte="degrade"
          corpsClassName="px-6 pb-3"
        >
          <ul className="list-none m-0 p-0 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {admins.map((a) => (
              <li key={a.id} className="min-w-0">
                <CarteEquipier
                  compte={a}
                  cestMoi={a.id === moi.id}
                  gere={gere}
                />
              </li>
            ))}
          </ul>
          <p className="m-0 mt-4 mb-3 text-[12px] text-faint">
            Un administrateur ne peut ni retirer son propre accès ni changer son
            propre rôle : la plateforme en garde toujours au moins un.
          </p>
        </Panneau>
      </div>
    </>
  );
}

function Inscription({ compte: c }: { compte: CompteMembre }) {
  return (
    <li className="flex gap-3.5 py-3.5 border-t border-line first:border-t-0 flex-wrap sm:flex-nowrap">
      <Pastille
        src={c.photo}
        alt=""
        initiales={initialesDe(c.nom)}
        taille={40}
        className="bg-accent-soft text-accent-strong"
      />
      <div className="min-w-0 flex-1 basis-[220px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14.5px] font-semibold text-ink">{c.nom}</span>
          {c.membre ? <StatusPill status={c.membre.statut} /> : null}
        </div>
        <div className="text-[12.8px] text-muted truncate">
          {c.email}
          {c.fonction ? ` · ${c.fonction}` : ""}
          {c.tel ? ` · ${c.tel}` : ""}
        </div>
        {c.membre ? (
          <div className="text-[12.8px] text-muted">
            <Link
              href={`/admin/membres/${c.membre.id}`}
              className="text-accent font-semibold no-underline hover:underline"
            >
              {c.membre.nom}
            </Link>
          </div>
        ) : null}
        {c.membre?.motivation ? (
          <p className="m-0 mt-1 text-[12.5px] text-muted line-clamp-2">
            « {c.membre.motivation} »
          </p>
        ) : null}
        <div className="text-[11.5px] text-faint mt-1">
          Inscrit le {fmtDate(c.depuis)}
        </div>
      </div>
      <div className="flex items-start gap-2 flex-wrap shrink-0">
        {c.membre ? (
          <Link
            href={`/admin/membres/${c.membre.id}`}
            className="btn-contour btn-contour-sm text-ink no-underline hover:bg-surface-2"
          >
            Voir la fiche
          </Link>
        ) : null}
        <PromouvoirButton
          userId={c.id}
          nom={c.nom}
          email={c.email}
          entreprise={c.membre?.nom}
          ficheEffacable={Boolean(
            c.membre?.sansHistorique && c.membre.statut === "candidature",
          )}
        />
      </div>
    </li>
  );
}
