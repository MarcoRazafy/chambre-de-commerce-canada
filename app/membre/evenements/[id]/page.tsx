import { ListeIntervenants } from "@/components/Intervenants";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCheck,
  Clock,
  CreditCard,
  Headset,
  MapPin,
  Users,
} from "lucide-react";
import { EventCard, Visuel } from "@/components/domain";
import { Agrandir } from "@/components/Agrandir";
import { Partage } from "@/components/Partage";
import { CodeAccueil } from "@/components/CodeAccueil";
import { TexteLie } from "@/components/TexteLie";
import { Banner, Card, Kicker, Saillant, Stat } from "@/components/ui";
import {
  CancelRegistrationButton,
  RegisterButton,
} from "@/components/forms/EventForms";
import {
  getEvent,
  getEvents,
  getMember,
  getContacts,
  getRegistration,
} from "@/lib/queries";
import { matriceQr } from "@/lib/qr";
import { prisma } from "@/lib/db";
import { fmtMontant } from "@/lib/membership";
import { modesBientot, modesProposes } from "@/lib/reglements";
import { FenetreMoyens } from "@/components/paiement/FenetreMoyens";
import { getCurrentUser } from "@/lib/session";
import { plageHoraire } from "@/lib/agenda";
import { fmtDate, fmtMoney, isPast } from "@/lib/format";

export default async function EvenementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ regler?: string }>;
}) {
  const { id } = await params;
  const { regler } = await searchParams;
  const e = await getEvent(id);
  if (!e) notFound();
  const horaire = plageHoraire(e.debut, e.fin);

  const user = await getCurrentUser("membre");
  const [reg, tous, membre, contacts, modesPaiement] = await Promise.all([
    getRegistration(e.id, user.memberId),
    getEvents(),
    user.memberId ? getMember(user.memberId) : null,
    user.memberId ? getContacts(user.memberId) : [],
    e.payant ? modesProposes() : [],
  ]);

  const entreprise = membre?.nom ?? null;

  const aRegler =
    regler && user.memberId && e.payant
      ? await prisma.invoice.findFirst({
          where: { id: regler, memberId: user.memberId, statut: "envoyee" },
          select: {
            id: true,
            numero: true,
            objet: true,
            montant: true,
            devise: true,
          },
        })
      : null;

  const past = isPast(e.date);
  const restantes = e.cap - e.inscrits;
  const remplissage = Math.min(100, Math.round((e.inscrits / e.cap) * 100));

  const autres = tous
    .filter((a) => a.id !== e.id && !isPast(a.date))
    .slice(0, 3);

  return (
    <>
      {aRegler ? (
        <FenetreMoyens
          facture={{
            id: aRegler.id,
            numero: aRegler.numero,
            objet: aRegler.objet,
            montant: fmtMontant(aRegler.montant, aRegler.devise),
          }}
          modes={modesPaiement}
          bientot={await modesBientot()}
          ouverteAuDepart
        />
      ) : null}
      <div className="relative rounded-[var(--radius-l)] overflow-hidden mb-4">
        <Agrandir
          src={e.photo}
          alt={e.titre}
          legende={e.titre}
          className="block"
        >
          <Partage nom={`evenement-${e.id}`}>
            <Visuel
              src={e.photo}
              alt={e.titre}
              seed={e.id}
              className="h-[300px] w-full"
              sizes="(max-width: 1024px) 100vw, 1000px"
              icon={<CalendarDays size={34} />}
            />
          </Partage>
        </Agrandir>
        <div className="absolute inset-0 bg-linear-to-t from-[#0f1d2c]/90 via-[#0f1d2c]/35 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col gap-2">
          <div className="flex gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-[0.09em] px-2.5 py-1 rounded-md bg-white/15 text-white backdrop-blur-sm">
              {e.format}
            </span>
            {past ? (
              <span className="text-[11px] font-bold uppercase tracking-[0.09em] px-2.5 py-1 rounded-md bg-white/15 text-white backdrop-blur-sm">
                Déjà passé
              </span>
            ) : null}
          </div>
          <h1 className="m-0 text-white text-[30px] leading-[1.15] drop-shadow-sm">
            {e.titre}
          </h1>
          <div className="flex gap-4 flex-wrap text-[13.4px] text-white/85">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={15} /> {fmtDate(e.date)}
            </span>
            {horaire ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={15} /> {horaire}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={15} /> {e.lieu}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 items-start lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="carte-filet filet-fixe filet-degrade p-[22px]">
            <Kicker>À propos</Kicker>
            <div className="mt-2.5 flex flex-col gap-3.5 text-muted text-[14.3px] leading-[1.75]">
              {e.desc.split("\n\n").map((para, i) => (
                <p key={i} className="m-0">
                  <TexteLie texte={para} />
                </p>
              ))}
            </div>
          </Card>

          {e.programme && e.programme.length > 0 ? (
            <Card className="carte-filet filet-fixe filet-rouge p-[22px]">
              <Kicker>Au programme</Kicker>
              <h2 className="mt-1.5 mb-4 text-[19px]">
                Le déroulé de la {<Saillant>séance</Saillant>}
              </h2>
              <ol className="list-none m-0 p-0 flex flex-col">
                {e.programme.map((etape, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="flex flex-col items-center shrink-0 w-[68px]">
                      <span className="font-[family-name:var(--font-mono)] text-[12.4px] font-bold text-accent-strong whitespace-nowrap">
                        {etape.heure}
                      </span>
                      {i < e.programme!.length - 1 ? (
                        <span className="w-px flex-1 bg-line my-1.5" />
                      ) : null}
                    </div>
                    <div className={i < e.programme!.length - 1 ? "pb-5" : ""}>
                      <div className="text-[14.5px] font-semibold text-ink">
                        {etape.titre}
                      </div>
                      {etape.detail ? (
                        <p className="m-0 mt-1 text-[13px] text-muted leading-relaxed">
                          <TexteLie texte={etape.detail} />
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}

          {e.intervenants?.length ? (
            <Card className="carte-filet filet-fixe filet-bleu p-[22px]">
              <Kicker>{e.intervenants.length > 1 ? "Les intervenants" : "L’intervenant"}</Kicker>
              <h2 className="mt-1.5 mb-4 text-[19px]">
                Qui {e.intervenants.length > 1 ? "interviennent" : "intervient"} {<Saillant>pendant la séance</Saillant>}
              </h2>
              <ListeIntervenants intervenants={e.intervenants} />
            </Card>
          ) : null}

          {e.pourQui ? (
            <Card className="carte-filet filet-fixe filet-vert p-[22px]">
              <Kicker>Public visé</Kicker>
              <h2 className="mt-1.5 mb-2 text-[19px]">
                À qui s’adresse ce {<Saillant ton="vert">rendez-vous</Saillant>}
              </h2>
              <p className="m-0 text-muted text-[14px] leading-relaxed">
                <TexteLie texte={e.pourQui} />
              </p>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
          <Card className="p-[22px]">
            <div className="flex flex-col gap-1.5 mb-3.5">
              <div className="text-[11.5px] uppercase tracking-[0.08em] text-faint font-semibold">
                Tarif
              </div>
              <div className="font-[family-name:var(--font-display)] text-[22px] font-semibold">
                {e.payant ? fmtMoney(e.prix) : "Gratuit"}
              </div>
              <div className="text-xs text-muted">
                {e.payant ? "Réglable sur place" : "Ouvert à tous les membres"}
              </div>
            </div>

            {past ? (
              <div className="text-xs text-muted">
                Cet événement a déjà eu lieu le {fmtDate(e.date)}.
              </div>
            ) : reg?.aValider ? (
              <>
                <Banner
                  tone="warn"
                  icon={<Clock size={18} />}
                  title="Inscription en attente de validation"
                >
                  {`${fmtMoney(e.prix * (reg.representants?.length ?? 1))} à régler auprès de l’équipe CanCham. Vos billets et vos QR codes partent par e-mail dès que le règlement est constaté.`}
                </Banner>
                <ul className="list-none m-0 mt-3.5 p-0 flex flex-col gap-1 text-[13px] text-muted">
                  {(reg.representants ?? []).map((r) => (
                    <li key={r.code}>{r.nom}</li>
                  ))}
                </ul>
                <div className="mt-3.5">
                  <CancelRegistrationButton eventId={e.id} />
                </div>
              </>
            ) : reg ? (
              <>
                <Banner
                  tone="ok"
                  icon={<CheckCheck size={18} />}
                  title="Inscription confirmée"
                >
                  {(reg.representants ?? []).length > 1
                    ? `${reg.representants?.length} représentants : chacun présente son QR code à l’accueil.`
                    : `Code ${reg.code}`}
                </Banner>
                <div className="mt-3.5">
                  <CancelRegistrationButton eventId={e.id} />
                </div>
                {(reg.representants ?? [{ nom: "", code: reg.code }]).map(
                  (r) => (
                    <div key={r.code}>
                      {(reg.representants ?? []).length > 1 ? (
                        <div className="mt-4 -mb-1 text-[13px] font-semibold text-ink">
                          {r.nom}
                        </div>
                      ) : null}
                      <CodeAccueil
                        code={r.code}
                        {...matriceQr(r.code)}
                        billet={{
                          titre: e.titre,
                          quand: [fmtDate(e.date), horaire]
                            .filter(Boolean)
                            .join(" · "),
                          lieu: e.lieu,
                          participant: [r.nom || user.nom, entreprise]
                            .filter(Boolean)
                            .join(" · "),
                        }}
                      />
                    </div>
                  ),
                )}
              </>
            ) : (
              <>
                <Stat k="Places restantes" v={restantes} />
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${remplissage}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11.8px] text-faint">
                    {e.inscrits} inscrits sur {e.cap} places · {remplissage} %
                  </div>
                </div>
                <div className="mt-3.5">
                  {restantes > 0 ? (
                    <RegisterButton
                      event={e}
                      libelle="S’inscrire"
                      entreprise={entreprise ?? ""}
                      contacts={contacts}
                      moi={user.id}
                      coordonnees={{ email: user.email, telephone: user.tel }}
                      modesPaiement={modesPaiement}
                    />
                  ) : (
                    <p className="text-[13px] text-muted m-0 text-center">
                      Événement complet.
                    </p>
                  )}
                </div>
              </>
            )}
          </Card>

          <Card className="p-[22px]">
            <Kicker>Infos pratiques</Kicker>
            <dl className="m-0 mt-3 flex flex-col">
              <Pratique icone={<CalendarDays size={15} />} cle="Date">
                {fmtDate(e.date)}
              </Pratique>
              {horaire ? (
                <Pratique icone={<Clock size={15} />} cle="Horaire">
                  {horaire}
                </Pratique>
              ) : null}
              <Pratique icone={<MapPin size={15} />} cle="Lieu">
                {e.lieu}
              </Pratique>
              <Pratique icone={<Users size={15} />} cle="Capacité">
                {e.cap} places
              </Pratique>
              <Pratique icone={<CreditCard size={15} />} cle="Participation">
                {e.payant ? fmtMoney(e.prix) : "Gratuit"}
              </Pratique>
            </dl>
          </Card>

          <Card className="tuile-hote carte-filet filet-fixe filet-vert p-[22px] flex gap-3.5">
            <span className="tuile tuile-sm tuile-verte">
              <Headset size={20} />
            </span>
            <div className="min-w-0">
              <div className="text-[14.5px] font-semibold text-ink">
                Une question ?
              </div>
              <p className="m-0 mt-1 text-[12.8px] text-muted leading-relaxed">
                L’équipe de la chambre répond sur l’organisation, l’accès et les
                modalités de règlement.
              </p>
              <Link
                href="/membre/messagerie"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent no-underline mt-2.5 hover:underline"
              >
                Écrire à l’équipe <ArrowRight size={14} />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {autres.length > 0 ? (
        <section className="mt-7">
          <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
            <div>
              <Kicker>Et ensuite</Kicker>
              <h2 className="mt-1 mb-0 text-[20px]">
                Autres rendez-vous {<Saillant>à venir</Saillant>}
              </h2>
            </div>
            {/* Retiré pour l'instant (Agenda) : à décommenter pour le remettre
            <Link
              href="/membre/agenda?vue=liste"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent no-underline hover:underline"
            >
              Tout l’agenda <ArrowRight size={14} />
            </Link>
            */}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {autres.map((a) => (
              <EventCard
                key={a.id}
                event={a}
                href={`/membre/evenements/${a.id}`}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function Pratique({
  icone,
  cle,
  children,
}: {
  icone: React.ReactNode;
  cle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-line last:border-b-0">
      <span className="text-faint shrink-0 mt-px">{icone}</span>
      <dt className="text-[12.8px] text-muted w-[92px] shrink-0">{cle}</dt>
      <dd className="m-0 text-[13.2px] font-semibold text-ink min-w-0">
        {children}
      </dd>
    </div>
  );
}
