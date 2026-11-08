import { notFound } from "next/navigation";
import { BoutonCertificat } from "@/components/BoutonCertificat";
import { CertificatAdhesion } from "@/components/Certificat";
import {
  Building2,
  CalendarClock,
  CalendarDays,
  Newspaper,
  Globe,
  CreditCard,
  User as UserIcon,
  MapPin,
  Sparkles,
} from "lucide-react";
import {
  ListeContacts,
  LogoMark,
  NeedsAndInterests,
  Visuel,
  PuceSecteur,
} from "@/components/domain";
import { Agrandir } from "@/components/Agrandir";
import { CouvertureReglable } from "@/components/CouvertureReglable";
import { VideoPresentation } from "@/components/VideoPresentation";
import Link from "next/link";
import { Onglets, Panneau, Vide } from "@/components/admin/ui";
import { EtiquettesMembre } from "@/components/maillage/EtiquettesMembre";
import { Avancement, ListeRelations, ListeSuggestions } from "@/components/maillage/PanneauxMaillage";
import { RepondreQuestionnaire } from "@/components/maillage/RepondreQuestionnaire";
import { activiteMembre, chargerMaillage, relations, suggestions } from "@/lib/maillage-donnees";
import { prisma } from "@/lib/db";
import { TexteLie } from "@/components/TexteLie";
import { CarrouselSection } from "@/components/CarrouselSection";
import { CarteService } from "@/components/CarteService";
import {
  AddContactButton,
  AjouterServiceButton,
  ModifierServiceButton,
  SupprimerServiceButton,
  EditContactButton,
  EditProfileButton,
  RemoveContactButton,
} from "@/components/forms/MemberForms";
import { PROVISOIRE, saisi } from "@/lib/accueil";
import {
  Banner,
  BtnLink,
  Card,
  Pill,
  Saillant,
  SectionTitle,
  Stat,
  StatusPill,
  TableWrap,
  Td,
  Th,
  ViewHead,
} from "@/components/ui";
import { getContacts, getInvoices, getMember } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { affichageSite } from "@/lib/liens";
import { positionObjet } from "@/lib/cadrage";
import { fmtJour, renouvellementCotisation } from "@/lib/agenda";
import { fmtDate, fmtDateShort } from "@/lib/format";
import { fmtCotisation, fmtMontant, libelleFormule } from "@/lib/membership";
import { ADHESION_PENDING } from "@/lib/membership";

const CADRE_COUVERTURE = "h-[190px] w-full sm:h-[260px]";

const ONGLETS = ["profil", "factures", "activite", "maillage"] as const;
type Onglet = (typeof ONGLETS)[number];
const ICONES_ACTIVITE = { evenement: CalendarDays, rendezvous: CalendarClock, publication: Newspaper, relation: Sparkles };

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string }>;
}) {
  const demande = (await searchParams).onglet;
  const onglet: Onglet = ONGLETS.includes(demande as Onglet) ? (demande as Onglet) : "profil";
  const user = await getCurrentUser("membre");
  const m = await getMember(user.memberId!);
  if (!m) notFound();
  const [myInvoices, contacts, maillage, sugg, rels, activite, tags] = await Promise.all([
    getInvoices(m.id),
    getContacts(m.id),
    chargerMaillage(m.id),
    suggestions(m.id),
    relations(m.id),
    activiteMembre(m.id),
    prisma.member.findUnique({ where: { id: m.id }, select: { offresTags: true, besoinsTags: true, interetsTags: true } }),
  ]);
  const page = "/membre/profil";

  const pending = ADHESION_PENDING.includes(m.statut);
  const renouvellement = renouvellementCotisation({
    factures: myInvoices,
    adhesion: m.adhesion,
    aJour: m.statut === "a_jour",
  });

  return (
    <>
      <ViewHead
        title={<>Mon <Saillant>entreprise</Saillant></>}
        action={
          <div className="flex gap-2 flex-wrap">
            <EditProfileButton
              memberId={m.id}
              nom={saisi(m.nom, PROVISOIRE.entreprise)}
              independant={m.type === "physique"}
              ville={m.ville}
              pays={m.pays}
              motivation={m.motivation}
              secteur={saisi(m.secteur, PROVISOIRE.secteur)}
              activite={m.activite}
              desc={m.desc}
              besoins={m.besoins}
              interets={m.interets}
              siteweb={m.siteweb}
              cover={m.cover}
              logo={m.logo}
            />
            {!pending ? (
              <BoutonCertificat>
                <CertificatAdhesion membre={m} fin={renouvellement} />
              </BoutonCertificat>
            ) : null}
          </div>
        }
      />

      {m.accueilEnCours ? (
        <div className="mb-5">
          <Banner
            tone="ok"
            icon={<Sparkles size={18} />}
            title="Votre inscription n’est pas terminée"
            action={
              <BtnLink href="/bienvenue" variant="primary" sm>
                Reprendre
              </BtnLink>
            }
          >
            Présentez-vous, votre entreprise, votre formule et votre activité en
            quatre étapes rapides : votre fiche sera complète dans l’annuaire,
            et l’équipe pourra examiner votre demande.
          </Banner>
        </div>
      ) : null}

      <Card className="overflow-hidden mb-[22px] p-0">
        <CouvertureReglable
          memberId={m.id}
          src={m.cover}
          cadrage={m.cadrage}
          retour="/membre/profil"
          className={CADRE_COUVERTURE}
        >
          <Agrandir
            src={m.cover}
            alt={`Couverture de ${m.nom}`}
            legende={m.nom}
          >
            <Visuel
              src={m.cover}
              position={positionObjet(m.cadrage)}
              alt=""
              seed={m.id}
              className={CADRE_COUVERTURE}
              sizes="(max-width: 1024px) 100vw, 900px"
              icon={
                m.type === "physique" ? (
                  <UserIcon size={26} />
                ) : (
                  <Building2 size={26} />
                )
              }
            />
          </Agrandir>
        </CouvertureReglable>
        <div className="flow-root p-[22px]">
          <div>
            <div className="flex gap-4">
              <LogoMark member={m} size={64} />
              <div>
                <h1 className="m-0 mb-2 text-[22px]">{m.nom}</h1>
                <div className="flex gap-1.5 flex-wrap items-center">
                  <PuceSecteur secteur={m.secteur} grand />
                  <span className="inline-flex items-center gap-1 text-muted text-[13.4px]">
                    <MapPin size={13} /> {m.ville}
                    {m.pays ? ` · ${m.pays}` : ""}
                  </span>
                </div>
                {m.siteweb ? (
                  <a
                    href={m.siteweb}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1 text-[13.2px] font-semibold text-accent no-underline hover:underline"
                  >
                    <Globe size={14} className="shrink-0" />
                    {affichageSite(m.siteweb)}
                  </a>
                ) : null}
                <div className="flex gap-1.5 flex-wrap pt-2.5">
                  <StatusPill status={m.statut} />
                  {m.type === "physique" ? (
                    <Pill icon={<UserIcon size={10} />}>
                      Indépendant · personne physique
                    </Pill>
                  ) : null}
                  <Pill>
                    Membre depuis {fmtDate(m.adhesion, { year: "numeric" })}
                  </Pill>
                </div>
              </div>
            </div>

            <p className="mt-[18px] font-semibold text-[14.5px]">
              <TexteLie texte={m.activite} />
            </p>
            <p className="mt-1.5 text-muted text-[14px] leading-relaxed max-w-[70ch] whitespace-pre-line">
              <TexteLie texte={m.desc} />
            </p>
          </div>

        </div>
      </Card>

      <Onglets
        actif={onglet}
        onglets={[
          { cle: "profil", libelle: "Profil", href: page },
          { cle: "factures", libelle: "Factures", href: `${page}?onglet=factures`, compte: myInvoices.length },
          { cle: "activite", libelle: "Activité", href: `${page}?onglet=activite` },
          { cle: "maillage", libelle: "Maillage", href: `${page}?onglet=maillage` },
        ]}
      />

      {onglet === "profil" ? (
        <div className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="p-[22px] min-w-0">
          <NeedsAndInterests member={m} aRemplir />

          {m.motivation ? (
            <>
              <div className="flex items-center gap-2.5 mt-[22px] mb-2">
                <div className="w-[3px] self-stretch min-h-[18px] bg-accent rounded-sm" />
                <h2 className="text-[17px] font-semibold m-0">
                  Vos <Saillant>motivations</Saillant>
                </h2>
              </div>
              <p className="m-0 text-[14px] text-muted leading-relaxed max-w-[70ch] whitespace-pre-line">
                <TexteLie texte={m.motivation} />
              </p>
            </>
          ) : null}

          <div className="clear-both flex items-center gap-2.5 mt-[22px] mb-3.5 flex-wrap">
            <div className="w-[3px] self-stretch min-h-[18px] bg-accent rounded-sm" />
            <h2 className="text-[17px] font-semibold m-0">
              Produits &amp; services
            </h2>
            <span className="flex-1" />
            <AjouterServiceButton memberId={m.id} />
          </div>
          {m.produits.length ? (
            <CarrouselSection libelle={`Produits et services de ${m.nom}`}>
              {m.produits.map((p, i) => (
                <CarteService
                  key={p.id ?? i}
                  produit={p}
                  seed={m.id + p.label}
                  actions={
                    <>
                      <ModifierServiceButton produit={p} />
                      <SupprimerServiceButton
                        produitId={p.id!}
                        label={p.label}
                      />
                    </>
                  }
                />
              ))}
            </CarrouselSection>
          ) : (
            <p className="m-0 text-[13.4px] text-muted border border-dashed border-line rounded-[var(--radius-m)] px-4 py-6 text-center">
              Aucune offre pour le moment. Ajoutez votre premier produit ou
              service : il apparaîtra sur votre fiche et dans l’annuaire.
            </p>
          )}

          <ListeContacts
            contacts={contacts}
            titre={m.type === "physique" ? "Contact" : "Contacts"}
            intro="Les personnes que la chambre peut joindre chez vous. Le contact principal est celui qu’elle appelle en premier."
            action={<AddContactButton memberId={m.id} />}
            actionContact={(c) => (
              <div className="flex flex-col gap-1.5 shrink-0">
                <EditContactButton contact={c} seul={contacts.length === 1} />
                {contacts.length > 1 ? (
                  <RemoveContactButton contactId={c.id} nom={c.nom} />
                ) : null}
              </div>
            )}
          />
          </Card>
          <div className="flex flex-col gap-4">
            <Panneau titre="Vidéo de l’entreprise" teinte="bleu">
              <VideoPresentation memberId={m.id} nom={m.nom} fichier={m.video} gestion={page} />
            </Panneau>
            <Panneau
              titre="Suggestions de maillage"
              sousTitre="Les membres qui proposent ce que vous recherchez"
              teinte="rouge"
              lien={{ href: `${page}?onglet=maillage`, libelle: "Tout voir" }}
            >
              <ListeSuggestions suggestions={sugg} memberId={m.id} espace="membre" limite={3} />
            </Panneau>
          </div>
        </div>
      ) : null}

      {onglet === "factures" ? (
        <>
      <SectionTitle>Statut d’adhésion</SectionTitle>
      <div className="grid gap-4 mb-[22px] md:grid-cols-2 xl:grid-cols-4">
        <Stat
          k="Formule"
          v={
            <span className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold leading-snug">
                {libelleFormule(m.formule)}
              </span>
              <span className="text-[13px] text-accent-strong font-semibold">
                {m.formule ? (
                  <>
                    {fmtCotisation(m.formule)}{" "}
                    <span className="text-muted font-normal">/ par an</span>
                  </>
                ) : (
                  <span className="text-muted font-normal">
                    Choisissez votre formule pour connaître votre cotisation.
                  </span>
                )}
              </span>
            </span>
          }
        />
        <Stat
          k="Adhésion"
          v={
            <span className="flex flex-col gap-1">
              <span className="text-[19px]">
                <StatusPill status={m.statut} />
              </span>
              <span className="text-[12.5px] text-muted">
                {renouvellement
                  ? `Renouvellement le ${fmtJour(renouvellement)}`
                  : "Renouvellement au premier règlement"}
              </span>
            </span>
          }
        />
        <Stat
          k="Membre depuis"
          v={<span className="text-[19px]">{fmtDateShort(m.adhesion)}</span>}
        />
        <Stat
          k={m.paiementNote ? "Dernier paiement" : "Prochain renouvellement"}
          v={
            <span className="text-[14px] font-semibold leading-snug">
              {m.paiementNote ??
                (renouvellement
                  ? fmtJour(renouvellement)
                  : "Au premier règlement")}
            </span>
          }
        />
      </div>

      <SectionTitle>Historique des paiements</SectionTitle>
      <TableWrap>
        <thead>
          <tr>
            <Th>Facture</Th>
            <Th>Date</Th>
            <Th>Objet</Th>
            <Th>Montant</Th>
            <Th>Statut</Th>
          </tr>
        </thead>
        <tbody>
          {myInvoices.length ? (
            myInvoices.map((f) => (
              <tr key={f.id} className="hover:bg-surface-2">
                <Td className="font-[family-name:var(--font-mono)]">
                  {f.numero}
                </Td>
                <Td className="text-muted">{fmtDateShort(f.date)}</Td>
                <Td>{f.objet}</Td>
                <Td className="font-[family-name:var(--font-mono)]">
                  {fmtMontant(f.montant, f.devise)}
                </Td>
                <Td>
                  <StatusPill status={f.statut} />
                </Td>
              </tr>
            ))
          ) : (
            <tr>
              <Td className="text-muted text-center py-5">
                Aucune facture pour le moment.
              </Td>
            </tr>
          )}
        </tbody>
      </TableWrap>

      <p className="text-[11.5px] text-faint mt-4 flex items-center gap-1.5">
        <CreditCard size={12} />
        Paiement en ligne non branché : en V1 l’équipe CanCham enregistre les
        règlements depuis le back-office.
      </p>
        </>
      ) : null}

      {onglet === "activite" ? (
        <Panneau titre="Mon activité" sousTitre="Vos inscriptions, rendez-vous, publications et mises en relation" teinte="degrade" corpsClassName="px-6 pb-4">
          {activite.length ? (
            <ul className="list-none m-0 p-0">
              {activite.map((a, i) => {
                const Icone = ICONES_ACTIVITE[a.icone];
                return (
                  <li key={i} className="border-t border-line first:border-t-0">
                    <Link href={a.lien} className="flex items-center gap-3 py-3 no-underline group">
                      <span className="tuile tuile-sm tuile-bleue shrink-0"><Icone size={18} /></span>
                      <span className="min-w-0 flex-1 text-[13.6px] text-ink group-hover:text-accent">{a.texte}</span>
                      <span className="text-[12px] text-muted shrink-0">{fmtDate(a.quand.slice(0, 10))}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Vide>Pas encore d’activité : inscrivez-vous à un événement ou prenez rendez-vous avec la Chambre.</Vide>
          )}
        </Panneau>
      ) : null}

      {onglet === "maillage" && maillage ? (
        <div className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-4 min-w-0">
            <Panneau titre="Questionnaire de maillage" sousTitre="Seize questions pour que la Chambre vous présente les bons partenaires" teinte={maillage.pct === 100 ? "vert" : "rouge"}>
              <Avancement d={maillage} />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="m-0 text-[13px] text-muted">
                  {maillage.pct === 100 ? "Merci : vos réponses servent aux suggestions." : "Environ 15 minutes ; vos réponses s’enregistrent au fur et à mesure."}
                </p>
                <RepondreQuestionnaire memberId={m.id} reponses={maillage.reponses} secteurs={maillage.secteurs} commence={maillage.commence} fini={maillage.pct === 100} />
              </div>
            </Panneau>
            <Panneau titre="Mes mises en relation" sousTitre="Les entreprises que la Chambre vous a présentées" teinte="bleu">
              <ListeRelations relations={rels} espace="membre" />
            </Panneau>
            <Panneau titre="Suggestions" sousTitre="Membres qui proposent ce que vous recherchez : écrivez à la Chambre pour être présentés" teinte="rouge">
              <ListeSuggestions suggestions={sugg} memberId={m.id} espace="membre" />
            </Panneau>
          </div>
          <div className="flex flex-col gap-4">
            <Panneau titre="Ce que vous proposez" teinte="degrade">
              <EtiquettesMembre memberId={m.id} champ="offresTags" valeurs={tags?.offresTags ?? []} ton="bleu" />
            </Panneau>
            <Panneau titre="Ce que vous recherchez" teinte="rouge">
              <EtiquettesMembre memberId={m.id} champ="besoinsTags" valeurs={tags?.besoinsTags ?? []} />
            </Panneau>
            <Panneau titre="Vos centres d’intérêt" teinte="vert">
              <EtiquettesMembre memberId={m.id} champ="interetsTags" valeurs={tags?.interetsTags ?? []} ton="vert" />
            </Panneau>
          </div>
        </div>
      ) : null}
    </>
  );
}
