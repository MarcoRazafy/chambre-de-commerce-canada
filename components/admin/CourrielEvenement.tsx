import Link from "next/link";
import { BellRing, Mail, Megaphone, RotateCcw, Save, Send, TestTube } from "lucide-react";
import { Panneau, Vide } from "@/components/admin/ui";
import { Pill } from "@/components/ui";
import { enregistrerRappels } from "@/lib/actions/rappels";
import { prisma } from "@/lib/db";
import { toISODate } from "@/lib/enums";
import { dateEnvoi, etatLettre, fmtDateHeure, fmtTaux, suiviDe, taux } from "@/lib/lettres";
import { debutEvenement, echeance, rappelParDefaut, RAPPELS, SUJET_DEFAUT, VARIABLES_RAPPEL } from "@/lib/rappels";
import { ApercuLettre, EditeurBlocs } from "@/components/newsletter/EditeurBlocs";
import { COORDONNEES } from "@/lib/coordonnees";
import { docDepuisTexte, lireDoc } from "@/lib/lettre-blocs";

const CHAMP = "w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.6px] outline-none focus:border-accent";
const PASTILLE = { brouillon: ["Brouillon", "muted"], programmee: ["Programmée", "info"], envoyee: ["Envoyée", "ok"] } as const;

// Onglet « Courriel » d'un événement : rappels automatiques aux inscrits, courriel aux inscrits, annonce en newsletter
export async function CourrielEvenement({ eventId, passe, maintenant }: { eventId: string; passe: boolean; maintenant: number }) {
  const [e, envois, lettres] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, titre: true, date: true, debut: true, rappelJ7: true, rappelJ1: true, rappelH2: true, rappelSujet: true, rappelMessage: true },
    }),
    prisma.rappelEnvoye.groupBy({ by: ["type"], where: { eventId }, _count: { _all: true } }),
    prisma.lettre.findMany({
      where: { audience: { path: ["evenement"], equals: eventId } },
      orderBy: { updatedAt: "desc" },
      include: { envois: { select: { livreLe: true, ouvertLe: true, clicLe: true, erreurLe: true } } },
    }),
  ]);
  if (!e) return null;
  const debut = debutEvenement(toISODate(e.date), e.debut);
  const partis = new Map(envois.map((x) => [x.type, x._count._all]));
  const personnalise = !!(e.rappelSujet || e.rappelMessage);
  const reseaux = { facebook: COORDONNEES.reseaux.facebook, linkedin: COORDONNEES.reseaux.linkedin };
  const docMessage =
    (e.rappelMessage && lireDoc(e.rappelMessage, reseaux)) ||
    (e.rappelMessage ? docDepuisTexte(e.titre, e.rappelMessage, reseaux) : rappelParDefaut(reseaux));

  return (
    <div className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_380px]">
      <Panneau
        titre="Rappels automatiques aux inscrits"
        sousTitre="Par courriel, avec le QR code d’entrée."
        teinte="vert"
      >
        <form action={enregistrerRappels} className="flex flex-col gap-4">
          <input type="hidden" name="eventId" value={e.id} />
          <ul className="list-none m-0 p-0">
            {RAPPELS.map((r) => {
              const quand = echeance(r.cle, debut);
              const nb = partis.get(r.cle) ?? 0;
              const depasse = quand <= maintenant;
              return (
                <li key={r.cle} className="flex items-center justify-between gap-3 py-2.5 border-b border-line last:border-b-0">
                  <label htmlFor={`rappel-${r.cle}`} className="min-w-0 cursor-pointer">
                    <span className="block text-[13.8px] font-semibold text-ink">{r.libelle}</span>
                    <span className="block text-[12.5px] text-muted">
                      {passe ? "Événement passé" : `Envoi le ${fmtDateHeure(new Date(quand))}`}
                      {nb ? ` · envoyé à ${nb} adresse${nb > 1 ? "s" : ""}` : depasse && !passe ? " · heure passée" : ""}
                    </span>
                  </label>
                  <input
                    id={`rappel-${r.cle}`}
                    type="checkbox"
                    name={r.cle}
                    value="1"
                    defaultChecked={e[r.champ]}
                    disabled={passe}
                    className="w-5 h-5 shrink-0 accent-[var(--success)] cursor-pointer disabled:cursor-not-allowed"
                  />
                </li>
              );
            })}
          </ul>

          <label className="block">
            <span className="block text-[12.5px] font-semibold text-muted mb-1">Objet du rappel</span>
            <input name="sujet" maxLength={200} defaultValue={e.rappelSujet ?? SUJET_DEFAUT} disabled={passe} className={CHAMP} />
          </label>
          <div>
            <span className="block text-[12.5px] font-semibold text-muted mb-2">Message du rappel</span>
            {passe ? (
              <ApercuLettre doc={docMessage} hauteur={640} />
            ) : (
              <EditeurBlocs initial={docMessage} reseaux={reseaux} name="message" variables={VARIABLES_RAPPEL} apercuBoite={false}
                mention="Vous recevez ce rappel car vous êtes inscrit(e) à cet événement." />
            )}
            <p className="m-0 mt-2 text-[12px] text-faint">Les QR codes d’entrée s’ajoutent à la fin, pour les inscrits confirmés.</p>
          </div>

          {passe ? null : (
            <div className="flex flex-wrap gap-2">
              <button type="submit" name="intention" value="enregistrer" className="btn-action btn-action-sm"><Save size={14} /> Enregistrer les rappels</button>
              <button type="submit" name="intention" value="test" className="btn-contour btn-contour-sm text-ink"><TestTube size={14} /> M’envoyer un test</button>
              {personnalise ? (
                <button type="submit" name="intention" value="defaut" className="btn-contour btn-contour-sm text-muted"><RotateCcw size={14} /> Rétablir le texte par défaut</button>
              ) : null}
            </div>
          )}
        </form>
      </Panneau>

      <div className="flex flex-col gap-4">
        <Panneau titre="Écrire aux inscrits" sousTitre="Infos pratiques, changement de salle… tout de suite ou programmé" teinte="bleu">
          <div className="flex flex-col gap-3">
            <Link href={`/admin/newsletter/nouvelle?evenement=${e.id}`} className="btn-action btn-action-sm self-start no-underline">
              <Mail size={14} /> Nouveau courriel aux inscrits
            </Link>
            {lettres.length ? (
              <ul className="list-none m-0 p-0">
                {lettres.map((l) => {
                  const etat = etatLettre(l);
                  const s = suiviDe(l.envois);
                  const quand = dateEnvoi(l);
                  return (
                    <li key={l.id} className="py-2.5 border-t border-line">
                      <div className="flex items-center justify-between gap-2">
                        <Link href={`/admin/newsletter/${l.id}`} className="min-w-0 truncate text-[13.4px] font-semibold text-ink no-underline hover:text-accent">{l.sujet}</Link>
                        <Pill tone={PASTILLE[etat][1]}>{PASTILLE[etat][0]}</Pill>
                      </div>
                      <div className="text-[12px] text-muted">
                        {etat === "brouillon"
                          ? `Par ${l.auteur}`
                          : `${quand ? fmtDateHeure(quand) : ""} · ${etat === "programmee" ? l.destinataires : l.envoyes} destinataire${(etat === "programmee" ? l.destinataires : l.envoyes) > 1 ? "s" : ""}${etat === "envoyee" && s.envoyes ? ` · ouverture ${fmtTaux(taux(s.ouverts, s.envoyes))}` : ""}`}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Vide icone={<Send size={22} />}>Aucun courriel envoyé aux inscrits.</Vide>
            )}
          </div>
        </Panneau>

        <Panneau titre="Annoncer dans une newsletter" sousTitre="Une lettre préremplie pour tous les membres et les abonnés" teinte="rouge">
          {passe ? (
            <p className="m-0 text-[13px] text-muted">L’événement est passé.</p>
          ) : (
            <Link href={`/admin/newsletter/nouvelle?annonce=${e.id}`} className="btn-contour btn-contour-sm text-ink no-underline">
              <Megaphone size={14} /> Préparer l’annonce
            </Link>
          )}
        </Panneau>

        <p className="m-0 flex items-start gap-2 text-[12px] text-faint">
          <BellRing size={14} className="shrink-0 mt-px" />
          Chaque adresse reçoit chaque rappel une seule fois. Une personne inscrite bien après l’heure d’un rappel ne le reçoit plus : il n’aurait plus de sens.
        </p>
      </div>
    </div>
  );
}
