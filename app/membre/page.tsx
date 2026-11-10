import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Lock,
  Mail,
  MapPin,
} from "lucide-react";
import { AvatarRond, OfferCard } from "@/components/domain";
import { TexteLie } from "@/components/TexteLie";
import { RegisterButton } from "@/components/forms/EventForms";
import { Card, Saillant } from "@/components/ui";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Agenda / Actualités retirés pour l'instant, gardé pour les remettre
import { CetteSemaine } from "@/components/agenda/CetteSemaine";
import { plageHoraire } from "@/lib/agenda";
import { fmtMoney, isPast, parseISO } from "@/lib/format";
import {
  ADHESION_PENDING,
  isOverdueWarning,
  joursDeRetard,
  retardBloque,
  RETARD_BLOCAGE_JOURS,
} from "@/lib/membership";
import {
  getContacts,
  getEvents,
  getMember,
  getMembresAnnuaire,
  getDernieresOffres,
  getRegistrations,
  getResources,
  getServices,
  getUnreadTotal,
} from "@/lib/queries";
import { modesProposes } from "@/lib/reglements";
import { OFFRES_ACCUEIL } from "@/lib/offres";
import { getCurrentUser } from "@/lib/session";
import { initialesDe, teinteDe } from "@/lib/avatars";

export default async function VueDEnsemble() {
  const user = await getCurrentUser("membre");
  const membreOuNull = await getMember(user.memberId!);
  if (!membreOuNull) notFound();
  const me = membreOuNull;

  const [
    events,
    annuaire,
    inscriptions,
    nonLus,
    offres,
    ressources,
    services,
    contacts,
    modesPaiement,
  ] = await Promise.all([
    getEvents(),
    getMembresAnnuaire(),
    getRegistrations(me.id),
    getUnreadTotal(user.id),
    getDernieresOffres(OFFRES_ACCUEIL),
    getResources(),
    getServices(),
    // Agenda retiré pour l'instant (bloc « Cette semaine » plus bas) : remettre « semaine » ci-dessus et
    // getAgenda({ userId: user.id, memberId: me.id }, aujourdhuiISO(), ajouterJours(aujourdhuiISO(), 6)),
    getContacts(me.id),
    modesProposes(),
  ]);

  const aVenir = events.filter((e) => !isPast(e.date));
  const prochain = aVenir[0];
  const dejaInscrit = prochain
    ? inscriptions.some((r) => r.eventId === prochain.id)
    : false;

  const aDecouvrir = annuaire.filter((m) => m.id !== me.id).slice(0, 3);
  const ressource = ressources[0];
  const service = services.find((s) => s.type === "payant") ?? services[0];

  const enAttente = ADHESION_PENDING.includes(me.statut);
  const bloque = retardBloque(me);
  const enRetard = isOverdueWarning(me);

  return (
    <>
      <div className="flex items-start justify-between gap-6 flex-wrap mb-6">
        <div>
          <span className="surtitre text-faint">
            Votre réseau Canada–Madagascar
          </span>
          <h1 className="text-[clamp(28px,3.4vw,38px)] m-0 mt-2">
            Bonjour <Saillant>{user.nom.split(" ")[0]}</Saillant>,
          </h1>
        </div>
      </div>

      <BandeauAdhesion
        enAttente={enAttente}
        bloque={bloque}
        enRetard={enRetard}
        jours={joursDeRetard(me)}
      />

      <Card className="carte-filet filet-fixe filet-degrade p-6 mb-5">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="text-[19px] m-0">
              Offres &amp; promotions {<Saillant ton="vert">membres</Saillant>}
            </h2>
          </div>
          {/* Retiré pour l'instant (Actualités) : à décommenter pour le remettre
          <Link
            href="/membre/actualites"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent no-underline hover:underline"
          >
            Toutes les offres <ArrowRight size={14} />
          </Link>
          */}
        </div>

        {offres.length ? (
          <div className="cascade grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offres.map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>
        ) : (
          <p className="m-0 text-[13.5px] text-muted">
            Aucune offre mise en avant pour le moment.
          </p>
        )}
      </Card>

      <div className="grid gap-4 mb-5 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        <Card className="carte-filet filet-fixe filet-degrade p-0">
          <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4">
            <h2 className="text-[19px] m-0">Votre prochain rendez-vous</h2>
            <Link
              href="/membre/evenements"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent no-underline hover:underline"
            >
              Tous les événements <ArrowRight size={14} />
            </Link>
          </div>

          {prochain ? (
            <>
              <Link
                href={`/membre/evenements/${prochain.id}`}
                className="relative mx-5 sm:mx-6 rounded-xl overflow-hidden aspect-[16/9] sm:aspect-[16/7] bg-surface-2 block group"
              >
                {prochain.photo ? (
                  <Image
                    src={prochain.photo}
                    alt={prochain.titre}
                    fill
                    sizes="(max-width: 1024px) 100vw, 700px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : null}
              </Link>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 px-5 sm:px-6 py-5">
                <div className="flex items-center gap-4 min-w-0 sm:contents">
                  <PastilleDate date={prochain.date} />

                  <div className="min-w-0 flex-1">
                    <h3 className="text-[18px] m-0 mb-2">{prochain.titre}</h3>
                    <div className="flex gap-4 flex-wrap text-[13px] text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={14} /> {prochain.lieu}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={14} />{" "}
                        {plageHoraire(prochain.debut, prochain.fin) ??
                          prochain.format}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 sm:contents">
                  <span className="inline-flex items-center text-[12px] font-semibold px-3 py-1.5 rounded-md bg-success-soft text-success-strong">
                    {prochain.payant ? fmtMoney(prochain.prix) : "Inclus"}
                  </span>

                  {dejaInscrit ? (
                    <Link
                      href={`/membre/evenements/${prochain.id}`}
                      className="btn-contour btn-contour-sm text-success hover:bg-success-soft"
                    >
                      <CheckCircle2 size={15} /> Inscrit
                    </Link>
                  ) : (
                    <RegisterButton
                      event={prochain}
                      entreprise={me.nom}
                      contacts={contacts}
                      moi={user.id}
                      coordonnees={{ email: user.email, telephone: user.tel }}
                      modesPaiement={modesPaiement}
                      libelle="M’inscrire"
                    />
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="px-6 pb-6 text-muted">Aucun rendez-vous programmé.</p>
          )}
        </Card>

        <Card className="carte-filet filet-fixe filet-vert p-6">
          <h2 className="text-[19px] m-0">
            Développez votre {<Saillant>réseau</Saillant>}
          </h2>
          <p className="text-[13.5px] text-muted m-0 mt-1 mb-4">
            Des entreprises à découvrir
          </p>

          <div className="flex flex-col">
            {aDecouvrir.map((m, i) => (
              <Link
                key={m.id}
                href={`/membre/annuaire/${m.id}`}
                className={`flex items-center gap-3.5 py-3.5 no-underline group ${
                  i < aDecouvrir.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <AvatarRond
                  src={m.photo}
                  alt={m.nom}
                  initiales={initialesDe(m.nom)}
                  taille={44}
                  className="text-[13px]"
                  style={teinteDe(m.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold text-ink truncate">
                    {m.nom}
                  </span>
                  <span className="block text-[12.5px] text-muted truncate">
                    {m.secteur}
                  </span>
                </span>
                <ChevronRight
                  size={17}
                  className="text-faint shrink-0 group-hover:text-accent"
                />
              </Link>
            ))}
          </div>

          <p className="text-[12.5px] text-muted mt-4 mb-3">
            Trouvez des partenaires selon vos besoins.
          </p>
          <Link
            href="/membre/annuaire"
            className="btn-contour btn-contour-sm w-full text-accent hover:bg-accent-soft"
          >
            Ouvrir l’annuaire
          </Link>
        </Card>
      </div>

      {/* Retiré pour l'instant (Agenda) : à décommenter pour le remettre
      <CetteSemaine
        elements={semaine.filter((e) => !e.fait).slice(0, 5)}
        aujourdhui={aujourdhui}
      />
      */}

      <div className="grid gap-4 md:grid-cols-3">
        <Raccourci
          icone={<Mail size={24} />}
          surtitre="Vos échanges"
          titre={`${nonLus} nouveau${nonLus > 1 ? "x" : ""} message${nonLus > 1 ? "s" : ""}`}
          detail="Avec les membres et l’équipe CanCham."
          lien="Ouvrir la messagerie"
          href="/membre/messagerie"
          teinte="bleu"
        />
        {ressource ? (
          <Raccourci
            icone={<FileText size={24} />}
            surtitre="Ressource à découvrir"
            titre={ressource.titre}
            pastille={
              ressource.type === "gratuit" ? "Inclus" : fmtMoney(ressource.prix)
            }
            lien="Consulter"
            href="/membre/ressources"
            teinte="rouge"
          />
        ) : null}
        {service ? (
          <Raccourci
            icone={<Briefcase size={24} />}
            surtitre="Services CanCham"
            titre={service.titre}
            detail={service.desc}
            lien="Voir les services"
            href="/membre/offres-cancham"
            teinte="vert"
          />
        ) : null}
      </div>
    </>
  );
}

function BandeauAdhesion({
  enAttente,
  bloque,
  enRetard,
  jours,
}: {
  enAttente: boolean;
  bloque: boolean;
  enRetard: boolean;
  jours: number;
}) {
  if (!enAttente && !bloque && !enRetard) return null;

  const contenu = enAttente
    ? {
        icone: <Clock size={22} />,
        titre: "Cotisation à régler",
        texte:
          "L’accès complet à votre espace est activé dès le règlement de la cotisation.",
        pastille: "En attente",
      }
    : bloque
      ? {
          icone: <Lock size={22} />,
          titre: `Accès restreint : ${jours} jours de retard`,
          texte:
            "Régularisez votre cotisation pour retrouver l’ensemble de vos services.",
          pastille: "Restreint",
        }
      : enRetard
        ? {
            icone: <Clock size={22} />,
            titre: "Cotisation en retard",
            texte: `Régularisez avant ${RETARD_BLOCAGE_JOURS} jours de retard (${jours}/${RETARD_BLOCAGE_JOURS} écoulés).`,
            pastille: "À régulariser",
          }
        : {
            icone: <Clock size={22} />,
            titre: "Cotisation en retard",
            texte: "Régularisez votre cotisation pour conserver votre accès.",
            pastille: "À régulariser",
          };

  return (
    <div className="flex items-center gap-4 flex-wrap rounded-xl border-l-4 px-5 py-4 mb-5 bg-bad-soft border-l-bad border border-bad/25">
      <span className="text-bad">{contenu.icone}</span>

      <div className="min-w-0 flex-1">
        <div className="text-[15.5px] font-semibold text-ink">
          {contenu.titre}
        </div>
        <div className="text-[13.5px] text-muted mt-0.5">{contenu.texte}</div>
      </div>

      <span className="text-[12.5px] font-semibold px-3.5 py-1.5 rounded-full bg-bad/20 text-bad">
        {contenu.pastille}
      </span>

      <Link
        href="/membre/cotisations"
        className="btn-contour btn-contour-sm border-line text-muted hover:bg-surface-2"
      >
        Voir ma cotisation
      </Link>
    </div>
  );
}

const TEINTES_COMPTEUR = {
  rouge: { tuile: "tuile-rouge", filet: "filet-rouge" },
  vert: { tuile: "tuile-verte", filet: "filet-vert" },
  bleu: { tuile: "tuile-bleue", filet: "filet-bleu" },
} as const;

function PastilleDate({ date }: { date: string }) {
  const d = parseISO(date);
  const mois = d
    .toLocaleDateString("fr-FR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  return (
    <span className="pastille w-[74px] shrink-0 rounded-xl bg-accent text-white text-center py-2.5">
      <span className="titre block text-[26px] leading-none">
        {d.getDate()}
      </span>
      <span className="block text-[10.5px] font-bold tracking-wider mt-1">
        {mois}
      </span>
    </span>
  );
}

function Raccourci({
  icone,
  surtitre,
  titre,
  detail,
  pastille,
  lien,
  href,
  teinte = "rouge",
}: {
  icone: React.ReactNode;
  surtitre: string;
  titre: string;
  detail?: string;
  pastille?: string;
  lien: string;
  href: string;
  teinte?: keyof typeof TEINTES_COMPTEUR;
}) {
  return (
    <Card
      className={`tuile-hote carte-filet filet-fixe ${TEINTES_COMPTEUR[teinte].filet} p-5 flex gap-4`}
    >
      <span className={`tuile tuile-sm ${TEINTES_COMPTEUR[teinte].tuile}`}>
        {icone}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-muted">{surtitre}</div>
        <div className="flex items-start gap-2.5 mt-0.5">
          <span className="text-[15px] font-semibold text-ink">{titre}</span>
          {pastille ? (
            <span className="text-[11.5px] font-semibold px-2.5 py-1 rounded-md bg-success-soft text-success-strong shrink-0">
              {pastille}
            </span>
          ) : null}
        </div>
        {detail ? (
          <p className="text-[12.5px] text-muted mt-1.5 mb-0 line-clamp-2">
            <TexteLie texte={detail} />
          </p>
        ) : null}
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent no-underline mt-3 hover:underline"
        >
          {lien} <ArrowRight size={14} />
        </Link>
      </div>
    </Card>
  );
}
