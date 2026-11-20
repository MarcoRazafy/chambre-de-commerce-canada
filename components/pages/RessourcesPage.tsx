import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Pencil, Plus } from "lucide-react";
import { SupprimerRessourceButton } from "@/components/forms/AdminContenuForms";
import {
  BarrePressePapier,
  BarreSelection,
  BoutonAcces,
  MenuRessource,
} from "@/components/forms/BibliothequeOutils";
import {
  BoutonNouveauDossier,
  CarteDossier,
} from "@/components/forms/DossiersRessources";
import {
  FilDossier,
  RechercheBibliotheque,
  type Filtre,
  type Vue,
} from "@/components/pages/BibliothequeCommun";
import {
  achatRessource,
  FORMULAIRE,
  Lignes,
  VueDossier,
} from "@/components/pages/VueDossier";
import { modesMembres } from "@/lib/reglements";
import { copierRessources } from "@/lib/actions/content";
import { lirePressePapier } from "@/lib/presse-papier";
import {
  getAccesDesRessources,
  getMembresPourAcces,
} from "@/lib/queries-admin";
import { ResourceCard } from "@/components/domain";
import { Card, EmptyState } from "@/components/ui";
import { DownloadResourceButton } from "@/components/forms/ContentForms";
import {
  getArborescenceDossiers,
  getFilDossier,
  getResources,
  getSousDossiers,
  rechercherDossiers,
  type TriBibliotheque,
} from "@/lib/queries";
import type { Space } from "@/lib/types";

export async function RessourcesPage({
  space,
  type = "tout",
  dossier,
  q = "",
  tri: triDemande,
  vue: vueDemandee,
}: {
  space: Space;
  type?: string;
  dossier?: string;
  q?: string;
  tri?: string;
  vue?: string;
}) {
  const admin = space === "admin";
  const actif: Filtre = type === "gratuit" || type === "payant" ? type : "tout";
  const recherche = q.trim();
  const tri: TriBibliotheque = triDemande === "nom" ? "nom" : "date";
  const vue: Vue = vueDemandee === "liste" ? "liste" : "grille";

  const fil = dossier ? await getFilDossier(dossier) : null;
  const dossierId = fil?.length ? fil[fil.length - 1].id : null;

  if (fil?.length && !recherche) {
    return <VueDossier space={space} fil={fil} actif={actif} />;
  }

  const [sousDossiers, list, arborescence, membres, presse] = await Promise.all(
    [
      recherche
        ? rechercherDossiers(recherche, tri)
        : getSousDossiers(dossierId, tri),
      getResources(
        actif === "tout" ? undefined : actif,
        dossierId,
        recherche,
        tri,
      ),
      admin ? getArborescenceDossiers() : Promise.resolve([]),
      admin ? getMembresPourAcces() : Promise.resolve([]),
      admin ? lirePressePapier() : Promise.resolve(null),
    ],
  );

  const acces = admin
    ? await getAccesDesRessources(
        list.filter((r) => r.type === "payant").map((r) => r.id),
      )
    : {};
  const modes = admin ? [] : await modesMembres();

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1 basis-[300px]">
          <h1 className="m-0 text-[28px] font-semibold">Ressources</h1>
        </div>
        <div
          aria-hidden
          className="relative hidden h-[120px] w-[254px] shrink-0 lg:block"
        >
          <span className="absolute inset-x-5 bottom-1 top-2 rounded-[46%_54%_52%_48%/58%_52%_48%_42%] bg-accent-soft" />
          <Image
            src="/marque/illustration-ressources.png"
            alt=""
            width={1100}
            height={550}
            priority
            sizes="254px"
            className="relative h-full w-full object-contain"
          />
        </div>
        {admin ? (
          <div className="flex flex-wrap items-center gap-2">
            <BoutonNouveauDossier parentId={dossierId} membres={membres} />
            <Link
              href={`/admin/ressources/nouvelle${dossierId ? `?dossier=${dossierId}` : ""}`}
              className="btn-action btn-action-sm no-underline"
            >
              <Plus size={15} /> Ajouter une ressource
            </Link>
          </div>
        ) : null}
      </div>

      {fil?.length ? (
        <div className="mb-4">
          <FilDossier space={space} fil={fil} />
        </div>
      ) : null}

      <RechercheBibliotheque
        space={space}
        dossierId={dossierId}
        recherche={recherche}
        actif={actif}
        tri={tri}
        vue={vue}
      />

      {recherche ? (
        <p className="mb-4 text-[13px] text-muted">
          {sousDossiers.length + list.length} résultat
          {sousDossiers.length + list.length > 1 ? "s" : ""} pour «&nbsp;
          {recherche}&nbsp;» — toute la bibliothèque est fouillée, dossiers
          compris.
        </p>
      ) : null}

      {sousDossiers.length ? (
        <section className="mb-7">
          <TitreRubrique titre="Dossiers" nombre={sousDossiers.length} />
          <div
            className={
              vue === "liste"
                ? "grid gap-2.5"
                : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 min-[85rem]:grid-cols-4"
            }
          >
            {sousDossiers.map((d) => (
              <CarteDossier
                key={d.id}
                dossier={d}
                space={space}
                admin={admin}
                arborescence={arborescence}
                membres={membres}
              />
            ))}
          </div>
        </section>
      ) : null}

      <FormulaireListe admin={admin} dossierId={dossierId}>
        {admin && presse ? (
          <BarrePressePapier nombre={presse.ids.length} mode={presse.mode} />
        ) : null}
        {list.length ? (
          <TitreRubrique titre="Documents" nombre={list.length} />
        ) : null}
        {admin && list.length ? (
          <BarreSelection membres={membres} dossierId={dossierId} />
        ) : null}

        {list.length && vue === "liste" ? (
          <Card className="overflow-hidden p-0 [&>ul>li:first-child]:border-t-0">
            <Lignes
              ressources={list}
              ctx={{
                space,
                admin,
                dossierId,
                acces,
                membres,
                arborescence,
                rangeable: false,
                ordonne: false,
                modes,
              }}
            />
          </Card>
        ) : list.length ? (
          <div className="cascade grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.map((r) => (
              <ResourceCard
                key={r.id}
                resource={r}
                coin={
                  admin ? (
                    <label
                      title="Sélectionner"
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius-s)] bg-white/95 shadow-[var(--shadow)]"
                    >
                      <input
                        type="checkbox"
                        name="ressource"
                        value={r.id}
                        aria-label={`Sélectionner « ${r.titre} »`}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                    </label>
                  ) : undefined
                }
                footer={
                  admin ? (
                    <div className="flex w-full items-center gap-1.5">
                      {r.pret ? (
                        <DownloadResourceButton
                          resourceId={r.id}
                          space={space}
                          accessible={r.accessible ?? r.type === "gratuit"}
                          video={r.fmt === "Vidéo"}
                        />
                      ) : (
                        <span className="flex-1 inline-flex items-center gap-1 text-[12px] font-semibold text-accent">
                          <AlertTriangle size={13} /> Fichier manquant
                        </span>
                      )}
                      {r.type === "payant" ? (
                        <BoutonAcces
                          resourceId={r.id}
                          titre={r.titre}
                          acces={acces[r.id] ?? []}
                          membres={membres}
                        />
                      ) : null}
                      <Link
                        href={`/admin/ressources/${r.id}/modifier`}
                        aria-label={`Modifier « ${r.titre} »`}
                        title="Modifier"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-s)] border border-line bg-surface text-muted hover:border-faint hover:text-ink"
                      >
                        <Pencil size={15} />
                      </Link>
                      <MenuRessource
                        id={r.id}
                        titre={r.titre}
                        dossierId={dossierId}
                        rangement={false}
                      />
                      <SupprimerRessourceButton
                        resourceId={r.id}
                        titre={r.titre}
                      />
                    </div>
                  ) : (
                    <div className="flex w-full flex-col gap-1.5">
                      <DownloadResourceButton
                        resourceId={r.id}
                        space={space}
                        accessible={r.accessible ?? r.type === "gratuit"}
                        video={r.fmt === "Vidéo"}
                        achat={achatRessource(r, modes)}
                      />
                    </div>
                  )
                }
              />
            ))}
          </div>
        ) : sousDossiers.length ? null : (
          <EmptyState>
            {recherche
              ? "Aucun document ni dossier ne porte ce nom."
              : dossierId
                ? "Ce dossier est vide."
                : "Aucune ressource dans cette catégorie."}
          </EmptyState>
        )}
      </FormulaireListe>
    </>
  );
}

function TitreRubrique({ titre, nombre }: { titre: string; nombre: number }) {
  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      <h2 className="m-0 text-[19px] font-semibold">{titre}</h2>
      <span className="rounded-full bg-surface-3 px-2.5 py-0.5 text-[12.4px] font-semibold text-muted">
        {nombre}
      </span>
    </div>
  );
}

function FormulaireListe({
  admin,
  dossierId,
  children,
}: {
  admin: boolean;
  dossierId: string | null;
  children: React.ReactNode;
}) {
  if (!admin) return <>{children}</>;
  return (
    <form id={FORMULAIRE} action={copierRessources}>
      <input type="hidden" name="dossier" value={dossierId ?? ""} />
      {children}
    </form>
  );
}
