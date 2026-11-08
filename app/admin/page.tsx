import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  ShoppingBag,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import {
  Compteur,
  EnTeteAdmin,
  Jauge,
  LienFleche,
  Panneau,
  Vide,
} from "@/components/admin/ui";
import { LigneJournal, ilYa } from "@/components/admin/LigneJournal";
import { AddMemberButton } from "@/components/forms/MemberForms";
import { Pastille } from "@/components/messagerie/outils";
import { Saillant, StatusPill } from "@/components/ui";
import { fmtDate, isPast, parseISO, today } from "@/lib/format";
import { FORMULES, fmtMontant, libelleFormule } from "@/lib/membership";
import {
  getEvents,
  getInvoices,
  getMemberStats,
  getUnreadTotal,
} from "@/lib/queries";
import {
  getDemandesAchat,
  getFinancesAnnee,
  getJournal,
  getRepartitionFormules,
} from "@/lib/queries-admin";
import { getCurrentUser } from "@/lib/session";
import { derniersMessagesMembres } from "@/lib/support";

export default async function TableauDeBord() {
  const user = await getCurrentUser("admin");
  const annee = today().getFullYear();

  const [
    stats,
    messages,
    events,
    factures,
    finances,
    formules,
    journal,
    nonLus,
    achats,
  ] = await Promise.all([
    getMemberStats(),
    derniersMessagesMembres(user.id),
    getEvents(),
    getInvoices(),
    getFinancesAnnee(annee),
    getRepartitionFormules(),
    getJournal({ limite: 6 }),
    getUnreadTotal(user.id),
    getDemandesAchat(3),
  ]);

  const aVenir = events.filter((e) => !isPast(e.date)).slice(0, 4);
  const derniers = factures.slice(0, 5);
  const adherents = formules.reduce((n, f) => n + f.n, 0);

  const aujourdhui = today().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <EnTeteAdmin
        surtitre={`Back-office · ${aujourdhui}`}
        titre={
          <>
            Bonjour <Saillant>{user.nom.split(" ")[0]}</Saillant>,
          </>
        }
        actions={<AddMemberButton />}
      />

      <div className="cascade grid gap-4 mb-5 sm:grid-cols-2 xl:grid-cols-4">
        <Compteur
          icone={<Users size={22} />}
          teinte="vert"
          libelle="Membres à jour"
          valeur={stats.aJour}
          detail={`sur ${stats.total} adhérents`}
          href="/admin/membres?statut=a_jour"
        />
        <Compteur
          icone={<UserPlus size={22} />}
          teinte="bleu"
          libelle="Demandes à examiner"
          valeur={stats.candidatures}
          detail={`${stats.enAttente} en attente de paiement`}
          href="/admin/membres?statut=candidature"
        />
        <Compteur
          icone={<Wallet size={22} />}
          teinte="rouge"
          libelle="Cotisations en retard"
          valeur={stats.enRetard}
          detail="à relancer"
          href="/admin/membres?statut=en_retard"
        />
        <Compteur
          icone={<CheckCircle2 size={22} />}
          teinte="vert"
          libelle={`Encaissé en ${annee}`}
          valeur={
            <span className="text-[22px]">
              {fmtMontant(finances.encaisse.CAD, "CAD")}
            </span>
          }
          detail={
            finances.encaisse.MGA
              ? `+ ${fmtMontant(finances.encaisse.MGA, "MGA")} (anciennes factures)`
              : `${finances.factures} facture${finances.factures > 1 ? "s" : ""} émise${finances.factures > 1 ? "s" : ""}`
          }
          href={`/admin/paiements?annee=${annee}`}
        />
      </div>

      <div className="grid gap-4 mb-5 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        <Panneau
          titre={
            <>
              Derniers <Saillant>messages</Saillant>
            </>
          }
          sousTitre="Ce que les membres ont écrit dans le chat du support"
          lien={{ href: "/admin/messagerie", libelle: "Toute la messagerie" }}
          teinte="rouge"
          corpsClassName="px-6 pb-3"
        >
          {messages.length ? (
            <ul className="list-none m-0 p-0">
              {messages.map((m) => {
                const [objet, ...reste] = m.texte.split("\n").filter(Boolean);
                return (
                  <li key={m.id} className="border-t border-line">
                    <Link
                      href={`/admin/messagerie?t=${m.threadId}#msg-${m.id}`}
                      className="flex items-start gap-4 py-3.5 no-underline group"
                    >
                      <Pastille
                        src={m.avatar}
                        alt=""
                        initiales={m.init}
                        taille={40}
                        className="bg-accent-soft text-accent-strong"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-semibold text-ink">
                            {m.auteur}
                          </span>
                          {m.entreprise ? (
                            <span className="text-[12.5px] text-muted">
                              {m.entreprise}
                            </span>
                          ) : null}
                          {m.nonLu ? (
                            <span className="text-[10.5px] font-bold uppercase tracking-[0.04em] px-2 py-0.5 rounded-full bg-accent text-white">
                              Non lu
                            </span>
                          ) : null}
                          <span className="ml-auto text-[12px] text-faint shrink-0">
                            {ilYa(m.le)}
                          </span>
                        </span>
                        <span
                          className={`block text-[13.4px] mt-1 truncate ${
                            m.nonLu ? "text-ink font-semibold" : "text-ink"
                          }`}
                        >
                          {objet ??
                            (m.pieces
                              ? `📎 ${m.pieces} pièce${m.pieces > 1 ? "s" : ""} jointe${m.pieces > 1 ? "s" : ""}`
                              : "")}
                        </span>
                        {reste.length ? (
                          <span className="block text-[12.8px] text-muted truncate">
                            {reste.join(" ")}
                          </span>
                        ) : null}
                      </span>
                      <span className="hidden md:inline-flex self-center items-center gap-1 text-[13px] font-semibold text-accent group-hover:underline shrink-0">
                        Répondre <ChevronRight size={15} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Vide icone={<MessageSquare size={26} />}>
              Aucun message de membre pour l’instant.
            </Vide>
          )}
        </Panneau>

        <Panneau
          titre="Répartition des adhérents"
          sousTitre={`${adherents} adhésions, candidatures exclues`}
          teinte="degrade"
        >
          <div className="flex flex-col gap-3.5">
            {formules.map((f) => (
              <div key={f.formule}>
                <div className="flex items-baseline justify-between gap-3 text-[13px] mb-1.5">
                  <span className="text-ink">{libelleFormule(f.formule)}</span>
                  <span className="text-muted tabular-nums shrink-0">
                    {f.n}
                  </span>
                </div>
                <Jauge
                  valeur={f.n}
                  max={adherents}
                  teinte={
                    FORMULES[f.formule].devise === "CAD" ? "bleu" : "vert"
                  }
                />
              </div>
            ))}
          </div>
          <p className="text-[12px] text-faint m-0 mt-4">
            Toutes les cotisations sont en dollars canadiens.
          </p>
        </Panneau>
      </div>

      <div className="grid gap-4 mb-5 lg:grid-cols-2 items-start">
        <Panneau
          titre="Prochains événements"
          sousTitre="Remplissage des inscriptions"
          lien={{ href: "/admin/evenements", libelle: "Gérer le programme" }}
          teinte="vert"
          corpsClassName="px-6 pb-3"
        >
          {aVenir.length ? (
            <ul className="list-none m-0 p-0">
              {aVenir.map((e) => {
                const d = parseISO(e.date);
                const complet = e.inscrits >= e.cap;
                return (
                  <li key={e.id} className="border-t border-line">
                    <Link
                      href={`/admin/evenements/${e.id}`}
                      className="flex items-center gap-4 py-3.5 no-underline"
                    >
                      <span className="relative w-14 h-14 rounded-lg overflow-hidden bg-surface-2 shrink-0">
                        {e.photo ? (
                          <Image
                            src={e.photo}
                            alt=""
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : null}
                        <span className="absolute inset-0 bg-[#0f1d2c]/55 text-white flex flex-col items-center justify-center leading-none">
                          <span className="titre text-[18px]">
                            {d.getDate()}
                          </span>
                          <span className="text-[9.5px] font-bold uppercase tracking-wider mt-0.5">
                            {d
                              .toLocaleDateString("fr-FR", { month: "short" })
                              .replace(".", "")}
                          </span>
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold text-ink truncate">
                          {e.titre}
                        </span>
                        <span className="flex items-center justify-between gap-3 text-[12px] text-muted mt-0.5 mb-1.5">
                          <span className="truncate">
                            {e.lieu} · {e.format}
                          </span>
                          <span
                            className={`tabular-nums shrink-0 ${complet ? "text-accent font-semibold" : ""}`}
                          >
                            {e.inscrits}/{e.cap}
                            {complet ? " · complet" : ""}
                          </span>
                        </span>
                        <Jauge
                          valeur={e.inscrits}
                          max={e.cap}
                          teinte={complet ? "rouge" : "vert"}
                        />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Vide icone={<CalendarDays size={26} />}>
              Aucun événement programmé.
            </Vide>
          )}
        </Panneau>

        <Panneau
          titre="Derniers paiements"
          sousTitre={
            finances.enAttente
              ? `${finances.enAttente} facture${finances.enAttente > 1 ? "s" : ""} en attente de règlement en ${annee}`
              : `Aucune facture en attente en ${annee}`
          }
          lien={{ href: "/admin/paiements", libelle: "Toutes les factures" }}
          teinte="bleu"
          corpsClassName="px-6 pb-3"
        >
          {derniers.length ? (
            <ul className="list-none m-0 p-0">
              {derniers.map((f) => (
                <li
                  key={f.id}
                  className="border-t border-line flex items-center gap-4 py-3"
                >
                  <span className="min-w-0 flex-1">
                    {f.membreId ? (
                      <Link
                        href={`/admin/membres/${f.membreId}`}
                        className="block text-[14px] font-semibold text-ink no-underline hover:text-accent truncate"
                      >
                        {f.membre}
                      </Link>
                    ) : (
                      <span className="block text-[14px] font-semibold text-ink truncate">
                        {f.membre}
                        <span className="font-normal text-faint">
                          {" "}
                          · supprimé
                        </span>
                      </span>
                    )}
                    <span className="block text-[12px] text-muted truncate">
                      <Link
                        href={`/admin/paiements/${f.id}`}
                        className="font-[family-name:var(--font-mono)] text-muted no-underline hover:text-accent"
                      >
                        {f.numero}
                      </Link>{" "}
                      · {fmtDate(f.date, { day: "numeric", month: "short" })}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-[14px] font-semibold tabular-nums text-ink">
                      {fmtMontant(f.montant, f.devise)}
                    </span>
                    <StatusPill status={f.statut} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Vide icone={<Wallet size={26} />}>Aucune facture émise.</Vide>
          )}
        </Panneau>
      </div>

      <div className="grid gap-4 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        <Panneau
          titre={
            <>
              Activité <Saillant ton="vert">récente</Saillant>
            </>
          }
          sousTitre="Les dernières opérations de l’équipe et des membres"
          lien={{ href: "/admin/journal", libelle: "Tout le journal" }}
          teinte="degrade"
          corpsClassName="px-6 pb-3"
        >
          {journal.entrees.length ? (
            <div>
              {journal.entrees.map((e) => (
                <LigneJournal key={e.id} entree={e} compacte />
              ))}
            </div>
          ) : (
            <Vide>Aucune opération enregistrée pour l’instant.</Vide>
          )}
        </Panneau>

        <div className="flex flex-col gap-4">
          <Compteur
            icone={<MessageSquare size={22} />}
            teinte="bleu"
            libelle="Messagerie"
            valeur={nonLus}
            detail={
              nonLus
                ? `message${nonLus > 1 ? "s" : ""} non lu${nonLus > 1 ? "s" : ""}`
                : "Tout est lu"
            }
            href="/admin/messagerie"
          />

          <Panneau
            titre="Demandes d’achat"
            sousTitre="Ressources payantes demandées par les membres"
            teinte="rouge"
            corpsClassName="px-6 pb-5"
          >
            {achats.length ? (
              <ul className="list-none m-0 p-0 flex flex-col gap-3">
                {achats.map((a) => (
                  <li key={a.id} className="flex gap-3 items-start">
                    <span className="w-9 h-9 rounded-lg bg-[#14263a] text-white flex items-center justify-center shrink-0">
                      <ShoppingBag size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-ink">
                        {a.detail}
                      </span>
                      <span className="block text-[11.5px] text-faint">
                        {a.acteur} · {ilYa(a.date)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted m-0">
                Aucune demande pour l’instant.
              </p>
            )}
            <div className="mt-4">
              <LienFleche href="/admin/ressources">
                Gérer les ressources
              </LienFleche>
            </div>
          </Panneau>

          <Link
            href="/membre"
            className="inline-flex items-center justify-center gap-2 text-[13px] font-semibold text-muted no-underline hover:text-accent"
          >
            Voir l’espace comme un membre <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </>
  );
}
