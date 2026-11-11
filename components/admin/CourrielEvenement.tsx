import Link from "next/link";
import { BellRing, Pencil, Plus, Save, TestTube, Trash2 } from "lucide-react";
import { Panneau } from "@/components/admin/ui";
import { EditeurBlocs } from "@/components/newsletter/EditeurBlocs";
import { getProfilChambre } from "@/lib/profil-chambre";
import { Card, Pill } from "@/components/ui";
import { enregistrerRappel, supprimerRappel } from "@/lib/actions/rappels";
import { COORDONNEES } from "@/lib/coordonnees";
import { prisma } from "@/lib/db";
import { toISODate } from "@/lib/enums";
import { docDepuisTexte, lireDoc } from "@/lib/lettre-blocs";
import { dateEnvoi, etatLettre, fmtDateHeure, fmtTaux, suiviDe, taux } from "@/lib/lettres";
import {
  DATES_MAX,
  debutEvenement,
  momentsEnvoi,
  rappelParDefaut,
  SUJET_DEFAUT,
  VARIABLES_RAPPEL,
  versSaisie,
} from "@/lib/rappels";
import { DatesRappel } from "@/components/admin/DatesRappel";

const CHAMP = "rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.6px] outline-none focus:border-accent";
const PASTILLE = { brouillon: ["Brouillon", "muted"], programmee: ["Programmée", "info"], envoyee: ["Envoyée", "ok"] } as const;

// Onglet « Courriel » d'un événement : les rappels automatiques aux inscrits, ajoutés un à un.
// « rappel » : « nouveau » ou l'id du rappel ouvert dans le formulaire.
export async function CourrielEvenement({
  eventId,
  passe,
  maintenant,
  rappel,
}: {
  eventId: string;
  passe: boolean;
  maintenant: number;
  rappel?: string;
}) {
  const [e, rappels, envois, lettres] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { id: true, titre: true, date: true, debut: true } }),
    prisma.rappelEvenement.findMany({ where: { eventId }, orderBy: { createdAt: "asc" } }),
    prisma.rappelEnvoye.groupBy({ by: ["type"], where: { eventId }, _count: { _all: true } }),
    prisma.lettre.findMany({
      where: { audience: { path: ["evenement"], equals: eventId } },
      orderBy: { updatedAt: "desc" },
      include: { envois: { select: { livreLe: true, ouvertLe: true, clicLe: true, erreurLe: true } } },
    }),
  ]);
  if (!e) return null;
  const debut = debutEvenement(toISODate(e.date), e.debut);
  const ouvert = rappel === "nouveau" ? null : rappels.find((r) => r.id === rappel) ?? null;
  const formulaire = !passe && (rappel === "nouveau" || ouvert);
  const base = `/admin/evenements/${e.id}?vue=courriel`;

  return (
    <div className="flex flex-col gap-4">
      {formulaire ? (
        <FormulaireRappel eventId={e.id} titre={e.titre} rappel={ouvert} retour={base} debut={debut} logo={(await getProfilChambre()).logo} />
      ) : (
        <div>
          {passe ? (
            <p className="m-0 text-[13px] text-muted">L’événement est passé : plus de rappel à ajouter.</p>
          ) : (
            <Link href={`${base}&rappel=nouveau`} className="btn-action btn-action-sm no-underline">
              <Plus size={15} /> Ajouter un rappel
            </Link>
          )}
        </div>
      )}

      {rappels.length ? (
        <Card className="p-0 overflow-hidden">
          <ul className="list-none m-0 p-0">
            {rappels.map((r) => {
              const moments = momentsEnvoi(r, debut);
              const nb = envois.filter((x) => x.type === r.id || x.type.startsWith(`${r.id}@`)).reduce((n, x) => n + x._count._all, 0);
              const restants = moments.filter((m) => m > maintenant);
              return (
                <li key={r.id} className={`flex items-center gap-4 px-5 py-3.5 border-b border-line last:border-b-0 ${ouvert?.id === r.id ? "bg-accent-soft/40" : ""}`}>
                  <span className="w-9 h-9 shrink-0 rounded-full bg-success-soft text-success grid place-items-center"><BellRing size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-ink">{r.titre || r.sujet || "Rappel"}</div>
                    <div className="text-[12.5px] text-muted">
                      {moments.length ? moments.map((m) => fmtDateHeure(new Date(m))).join(" · ") : "Aucune date"}
                      {nb ? ` · ${nb} envoi${nb > 1 ? "s" : ""}` : !restants.length && !passe ? " · heures passées" : ""}
                    </div>
                  </div>
                  {nb ? <Pill tone="ok">Envoyé</Pill> : null}
                  {passe ? null : (
                    <Link href={`${base}&rappel=${r.id}`} className="btn-contour btn-contour-sm text-ink no-underline"><Pencil size={14} /> Modifier</Link>
                  )}
                  <form action={supprimerRappel}>
                    <input type="hidden" name="eventId" value={e.id} />
                    <input type="hidden" name="rappelId" value={r.id} />
                    <button type="submit" aria-label={`Supprimer le rappel « ${r.titre || "Rappel"} »`} title="Supprimer"
                      className="w-9 h-9 grid place-items-center rounded-[var(--radius-s)] border border-line bg-surface text-muted cursor-pointer hover:text-bad hover:border-bad"><Trash2 size={15} /></button>
                  </form>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {lettres.length ? (
        <Panneau titre="Courriels aux inscrits" teinte="bleu">
          <ul className="list-none m-0 p-0">
            {lettres.map((l) => {
              const etat = etatLettre(l);
              const s = suiviDe(l.envois);
              const quand = dateEnvoi(l);
              const nb = etat === "programmee" ? l.destinataires : l.envoyes;
              return (
                <li key={l.id} className="py-2.5 border-t border-line first:border-t-0">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/admin/newsletter/${l.id}`} className="min-w-0 truncate text-[13.4px] font-semibold text-ink no-underline hover:text-accent">{l.sujet}</Link>
                    <Pill tone={PASTILLE[etat][1]}>{PASTILLE[etat][0]}</Pill>
                  </div>
                  <div className="text-[12px] text-muted">
                    {etat === "brouillon"
                      ? `Par ${l.auteur}`
                      : `${quand ? fmtDateHeure(quand) : ""} · ${nb} destinataire${nb > 1 ? "s" : ""}${etat === "envoyee" && s.envoyes ? ` · ouverture ${fmtTaux(taux(s.ouverts, s.envoyes))}` : ""}`}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panneau>
      ) : null}
    </div>
  );
}

function FormulaireRappel({
  eventId,
  titre,
  rappel,
  retour,
  debut,
  logo,
}: {
  logo: string;
  eventId: string;
  titre: string;
  rappel: { id: string; titre: string | null; dates: Date[]; avant: number; sujet: string | null; message: string | null } | null;
  retour: string;
  debut: number;
}) {
  const reseaux = { facebook: COORDONNEES.reseaux.facebook, linkedin: COORDONNEES.reseaux.linkedin };
  const doc =
    (rappel?.message && lireDoc(rappel.message, reseaux)) ||
    (rappel?.message ? docDepuisTexte(titre, rappel.message, reseaux) : rappelParDefaut(reseaux));
  // Par défaut : la veille, à l'heure du début de l'événement
  const dates = rappel ? momentsEnvoi(rappel, debut).map(versSaisie) : [];

  return (
    <Panneau titre={rappel ? "Modifier le rappel" : "Nouveau rappel"} teinte="vert">
      <form action={enregistrerRappel} className="flex flex-col gap-4">
        <input type="hidden" name="eventId" value={eventId} />
        {rappel ? <input type="hidden" name="rappelId" value={rappel.id} /> : null}

        <label className="block">
          <span className="block text-[12.5px] font-semibold text-muted mb-1">Titre du rappel</span>
          <input name="titre" maxLength={120} defaultValue={rappel?.titre ?? ""} placeholder="Ex. Rappel de la veille" className={`${CHAMP} w-full`} />
        </label>

        <div>
          <span className="block text-[12.5px] font-semibold text-muted mb-1.5">Envoi (heure de Madagascar)</span>
          <DatesRappel initiales={dates} suggestion={versSaisie(debut - 86_400_000)} max={DATES_MAX} limite={versSaisie(debut - 60_000)} />
        </div>

        <label className="block">
          <span className="block text-[12.5px] font-semibold text-muted mb-1">Objet</span>
          <input name="sujet" maxLength={200} defaultValue={rappel?.sujet ?? SUJET_DEFAUT} className={`${CHAMP} w-full`} />
        </label>

        <div>
          <span className="block text-[12.5px] font-semibold text-muted mb-2">Message</span>
          <EditeurBlocs key={rappel?.id ?? "nouveau"} initial={doc} reseaux={reseaux} name="message" variables={VARIABLES_RAPPEL} logo={logo}
            mention="Vous recevez ce rappel car vous êtes inscrit(e) à cet événement." />
          <p className="m-0 mt-2 text-[12px] text-faint">Les QR codes d’entrée s’ajoutent à la fin, pour les inscrits confirmés.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" name="intention" value="enregistrer" className="btn-action btn-action-sm"><Save size={14} /> Enregistrer le rappel</button>
          <button type="submit" name="intention" value="test" className="btn-contour btn-contour-sm text-ink"><TestTube size={14} /> M’envoyer un test</button>
          <Link href={retour} className="btn-contour btn-contour-sm text-muted no-underline">Annuler</Link>
        </div>
      </form>
    </Panneau>
  );
}

