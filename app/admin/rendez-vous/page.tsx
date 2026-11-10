import Link from "next/link";
import { AlertTriangle, CalendarClock, CalendarDays, Check, Eye, Hourglass, Info, Users, Video } from "lucide-react";
import { Compteur, EnTeteAdmin, Onglets, Vide } from "@/components/admin/ui";
import { FiltresAuto } from "@/components/FiltresAuto";
import { Pastille } from "@/components/messagerie/outils";
import { AnnulerRendezvous } from "@/components/rendezvous/AnnulerRendezvous";
import { CarteType, ICONE_LIEU } from "@/components/rendezvous/CarteType";
import { BoutonCopierLien, ModifierType, NouveauType, ReglerPersonne } from "@/components/rendezvous/Reglages";
import { Banner, Card, Pill, Saillant, TableWrap, Td, Th } from "@/components/ui";
import { confirmerRendezvous } from "@/lib/actions/rendezvous";
import { ajouterJours, fmtHeure, fmtJour } from "@/lib/agenda";
import { initialesDe } from "@/lib/avatars";
import { urlPublique } from "@/lib/courriel";
import { aujourdhuiISO } from "@/lib/format";
import { cheminRendezvous } from "@/lib/liens";
import { libelleLieu } from "@/lib/rendezvous";
import {
  getPersonnesEquipe,
  getRendezvousEquipe,
  getTypesRendezvous,
  type PeriodeRendezvous,
} from "@/lib/rendezvous-donnees";
import { getCurrentUser } from "@/lib/session";

type Onglet = "rdv" | "types" | "equipe";
const PERIODES: [PeriodeRendezvous, string][] = [
  ["a_venir", "À venir"],
  ["passes", "Passés"],
  ["annules", "Annulés"],
];
const CHAMP = "border border-line bg-surface text-ink rounded-[var(--radius-s)] px-3 py-[9px] text-[13.6px]";

// Rendez-vous (équipe) : les membres réservent en ligne un créneau avec la bonne personne, selon sa spécialité
export default async function RendezvousEquipePage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; hote?: string; periode?: string }>;
}) {
  await getCurrentUser("admin");
  const p = await searchParams;
  const onglet: Onglet = p.onglet === "types" || p.onglet === "equipe" ? p.onglet : "rdv";
  const periode = PERIODES.some(([k]) => k === p.periode) ? (p.periode as PeriodeRendezvous) : "a_venir";
  const hote = p.hote ?? "";

  const [aVenir, liste, types, personnes, pageReservation] = await Promise.all([
    getRendezvousEquipe(),
    onglet === "rdv" ? getRendezvousEquipe({ periode, hote }) : Promise.resolve([]),
    getTypesRendezvous(true),
    getPersonnesEquipe(),
    urlPublique("/membre/rendez-vous"),
  ]);
  const liens = new Map(await Promise.all(types.map(async (t) => [t.id, await urlPublique(cheminRendezvous(t.id))] as const)));

  const aujourdhui = aujourdhuiISO();
  const dansSemaine = ajouterJours(aujourdhui, 7);
  const recoivent = personnes.filter((x) => x.recoit);
  const choix = personnes.map((x) => ({ id: x.id, nom: x.nom, specialite: x.specialite, recoit: x.recoit }));
  const aConfirmer = aVenir.filter((r) => r.statut === "a_confirmer").length;
  const proposes = types.filter((t) => t.actif && t.plages.length && (!t.hote || recoivent.some((x) => x.id === t.hote!.id)));

  return (
    <>
      <EnTeteAdmin
        surtitre="Activités"
        titre={<Saillant>Rendez-vous</Saillant>}
        actions={
          onglet === "types" ? (
            <NouveauType personnes={choix} />
          ) : onglet === "rdv" ? (
            <BoutonCopierLien lien={pageReservation} libelle="Copier la page de réservation" />
          ) : null
        } />

      {proposes.length ? null : (
        <div className="mb-5">
          <Banner tone="warn" icon={<AlertTriangle size={17} />} title="Aucun rendez-vous ne peut être pris pour l’instant">
            Il faut au moins un type proposé, avec des heures d’accueil, et dont la personne reçoit des rendez-vous.
          </Banner>
        </div>
      )}

      <div className="grid gap-4 mb-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Compteur icone={<CalendarDays size={20} />} libelle="Cette semaine" valeur={aVenir.filter((r) => r.jour <= dansSemaine).length} detail="rendez-vous à venir" teinte="rouge" />
        <Compteur icone={<Video size={20} />} libelle="En visio" valeur={aVenir.filter((r) => r.lieu === "visio").length} detail="parmi les rendez-vous à venir" teinte="bleu" />
        <Compteur
          icone={<Users size={20} />}
          libelle="Personnes qui reçoivent"
          valeur={recoivent.length}
          detail={`${recoivent.filter((x) => x.lienVisio).length} avec une salle de visio`}
          href="/admin/rendez-vous?onglet=equipe"
          teinte="vert"
        />
        <Compteur
          icone={<Hourglass size={20} />}
          libelle="À confirmer"
          valeur={aConfirmer}
          detail={aConfirmer ? "demandes en attente" : "aucune demande en attente"}
          teinte="degrade"
        />
      </div>

      <Onglets
        actif={onglet}
        onglets={[
          { cle: "rdv", libelle: "Rendez-vous", href: "/admin/rendez-vous", compte: aVenir.length },
          { cle: "types", libelle: "Types de rendez-vous", href: "/admin/rendez-vous?onglet=types", compte: types.length },
          { cle: "equipe", libelle: "Qui reçoit", href: "/admin/rendez-vous?onglet=equipe", compte: recoivent.length },
        ]}
      />

      {onglet === "rdv" ? (
        <>
          <FiltresAuto action="/admin/rendez-vous" className="flex gap-3 flex-wrap mb-4">
            <select name="hote" defaultValue={hote} aria-label="Personne qui reçoit" className={`${CHAMP} w-full sm:w-[300px]`}>
              <option value="">Toutes les personnes</option>
              <option value="equipe">L’équipe CanCham</option>
              {personnes.map((x) => (
                <option key={x.id} value={x.id}>{x.nom}{x.specialite ? ` — ${x.specialite}` : ""}</option>
              ))}
            </select>
            <select name="periode" defaultValue={periode === "a_venir" ? "" : periode} aria-label="Période" className={`${CHAMP} w-full sm:w-[200px]`}>
              {PERIODES.map(([k, l]) => <option key={k} value={k === "a_venir" ? "" : k}>{l}</option>)}
            </select>
          </FiltresAuto>

          {liste.length ? (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Membre</Th>
                  <Th>Rendez-vous</Th>
                  <Th>Avec</Th>
                  <Th>Lieu</Th>
                  <Th>Statut</Th>
                  <Th><span className="sr-only">Actions</span></Th>
                </tr>
              </thead>
              <tbody>
                {liste.map((r) => {
                  const retour = `/admin/rendez-vous${periode !== "a_venir" || hote ? `?${new URLSearchParams({ ...(periode !== "a_venir" ? { periode } : {}), ...(hote ? { hote } : {}) })}` : ""}`;
                  const avenir = r.statut !== "annule" && r.jour >= aujourdhui;
                  return (
                    <tr key={r.id}>
                      <Td className="whitespace-nowrap">
                        <b className="text-[13px] first-letter:uppercase block">{fmtJour(r.jour, { weekday: "short", day: "numeric", month: "short" })}</b>
                        <span className="text-[12px] text-muted tabular-nums">{fmtHeure(r.debut)} – {fmtHeure(r.fin)}</span>
                      </Td>
                      <Td className="min-w-[190px]">
                        <div className="flex items-center gap-2.5">
                          <Pastille alt="" initiales={initialesDe(r.entreprise ?? r.personne.nom)} taille={28} />
                          <div className="min-w-0">
                            <b className="text-[13px] block truncate">{r.entreprise ?? r.personne.nom}</b>
                            <span className="text-[12px] text-muted block truncate">{r.entreprise ? r.personne.nom : r.personne.email}</span>
                          </div>
                        </div>
                        {r.motif ? <div className="text-[12px] text-faint mt-1 max-w-[280px] line-clamp-2" title={r.motif}>« {r.motif} »</div> : null}
                      </Td>
                      <Td className="min-w-[160px]">
                        <span className="inline-flex items-center gap-1.5 text-[13px]">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.type.couleur }} />
                          {r.type.titre}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-[13px]">
                          <Pastille alt="" initiales={r.hote ? initialesDe(r.hote.nom) : "CC"} taille={24} />
                          {r.hote?.nom ?? "L’équipe"}
                        </span>
                      </Td>
                      <Td className="text-[12.8px]">
                        <span className="inline-flex items-center gap-1.5">
                          {ICONE_LIEU[r.lieu]}
                          {r.lieu === "visio" && r.lienVisio ? (
                            <a href={r.lienVisio} target="_blank" rel="noopener noreferrer" className="text-accent font-semibold no-underline hover:underline">Salle de visio</a>
                          ) : (
                            libelleLieu(r.lieu).libelle
                          )}
                        </span>
                        {r.lieu === "visio" && !r.lienVisio ? <div className="text-[11.5px] text-warn">Pas de salle de visio réglée</div> : null}
                      </Td>
                      <Td>
                        {r.statut === "annule" ? (
                          <>
                            <Pill tone="muted">Annulé</Pill>
                            {r.annulePar ? <div className="text-[11.5px] text-faint mt-1">par {r.annulePar}</div> : null}
                          </>
                        ) : r.statut === "a_confirmer" ? (
                          <Pill tone="warn">À confirmer</Pill>
                        ) : r.jour < aujourdhui ? (
                          <Pill tone="muted">Passé</Pill>
                        ) : (
                          <Pill tone="ok">Confirmé</Pill>
                        )}
                      </Td>
                      <Td className="text-right">
                        <span className="inline-flex gap-2 justify-end flex-wrap">
                          {r.statut === "a_confirmer" && avenir ? (
                            <form action={confirmerRendezvous}>
                              <input type="hidden" name="rendezvousId" value={r.id} />
                              <input type="hidden" name="retour" value={retour} />
                              <button type="submit" className="btn-action btn-action-sm"><Check size={14} /> Confirmer</button>
                            </form>
                          ) : null}
                          {avenir && r.lieu === "visio" && r.lienVisio ? (
                            <a href={r.lienVisio} target="_blank" rel="noopener noreferrer" className="btn-contour btn-contour-sm text-ink no-underline"><Video size={14} /> Rejoindre</a>
                          ) : null}
                          {avenir ? (
                            <AnnulerRendezvous
                              id={r.id}
                              quand={`${fmtJour(r.jour, { weekday: "long", day: "numeric", month: "long" })}, ${fmtHeure(r.debut)}`}
                              retour={retour}
                              prevenu="le membre"
                            />
                          ) : null}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          ) : (
            <Card>
              <Vide icone={<CalendarClock size={26} />}>
                {periode === "annules" ? "Aucun rendez-vous annulé." : periode === "passes" ? "Aucun rendez-vous passé." : "Aucun rendez-vous à venir."}
                {hote ? " Essayez « Toutes les personnes »." : ""}
              </Vide>
            </Card>
          )}
        </>
      ) : null}

      {onglet === "types" ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {types.map((t) => (
            <CarteType
              key={t.id}
              type={t}
              masque={
                !t.actif ? <Pill tone="muted">Masqué</Pill> : t.hote && !recoivent.some((x) => x.id === t.hote!.id) ? <Pill tone="bad">{t.hote.nom} ne reçoit pas</Pill> : null
              }
              actions={
                <>
                  <Link href={`/admin/rendez-vous/apercu?type=${t.id}`} className="btn-action btn-action-sm no-underline"><Eye size={14} /> Voir la page de réservation</Link>
                  <BoutonCopierLien lien={liens.get(t.id) ?? ""} libelle="Copier le lien" />
                  <ModifierType type={t} personnes={choix} />
                </>
              }
            />
          ))}
          <NouveauType personnes={choix} carte />
        </div>
      ) : null}

      {onglet === "equipe" ? (
        <div className="flex flex-col gap-4">
          <Card className="p-4 flex gap-3 items-start bg-navy-soft border-transparent">
            <Info size={18} className="shrink-0 mt-0.5 text-navy" />
            <div className="text-[13px] text-ink">
              <b>Comment ça marche</b>
              <p className="m-0 mt-1 text-muted">
                Seules les personnes qui reçoivent apparaissent aux membres, avec leur spécialité. Chaque personne a son propre agenda : ses rendez-vous ne se chevauchent pas, mais deux personnes peuvent recevoir à la même heure. Pour la visio, réglez une salle fixe (Google Meet, Zoom…) : son lien part dans la confirmation. Chaque confirmation contient une invitation (.ics) qui s’ajoute à Google Agenda, Outlook ou iPhone. La synchronisation directe avec Google Agenda viendra plus tard.
              </p>
            </div>
          </Card>
          <TableWrap>
            <thead>
              <tr>
                <Th>Personne</Th>
                <Th>Spécialité</Th>
                <Th>Salle de visio</Th>
                <Th className="text-right">Types</Th>
                <Th>Reçoit des rendez-vous</Th>
                <Th><span className="sr-only">Régler</span></Th>
              </tr>
            </thead>
            <tbody>
              {personnes.map((x) => (
                <tr key={x.id} className={x.recoit ? "" : "opacity-70"}>
                  <Td className="min-w-[200px]">
                    <div className="flex items-center gap-2.5">
                      <Pastille src={x.photo} alt="" initiales={initialesDe(x.nom)} taille={34} />
                      <div className="min-w-0">
                        <b className="text-[13px] block truncate">{x.nom}</b>
                        <span className="text-[12px] text-muted block truncate">{x.fonction || x.email}</span>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-[13px]">{x.specialite ?? <span className="text-faint">—</span>}</Td>
                  <Td className="text-[12.8px] max-w-[240px]">
                    {x.lienVisio ? (
                      <a href={x.lienVisio} target="_blank" rel="noopener noreferrer" className="text-accent no-underline hover:underline break-all">{x.lienVisio.replace(/^https:\/\//, "")}</a>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </Td>
                  <Td className="text-right tabular-nums">{x.types}</Td>
                  <Td>{x.recoit ? <Pill tone="ok">Oui</Pill> : <Pill tone="muted">Non</Pill>}</Td>
                  <Td className="text-right"><ReglerPersonne personne={x} /></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <p className="m-0 text-[12.5px] text-muted">
            Les types sans personne désignée sont reçus par « l’équipe CanCham » et restent toujours proposés. Les comptes se gèrent dans{" "}
            <Link href="/admin/abonnement#equipe" className="text-accent">Équipe &amp; accès</Link>.
          </p>
        </div>
      ) : null}
    </>
  );
}
