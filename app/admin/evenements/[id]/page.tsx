import Image from "next/image";
import { Partage } from "@/components/Partage";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  MapPin,
  Pencil,
  Search,
  Ticket,
  UserCheck,
  UserRound,
  UserX,
  Users,
  X,
  Globe,
  LockKeyhole,
} from "lucide-react";
import { Compteur, Jauge, Onglets, Panneau, Vide } from "@/components/admin/ui";
import { ScannerQr } from "@/components/admin/ScannerQr";
import {
  AddAttendeeButton,
  ValiderInscriptionButton,
  AttendanceButton,
  DeleteEventButton,
  RetirerParticipantButton,
} from "@/components/forms/EventForms";
import { TexteLie } from "@/components/TexteLie";
import { Card, Pill } from "@/components/ui";
import { plageHoraire } from "@/lib/agenda";
import { fmtDate, fmtMoney } from "@/lib/format";
import { getEvent, getMembers } from "@/lib/queries";
import { getParticipants } from "@/lib/queries-admin";
import { estTermine, marquerAbsentsPasses } from "@/lib/presences";
import { plat } from "@/lib/texte";

const ONGLETS = [
  { cle: "tous", libelle: "Tous" },
  { cle: "a_valider", libelle: "À valider" },
  { cle: "attendus", libelle: "À accueillir" },
  { cle: "presents", libelle: "Présents" },
  { cle: "absents", libelle: "Absents" },
] as const;

const STATUT_ONGLET = {
  a_valider: "a_valider",
  attendus: "confirme",
  presents: "present",
  absents: "absent",
} as const;

const TAILLES = [
  { cle: "10", libelle: "10" },
  { cle: "50", libelle: "50" },
  { cle: "tout", libelle: "Tout" },
] as const;

const PASTILLES = {
  a_valider: { ton: "muted", libelle: "À valider" },
  confirme: { ton: "warn", libelle: "Inscrit" },
  present: { ton: "ok", libelle: "Présent" },
  absent: { ton: "bad", libelle: "Absent" },
} as const;

export default async function EvenementAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    onglet?: string;
    q?: string;
    vue?: string;
    par?: string;
    page?: string;
  }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const e = await getEvent(id);
  if (!e) notFound();

  await marquerAbsentsPasses(id);
  const [participants, membres] = await Promise.all([
    getParticipants(id),
    getMembers(),
  ]);

  const onglet = ONGLETS.some((o) => o.cle === sp.onglet)
    ? (sp.onglet as (typeof ONGLETS)[number]["cle"])
    : "tous";
  const recherche = sp.q?.trim() ?? "";
  const passe = estTermine({ date: e.date, fin: e.fin ?? null });

  const trouves = recherche
    ? participants.filter((p) =>
        plat(
          `${p.nom} ${p.entreprise} ${p.email} ${p.telephone ?? ""}`,
        ).includes(plat(recherche)),
      )
    : participants;
  const liste =
    onglet === "tous"
      ? trouves
      : trouves.filter((p) => p.statut === STATUT_ONGLET[onglet]);

  const compte = (s: "a_valider" | "confirme" | "present" | "absent") =>
    participants.filter((p) => p.statut === s).length;
  const presents = compte("present");
  const restantes = Math.max(0, e.cap - participants.length);

  const vueListe = sp.vue === "inscrits";
  const par = TAILLES.some((t) => t.cle === sp.par)
    ? (sp.par as (typeof TAILLES)[number]["cle"])
    : "10";
  const taille = par === "tout" ? Math.max(liste.length, 1) : Number(par);
  const pages = Math.max(1, Math.ceil(liste.length / taille));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), pages);
  const visibles = liste.slice((page - 1) * taille, page * taille);

  const base = `/admin/evenements/${id}`;
  const adresse = (
    change: { onglet?: string; par?: string; page?: number } = {},
  ) => {
    const o = change.onglet ?? onglet;
    const t = change.par ?? par;
    const n = change.page ?? 1;
    const q = new URLSearchParams({ vue: "inscrits" });
    if (o !== "tous") q.set("onglet", o);
    if (recherche) q.set("q", recherche);
    if (t !== "10") q.set("par", t);
    if (n > 1) q.set("page", String(n));
    return `${base}?${q}`;
  };
  const ici = adresse({ page });
  const lien = (o: string) => adresse({ onglet: o });
  const bascule = (o: string) =>
    vueListe && onglet === o ? base : adresse({ onglet: o, par });

  return (
    <>
      <Link
        href="/admin/evenements"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted no-underline hover:text-accent mb-4"
      >
        <ArrowLeft size={14} /> Tous les événements
      </Link>

      <Card className="p-0 overflow-hidden mb-5">
        <div className="grid md:grid-cols-[320px_1fr]">
          <Partage nom={`evenement-${e.id}`}>
            <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[210px] bg-surface-2">
              {e.photo ? (
                <Image
                  src={e.photo}
                  alt={e.titre}
                  fill
                  sizes="(max-width: 768px) 100vw, 320px"
                  className="object-cover"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-faint">
                  <CalendarDays size={32} />
                </span>
              )}
            </div>
          </Partage>
          <div className="p-6 flex flex-col gap-3 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Pill tone={passe ? "muted" : "ok"}>
                {passe ? "Passé" : "À venir"}
              </Pill>
              <Pill>{e.format}</Pill>
              <Pill tone={e.payant ? "warn" : "ok"}>
                Membres · {e.payant ? fmtMoney(e.prix) : "Inclus"}
              </Pill>
              {e.public ? (
                <Pill tone={e.prixPublic > 0 ? "warn" : "ok"}>
                  Public ·{" "}
                  {e.prixPublic > 0 ? fmtMoney(e.prixPublic) : "Gratuit"}
                </Pill>
              ) : null}
              <Pill
                icon={
                  e.public ? <Globe size={11} /> : <LockKeyhole size={11} />
                }
              >
                {e.public ? "Ouvert au public" : "Membres uniquement"}
              </Pill>
            </div>
            <h1 className="text-[clamp(22px,2.6vw,30px)] m-0">{e.titre}</h1>
            <div className="flex gap-x-5 gap-y-1.5 flex-wrap text-[13.5px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={15} />
                {fmtDate(e.date, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              {plageHoraire(e.debut, e.fin) ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={15} /> {plageHoraire(e.debut, e.fin)}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={15} /> {e.lieu}
              </span>
            </div>
            <div className="flex gap-2.5 flex-wrap mt-auto pt-2">
              <ScannerQr eventId={e.id} termine={passe} />
              <Link
                href={`/admin/evenements/${e.id}/modifier`}
                className="btn-contour btn-contour-sm text-ink no-underline hover:bg-surface-2"
              >
                <Pencil size={14} /> Modifier
              </Link>
              <DeleteEventButton eventId={e.id} titre={e.titre} />
            </div>
          </div>
        </div>
      </Card>

      <div className="cascade grid gap-4 mb-5 sm:grid-cols-2 xl:grid-cols-4">
        <Compteur
          icone={<Users size={22} />}
          teinte="bleu"
          libelle="Inscrits"
          href={bascule("tous")}
          actif={vueListe && onglet === "tous"}
          valeur={
            <span>
              {participants.length}
              <span className="text-[16px] text-muted"> / {e.cap}</span>
            </span>
          }
          detail={
            <>
              <Jauge valeur={participants.length} max={e.cap} teinte="vert" />
              <span className="flex items-center gap-1 mt-2 text-[12.5px] font-semibold text-accent">
                {vueListe && onglet === "tous" ? (
                  <>
                    <ChevronUp size={14} /> Masquer la liste d’accueil
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} /> Voir la liste d’accueil
                  </>
                )}
              </span>
            </>
          }
        />
        <Compteur
          icone={<UserCheck size={22} />}
          teinte="vert"
          libelle="Présents"
          href={bascule("presents")}
          actif={vueListe && onglet === "presents"}
          valeur={presents}
          detail={
            participants.length
              ? `${Math.round((presents / participants.length) * 100)} % des inscrits`
              : "Aucun inscrit"
          }
        />
        <Compteur
          icone={passe ? <UserX size={22} /> : <UserRound size={22} />}
          teinte="rouge"
          libelle={passe ? "Absents" : "À accueillir"}
          href={bascule(passe ? "absents" : "attendus")}
          actif={vueListe && onglet === (passe ? "absents" : "attendus")}
          valeur={passe ? compte("absent") : compte("confirme")}
        />
        <Compteur
          icone={<Ticket size={22} />}
          teinte="vert"
          libelle="Places restantes"
          valeur={restantes}
          detail={restantes === 0 ? "Complet" : undefined}
        />
      </div>

      {vueListe ? (
        <Card className="p-0 min-w-0">
          <div className="px-6 pt-5 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-[18px] m-0">Liste d’accueil</h2>
              <p className="text-[13px] text-muted m-0 mt-1">
                Pointez les arrivées le jour J, inscrivez les arrivées directes.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <ScannerQr eventId={e.id} termine={passe} />
              <a
                href={`/admin/evenements/${e.id}/export`}
                className="btn-contour btn-contour-sm text-ink no-underline hover:bg-surface-2"
              >
                <Download size={14} /> Exporter
              </a>
              <AddAttendeeButton
                eventId={e.id}
                retour={ici}
                membres={membres.map((m) => ({
                  id: m.id,
                  nom: m.nom,
                  contact: m.nom,
                  email: "",
                }))}
              />
              <Link
                href={base}
                aria-label="Fermer la liste d’accueil"
                title="Revenir à la présentation"
                className="w-9 h-9 rounded-[var(--radius-s)] border border-line text-muted flex items-center justify-center no-underline hover:text-ink hover:bg-surface-2"
              >
                <X size={16} />
              </Link>
            </div>
          </div>

          <div className="px-6 pt-4">
            <Onglets
              actif={onglet}
              onglets={ONGLETS.map((o) => ({
                cle: o.cle,
                libelle: o.libelle,
                href: lien(o.cle),
                compte:
                  o.cle === "tous"
                    ? participants.length
                    : compte(STATUT_ONGLET[o.cle]),
              }))}
            />
            <form action={base} className="relative max-w-[360px] mb-4">
              <input type="hidden" name="vue" value="inscrits" />
              {onglet !== "tous" ? (
                <input type="hidden" name="onglet" value={onglet} />
              ) : null}
              {par !== "10" ? (
                <input type="hidden" name="par" value={par} />
              ) : null}
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
              />
              <input
                type="search"
                name="q"
                defaultValue={recherche}
                placeholder="Nom, entreprise, e-mail…"
                aria-label="Rechercher un participant"
                className="w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink pl-9 pr-3 py-2.5 text-[13.5px] outline-none focus:border-accent"
              />
            </form>
          </div>

          {visibles.length ? (
            <ul className="list-none m-0 p-0 border-t border-line">
              {visibles.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 px-6 py-3 border-b border-line last:border-b-0 flex-wrap sm:flex-nowrap"
                >
                  <span className="min-w-0 flex-1 basis-[200px]">
                    <span className="block text-[14px] font-semibold text-ink truncate">
                      {p.nom}
                    </span>
                    <span className="block text-[12.5px] text-muted truncate">
                      {p.entreprise}
                      {p.email && p.email !== "—" ? ` · ${p.email}` : ""}
                      {p.telephone ? ` · ${p.telephone}` : ""}
                    </span>
                  </span>
                  <Pill tone={PASTILLES[p.statut].ton}>
                    {PASTILLES[p.statut].libelle}
                  </Pill>
                  <span className="flex items-center gap-1">
                    {p.statut === "a_valider" ? (
                      <ValiderInscriptionButton
                        attendeeId={p.id}
                        eventId={e.id}
                        nom={p.nom}
                        retour={ici}
                      />
                    ) : (
                      <AttendanceButton
                        attendeeId={p.id}
                        eventId={e.id}
                        statut={p.statut}
                        retour={ici}
                      />
                    )}
                    <RetirerParticipantButton
                      attendeeId={p.id}
                      eventId={e.id}
                      nom={p.nom}
                      retour={ici}
                    />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Vide icone={<Users size={26} />}>
              {recherche
                ? `Personne ne correspond à « ${recherche} ».`
                : onglet === "presents"
                  ? "Personne n’a encore été pointé présent."
                  : "Aucun participant dans cette liste."}
            </Vide>
          )}

          {liste.length ? (
            <Pagination
              total={liste.length}
              page={page}
              pages={pages}
              taille={taille}
              par={par}
              versPage={(n) => adresse({ page: n })}
              versTaille={(t) => adresse({ par: t })}
            />
          ) : null}
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_400px] items-start">
          <Panneau titre="Présentation" teinte="vert">
            <p className="m-0 text-[14.3px] text-muted leading-[1.75] whitespace-pre-line">
              <TexteLie texte={e.desc} />
            </p>
            {e.pourQui ? (
              <>
                <div className="surtitre text-faint mt-5 mb-1.5">
                  Public visé
                </div>
                <p className="m-0 text-[14px] text-ink leading-relaxed">
                  {e.pourQui}
                </p>
              </>
            ) : null}
          </Panneau>

          <Panneau titre="Programme" teinte="rouge">
            {e.programme?.length ? (
              <ol className="list-none m-0 p-0 flex flex-col gap-3">
                {e.programme.map((etape, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold text-accent-strong w-[62px] shrink-0 pt-px">
                      {etape.heure}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-ink">
                        {etape.titre}
                      </span>
                      {etape.detail ? (
                        <span className="block text-[12.5px] text-muted">
                          {etape.detail}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="m-0 text-[13px] text-muted">
                Aucun programme publié.{" "}
                <Link
                  href={`/admin/evenements/${e.id}/modifier`}
                  className="text-accent font-semibold no-underline hover:underline"
                >
                  L’ajouter
                </Link>
              </p>
            )}
          </Panneau>
        </div>
      )}
    </>
  );
}

function Pagination({
  total,
  page,
  pages,
  taille,
  par,
  versPage,
  versTaille,
}: {
  total: number;
  page: number;
  pages: number;
  taille: number;
  par: string;
  versPage: (n: number) => string;
  versTaille: (t: string) => string;
}) {
  const debut = (page - 1) * taille + 1;
  const fin = Math.min(page * taille, total);

  const numeros: (number | "…")[] = [];
  for (let n = 1; n <= pages; n++) {
    if (pages <= 7 || n === 1 || n === pages || Math.abs(n - page) <= 1) {
      numeros.push(n);
    } else if (numeros.at(-1) !== "…") {
      numeros.push("…");
    }
  }

  const bouton =
    "min-w-9 h-9 px-2.5 rounded-[var(--radius-s)] inline-flex items-center justify-center text-[13px] font-semibold no-underline tabular-nums";

  return (
    <div className="flex items-center justify-between gap-x-6 gap-y-3 flex-wrap px-6 py-4 border-t border-line">
      <div className="flex items-center gap-2.5 text-[13px] text-muted">
        Afficher
        <div className="inline-flex rounded-[var(--radius-s)] border border-line overflow-hidden">
          {TAILLES.map((t) => (
            <Link
              key={t.cle}
              href={versTaille(t.cle)}
              aria-current={t.cle === par ? "true" : undefined}
              className={`px-3 py-1.5 text-[13px] font-semibold no-underline border-l border-line first:border-l-0 ${
                t.cle === par
                  ? "bg-accent text-white"
                  : "text-ink hover:bg-surface-2"
              }`}
            >
              {t.libelle}
            </Link>
          ))}
        </div>
        lignes
      </div>

      <span className="text-[13px] text-muted tabular-nums">
        {debut}–{fin} sur {total}
      </span>

      {pages > 1 ? (
        <nav aria-label="Pages de la liste" className="flex items-center gap-1">
          {page > 1 ? (
            <Link
              href={versPage(page - 1)}
              aria-label="Page précédente"
              className={`${bouton} text-ink hover:bg-surface-2`}
            >
              <ChevronLeft size={16} />
            </Link>
          ) : null}
          {numeros.map((n, i) =>
            n === "…" ? (
              <span key={`e${i}`} className="px-1 text-faint">
                …
              </span>
            ) : (
              <Link
                key={n}
                href={versPage(n)}
                aria-current={n === page ? "page" : undefined}
                className={`${bouton} ${
                  n === page
                    ? "bg-accent text-white"
                    : "text-ink hover:bg-surface-2"
                }`}
              >
                {n}
              </Link>
            ),
          )}
          {page < pages ? (
            <Link
              href={versPage(page + 1)}
              aria-label="Page suivante"
              className={`${bouton} text-ink hover:bg-surface-2`}
            >
              <ChevronRight size={16} />
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
