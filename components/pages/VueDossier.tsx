import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  Lock,
  MessageSquare,
  Pencil,
  Play,
  PlayCircle,
  Plus,
} from "lucide-react";
import { DescriptionRepliable } from "@/components/DescriptionRepliable";
import { Visuel } from "@/components/domain";
import { SupprimerRessourceButton } from "@/components/forms/AdminContenuForms";
import {
  BarrePressePapier,
  BarreSelection,
  BoutonAcces,
  MenuRessource,
  type AccesOuvert,
  type MembreChoisissable,
} from "@/components/forms/BibliothequeOutils";
import { DownloadResourceButton } from "@/components/forms/ContentForms";
import { modesMembres } from "@/lib/reglements";
import type { ModeReglement } from "@/lib/modes-reglement";
import { ListeTriable } from "@/components/forms/ListeTriable";
import {
  BoutonNouveauDossier,
  CommandesDossier,
  type Arborescence,
} from "@/components/forms/DossiersRessources";
import {
  FilDossier,
  RechercheBibliotheque,
  type Filtre,
} from "@/components/pages/BibliothequeCommun";
import { Card, EmptyState, Pill } from "@/components/ui";
import { copierRessources } from "@/lib/actions/content";
import { LOGO_EQUIPE } from "@/lib/avatars";
import { fmtDateShort, fmtMoney, initials } from "@/lib/format";
import { lirePressePapier } from "@/lib/presse-papier";
import {
  getArborescenceDossiers,
  getDossierOuvert,
  getResources,
  getSectionsDossier,
} from "@/lib/queries";
import {
  getAccesDesRessources,
  getMembresPourAcces,
} from "@/lib/queries-admin";
import type {
  MaillonDossier,
  Resource,
  SectionDossier,
  Space,
} from "@/lib/types";

export const FORMULAIRE = "selection-bibliotheque";

export interface Contexte {
  space: Space;
  admin: boolean;
  dossierId: string | null;
  acces: Record<string, AccesOuvert[]>;
  membres: MembreChoisissable[];
  arborescence: Arborescence;
  rangeable: boolean;
  ordonne: boolean;
  modes: ModeReglement[];
}

export function achatRessource(r: Resource, modes: ModeReglement[]) {
  return {
    titre: r.titre,
    somme: fmtMoney(r.prix),
    modes: r.prix > 0 ? modes : [],
  };
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

const aPlat = (s: SectionDossier): Resource[] => [
  ...s.ressources,
  ...s.sections.flatMap(aPlat),
];

const filtrer = (
  s: SectionDossier,
  garder: (r: Resource) => boolean,
): SectionDossier => ({
  ...s,
  ressources: s.ressources.filter(garder),
  sections: s.sections.map((x) => filtrer(x, garder)),
});

export async function VueDossier({
  space,
  fil,
  actif,
}: {
  space: Space;
  fil: MaillonDossier[];
  actif: Filtre;
}) {
  const admin = space === "admin";
  const dossierId = fil[fil.length - 1].id;

  const [
    dossier,
    directes,
    sectionsBrutes,
    arborescence,
    membres,
    presse,
    modes,
  ] = await Promise.all([
    getDossierOuvert(dossierId),
    getResources(undefined, dossierId),
    getSectionsDossier(dossierId),
    admin ? getArborescenceDossiers() : Promise.resolve([]),
    admin ? getMembresPourAcces() : Promise.resolve([]),
    admin ? lirePressePapier() : Promise.resolve(null),
    admin ? Promise.resolve([]) : modesMembres(),
  ]);
  if (!dossier) return null;

  const toutes = [...sectionsBrutes.flatMap(aPlat), ...directes];
  const comptes = {
    tout: toutes.length,
    gratuit: toutes.filter((r) => r.type === "gratuit").length,
    payant: toutes.filter((r) => r.type === "payant").length,
  };
  const garder = (r: Resource) => actif === "tout" || r.type === actif;
  const sections = sectionsBrutes.map((s) => filtrer(s, garder));
  const ressources = directes.filter(garder);
  const affichees = [...sections.flatMap(aPlat), ...ressources];

  const acces = admin
    ? await getAccesDesRessources(
        affichees.filter((r) => r.type === "payant").map((r) => r.id),
      )
    : {};
  const ctx: Contexte = {
    rangeable: admin && actif === "tout",
    ordonne: true,
    space,
    admin,
    dossierId,
    acces,
    membres,
    arborescence,
    modes,
  };

  const terminees = toutes.filter((r) => r.terminee).length;
  const couverture = toutes.find((r) => r.cover);
  const videos = toutes.filter((r) => r.fmt === "Vidéo").length;

  const outils = (
    <RechercheBibliotheque
      space={space}
      dossierId={dossierId}
      recherche=""
      actif={actif}
      comptes={comptes}
      compacte
    />
  );
  const outilsDansLaCarte = !sections.length && ressources.length > 0;

  const ouverte = sections.findIndex((s) => aPlat(s).length > 0);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilDossier space={space} fil={fil} />
        {admin ? (
          <div className="flex flex-wrap items-center gap-2">
            <BoutonNouveauDossier parentId={dossierId} membres={membres} />
            <Link
              href={`/admin/ressources/nouvelle?dossier=${dossierId}`}
              className="btn-action btn-action-sm no-underline"
            >
              <Plus size={15} /> Nouvelle ressource
            </Link>
          </div>
        ) : null}
      </div>

      <section className="relative mb-5 overflow-hidden rounded-[var(--radius-l)] bg-[linear-gradient(135deg,#8b0a1f_0%,#c8102e_26%,#0f1d2c_56%,#1b7e3e_88%,#0f5028_100%)] px-6 py-12 text-center text-white md:py-[68px]">
        {dossier.cover ? (
          <>
            <Image
              src={dossier.cover}
              alt=""
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1200px"
              className="object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(135deg,rgb(139_10_31/0.42)_0%,rgb(15_29_44/0.4)_52%,rgb(15_80_40/0.42)_100%)]"
            />
          </>
        ) : null}
        <div className="relative mx-auto max-w-[720px]">
          <h1 className="m-0 text-[clamp(26px,3.4vw,40px)] leading-[1.15] text-white [overflow-wrap:anywhere] [text-shadow:0_2px_14px_rgb(0_0_0/0.55)]">
            {dossier.nom}
          </h1>
          <p className="m-0 mt-2.5 text-[14.5px] text-white/90 [text-shadow:0_1px_8px_rgb(0_0_0/0.6)]">
            {toutes.length
              ? [
                  pluriel(toutes.length, "ressource"),
                  sectionsBrutes.length
                    ? pluriel(sectionsBrutes.length, "section")
                    : null,
                  videos ? pluriel(videos, "vidéo") : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Ce dossier ne contient encore aucune ressource."}
          </p>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {admin ? (
            <form id={FORMULAIRE} action={copierRessources}>
              <input type="hidden" name="dossier" value={dossierId} />
              {presse ? (
                <BarrePressePapier
                  nombre={presse.ids.length}
                  mode={presse.mode}
                />
              ) : null}
              {affichees.length ? (
                <BarreSelection membres={membres} dossierId={dossierId} />
              ) : null}
            </form>
          ) : null}

          {outilsDansLaCarte ? null : (
            <div className="@container mb-3 flex justify-end">{outils}</div>
          )}

          {sections.length || ressources.length ? (
            <div className="flex flex-col gap-3">
              {sections.map((s, i) => (
                <Section
                  key={s.dossier.id}
                  section={s}
                  ouverte={i === ouverte}
                  ctx={ctx}
                />
              ))}
              {ressources.length ? (
                <Cadre
                  titre={sections.length ? "Autres ressources" : "Ressources"}
                  nombre={ressources.length}
                  ouverte={ouverte === -1}
                  outils={outilsDansLaCarte ? outils : undefined}
                >
                  <Lignes ressources={ressources} ctx={ctx} />
                </Cadre>
              ) : null}
            </div>
          ) : (
            <EmptyState>
              {toutes.length
                ? "Aucune ressource de ce tarif dans ce dossier."
                : "Ce dossier est vide."}
            </EmptyState>
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-[88px]">
          <Card className="p-3.5">
            <Visuel
              src={dossier.cover ?? couverture?.cover}
              alt=""
              seed={dossier.id}
              className="aspect-[16/9] w-full rounded-[var(--radius-s)]"
              sizes="320px"
              cadrage={
                !dossier.cover &&
                couverture &&
                (couverture.fmt === "PDF" || couverture.fmt === "DOCX")
                  ? "object-top"
                  : "object-center"
              }
              icon={<FolderOpen size={28} />}
            />
            {admin ? (
              <div className="mt-3.5 text-[14.5px] font-semibold text-ink">
                {pluriel(toutes.length, "ressource")} dans ce dossier
              </div>
            ) : (
              <>
                <div className="mt-3.5 text-[14.5px] font-semibold text-ink">
                  {terminees > 1
                    ? `${terminees} étapes terminées`
                    : `${terminees} étape terminée`}{" "}
                  sur {toutes.length}
                </div>
                <div
                  role="progressbar"
                  aria-label="Étapes terminées dans ce dossier"
                  aria-valuemin={0}
                  aria-valuemax={toutes.length}
                  aria-valuenow={terminees}
                  className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-3"
                >
                  <div
                    className="h-full rounded-full bg-success transition-[width] duration-500"
                    style={{
                      width: `${toutes.length ? (terminees / toutes.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {videos ? <Pill>{pluriel(videos, "vidéo")}</Pill> : null}
              {toutes.length - videos ? (
                <Pill>{pluriel(toutes.length - videos, "document")}</Pill>
              ) : null}
              {comptes.payant ? (
                <Pill>
                  {comptes.payant} payante{comptes.payant > 1 ? "s" : ""}
                </Pill>
              ) : null}
            </div>
            {admin ? (
              <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-line pt-3.5">
                <span className="min-w-0 text-[12.8px] text-muted">
                  {dossier.restreint
                    ? `Réservé à ${pluriel(dossier.acces.length, "entreprise")}`
                    : "Ouvert à tous les membres"}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <CommandesDossier
                    dossier={dossier}
                    arborescence={arborescence}
                    membres={membres}
                  />
                </div>
              </div>
            ) : null}
          </Card>

          {dossier.auteur ? (
            <Card className="p-5">
              <h2 className="m-0 text-[16px]">Auteur</h2>
              <div className="mt-3.5 flex items-center gap-3">
                {dossier.auteur.photo ? (
                  <Image
                    src={dossier.auteur.photo}
                    alt=""
                    width={112}
                    height={112}
                    className="h-14 w-14 shrink-0 rounded-[var(--radius-s)] object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-s)] bg-navy-soft text-[17px] font-bold text-navy"
                  >
                    {initials(dossier.auteur.nom)}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="text-[14.5px] font-semibold text-ink">
                    {dossier.auteur.nom}
                  </div>
                  {dossier.auteur.role ? (
                    <div className="text-[12.6px] text-accent">
                      {dossier.auteur.role}
                    </div>
                  ) : null}
                </div>
              </div>
              {dossier.auteur.bio ? (
                <p className="m-0 mt-3.5 text-[13px] leading-relaxed text-muted whitespace-pre-line">
                  {dossier.auteur.bio}
                </p>
              ) : null}
            </Card>
          ) : admin ? null : (
            <Card className="p-5">
              <h2 className="m-0 text-[16px]">Votre interlocuteur</h2>
              <div className="mt-3.5 flex items-center gap-3">
                <Image
                  src={LOGO_EQUIPE}
                  alt=""
                  width={96}
                  height={96}
                  className="h-12 w-12 shrink-0 rounded-[var(--radius-s)] object-cover"
                />
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-ink">
                    L’équipe CanCham
                  </div>
                  <div className="text-[12.3px] text-accent">
                    Chambre de Commerce et de Coopération Canada–Madagascar
                  </div>
                </div>
              </div>
              <p className="m-0 mt-3.5 text-[13px] leading-relaxed text-muted">
                Une question sur ces ressources, ou un document qui vous manque
                ? Écrivez-nous : nous vous répondons.
              </p>
              <Link
                href="/membre/contact"
                className="btn-contour btn-contour-sm mt-4 text-ink no-underline hover:bg-surface-2"
              >
                Contacter l’équipe
              </Link>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

function Cadre({
  titre,
  nombre,
  ouverte,
  reserve,
  commandes,
  largeurCommandes = "",
  outils,
  children,
}: {
  titre: string;
  nombre: number;
  ouverte: boolean;
  outils?: React.ReactNode;
  reserve?: string | null;
  commandes?: React.ReactNode;
  largeurCommandes?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="@container relative rounded-[var(--radius-m)] border border-line bg-surface shadow-[var(--shadow)]">
      <details open={ouverte} className="group/section">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[var(--radius-m)] px-5 py-4 hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          <span
            className={`min-w-0 flex-1 ${largeurCommandes} ${outils ? "@[680px]:pr-[470px]" : ""}`}
          >
            <span className="block truncate text-[15px] font-semibold text-ink">
              {titre}
            </span>
            <span className="block text-[12.3px] text-muted">
              {nombre ? pluriel(nombre, "ressource") : "Vide"}
              {reserve ? (
                <span className="font-semibold text-warn"> · {reserve}</span>
              ) : null}
            </span>
          </span>
          <ChevronDown
            size={18}
            className="shrink-0 text-muted transition-transform duration-200 group-open/section:rotate-180"
          />
        </summary>
        {outils ? (
          <div className="px-5 pb-3.5 @[680px]:absolute @[680px]:right-[50px] @[680px]:top-[13px] @[680px]:p-0">
            {outils}
          </div>
        ) : null}
        {children}
      </details>
      {commandes ? (
        <div className="absolute right-[50px] top-[14px] flex items-center gap-1">
          {commandes}
        </div>
      ) : null}
    </div>
  );
}

function Section({
  section: s,
  ouverte,
  ctx,
}: {
  section: SectionDossier;
  ouverte: boolean;
  ctx: Contexte;
}) {
  const { space, admin } = ctx;
  const d = s.dossier;
  const ouvrir = (
    <Link
      href={`/${space}/ressources?dossier=${d.id}`}
      aria-label={`Ouvrir le dossier « ${d.nom} »`}
      title="Ouvrir le dossier"
      className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-s)] border border-line bg-surface text-muted hover:border-faint hover:text-ink"
    >
      <FolderOpen size={14} />
    </Link>
  );
  return (
    <Cadre
      titre={d.nom}
      nombre={aPlat(s).length}
      ouverte={ouverte}
      reserve={
        !d.restreint
          ? null
          : admin
            ? `réservé à ${pluriel(d.acces.length, "entreprise")}`
            : "réservé à votre entreprise"
      }
      largeurCommandes={admin ? "pr-[150px]" : "pr-[42px]"}
      commandes={
        <>
          {admin ? (
            <CommandesDossier
              dossier={d}
              arborescence={ctx.arborescence}
              membres={ctx.membres}
            />
          ) : null}
          {ouvrir}
        </>
      }
    >
      {s.ressources.length ? (
        <Lignes ressources={s.ressources} ctx={ctx} />
      ) : null}
      {s.sections.map((x) => (
        <SousSection key={x.dossier.id} section={x} chemin={[]} ctx={ctx} />
      ))}
      {aPlat(s).length ? null : (
        <p className="m-0 border-t border-line px-5 py-5 text-[13px] text-muted">
          Ce dossier ne contient encore rien.
        </p>
      )}
    </Cadre>
  );
}

function SousSection({
  section: s,
  chemin,
  ctx,
}: {
  section: SectionDossier;
  chemin: string[];
  ctx: Contexte;
}) {
  const noms = [...chemin, s.dossier.nom];
  return (
    <>
      <div className="flex items-center gap-2 border-t border-line bg-navy-soft px-5 py-2 text-[12.6px] font-semibold text-ink sm:px-6">
        <Folder size={13} className="shrink-0 text-navy" />
        <Link
          href={`/${ctx.space}/ressources?dossier=${s.dossier.id}`}
          className="min-w-0 truncate text-ink no-underline hover:underline"
        >
          {noms.join(" › ")}
        </Link>
        <span className="ml-auto shrink-0 font-normal text-muted">
          {s.ressources.length
            ? pluriel(s.ressources.length, "ressource")
            : "vide"}
        </span>
      </div>
      {s.ressources.length ? (
        <Lignes ressources={s.ressources} ctx={ctx} />
      ) : null}
      {s.sections.map((x) => (
        <SousSection key={x.dossier.id} section={x} chemin={noms} ctx={ctx} />
      ))}
    </>
  );
}

const CLASSE_LIGNE =
  "relative flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-line px-4 py-4 hover:bg-surface-2 sm:flex-nowrap sm:px-6";

export function Lignes({
  ressources,
  ctx,
}: {
  ressources: Resource[];
  ctx: Contexte;
}) {
  if (ctx.rangeable && ressources.length > 1) {
    return (
      <ListeTriable
        key={ressources.map((r) => r.id).join("|")}
        ids={ressources.map((r) => r.id)}
        titres={ressources.map((r) => r.titre)}
        classeLigne={CLASSE_LIGNE}
      >
        {ressources.map((r) => (
          <ContenuLigne key={r.id} r={r} ctx={ctx} />
        ))}
      </ListeTriable>
    );
  }
  return (
    <ul className="m-0 list-none p-0">
      {ressources.map((r) => (
        <li key={r.id} className={CLASSE_LIGNE}>
          <ContenuLigne r={r} ctx={ctx} />
        </li>
      ))}
    </ul>
  );
}

const BTN_LIGNE =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-s)] border border-line bg-surface text-muted hover:border-faint hover:text-ink";

function ContenuLigne({ r, ctx }: { r: Resource; ctx: Contexte }) {
  const { space, admin } = ctx;
  const video = r.fmt === "Vidéo";
  const accessible = admin || (r.accessible ?? r.type === "gratuit");
  const lisible = accessible && Boolean(r.pret);
  const adresse = `/${space}/ressources/${r.id}`;

  return (
    <>
      {admin ? (
        <label
          title="Sélectionner"
          className="relative z-10 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center self-center"
        >
          <input
            type="checkbox"
            name="ressource"
            value={r.id}
            form={FORMULAIRE}
            aria-label={`Sélectionner « ${r.titre} »`}
            className="h-4 w-4 accent-[var(--accent)]"
          />
        </label>
      ) : null}

      <Visuel
        src={r.cover}
        alt=""
        seed={r.id}
        className="h-[58px] w-[92px] shrink-0 rounded-[8px] border border-line sm:h-[76px] sm:w-[128px]"
        sizes="128px"
        cadrage={
          r.fmt === "PDF" || r.fmt === "DOCX" ? "object-top" : "object-center"
        }
        icon={video ? <Play size={20} /> : <FileText size={20} />}
      />

      <div className="min-w-0 flex-1 basis-[180px]">
        <h3 className="m-0 text-[14.8px] font-semibold leading-snug">
          {lisible ? (
            <Link
              href={adresse}
              className="text-ink no-underline after:absolute after:inset-0"
            >
              {r.titre}
            </Link>
          ) : (
            r.titre
          )}
        </h3>
        {r.description ? <DescriptionRepliable texte={r.description} /> : null}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.3px] text-muted">
          <Pill>{r.cat}</Pill>
          <Pill tone={r.type === "gratuit" ? "ok" : "muted"}>
            {r.type === "gratuit" ? "Gratuit" : fmtMoney(r.prix)}
          </Pill>
          <span>
            {r.fmt} · {r.taille}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={13} /> {fmtDateShort(r.date)}
          </span>
          {r.commentaires.length ? (
            <span className="inline-flex items-center gap-1">
              <MessageSquare size={13} /> {r.commentaires.length}
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative z-10 flex shrink-0 items-center gap-1.5 self-center">
        {admin ? (
          <>
            {r.pret ? (
              <Link
                href={adresse}
                aria-label={`${video ? "Regarder" : "Lire"} « ${r.titre} »`}
                title={video ? "Regarder" : "Lire"}
                className={BTN_LIGNE}
              >
                {video ? <PlayCircle size={15} /> : <BookOpen size={15} />}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent">
                <AlertTriangle size={13} /> Fichier manquant
              </span>
            )}
            {r.type === "payant" ? (
              <BoutonAcces
                resourceId={r.id}
                titre={r.titre}
                acces={ctx.acces[r.id] ?? []}
                membres={ctx.membres}
              />
            ) : null}
            <Link
              href={`/admin/ressources/${r.id}/modifier`}
              aria-label={`Modifier « ${r.titre} »`}
              title="Modifier"
              className={BTN_LIGNE}
            >
              <Pencil size={15} />
            </Link>
            <MenuRessource
              id={r.id}
              titre={r.titre}
              dossierId={ctx.dossierId}
              rangement={ctx.ordonne}
            />
            <SupprimerRessourceButton resourceId={r.id} titre={r.titre} />
          </>
        ) : r.terminee ? (
          <span
            title="Étape terminée"
            className="flex h-9 w-9 items-center justify-center text-success"
          >
            <CheckCircle2 size={22} aria-label="Étape terminée" />
          </span>
        ) : accessible ? (
          <span
            aria-hidden
            className="hidden h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted sm:flex"
          >
            {video ? <PlayCircle size={17} /> : <BookOpen size={16} />}
          </span>
        ) : (
          <>
            <Lock size={16} className="shrink-0 text-faint" aria-hidden />
            <div className="w-[104px]">
              <DownloadResourceButton
                resourceId={r.id}
                space={space}
                accessible={false}
                video={video}
                achat={achatRessource(r, ctx.modes)}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
