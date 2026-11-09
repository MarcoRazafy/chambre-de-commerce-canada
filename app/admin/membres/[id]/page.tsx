import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  X,
  Globe,
  User as UserIcon,
  MapPin,
} from "lucide-react";
import { EtatAcces } from "@/components/admin/EtatAcces";
import { Jauge, Onglets, Panneau, Vide } from "@/components/admin/ui";
import { EtiquettesMembre } from "@/components/maillage/EtiquettesMembre";
import { EtatQuestionnaireAdmin, ListeRelations, ListeSuggestions } from "@/components/maillage/PanneauxMaillage";
import { chargerMaillage, relations, suggestions } from "@/lib/maillage-donnees";
import { prisma } from "@/lib/db";
import { LigneJournal } from "@/components/admin/LigneJournal";
import { Agrandir } from "@/components/Agrandir";
import { CouvertureReglable } from "@/components/CouvertureReglable";
import { VideoPresentation } from "@/components/VideoPresentation";
import { CarrouselSection } from "@/components/CarrouselSection";
import { CarteService } from "@/components/CarteService";
import {
  ListeContacts,
  LogoMark,
  NeedsAndInterests,
  Visuel,
  PuceSecteur,
} from "@/components/domain";
import {
  AddContactButton,
  AjouterBesoinButton,
  AjouterServiceButton,
  DeleteMemberButton,
  EditContactButton,
  ModifierAdhesionButton,
  ModifierFormuleButton,
  ModifierReglementButton,
  EditProfileButton,
  ModifierServiceButton,
  RemoveContactButton,
  SupprimerServiceButton,
  RegisterPaymentButton,
  ReconsidererButton,
  RejectButton,
  ReminderButton,
  RenvoyerInvitationButton,
} from "@/components/forms/MemberForms";
import { BoutonMessage } from "@/components/forms/MessageMembre";
import { NotesMembre } from "@/components/forms/NotesMembre";
import { TexteLie } from "@/components/TexteLie";
import { Card, Pill, Saillant, StatusPill } from "@/components/ui";
import { PROVISOIRE, saisi } from "@/lib/accueil";
import { fmtDate } from "@/lib/format";
import { affichageSite } from "@/lib/liens";
import { positionObjet } from "@/lib/cadrage";
import {
  RETARD_BLOCAGE_JOURS,
  cotisationAnnuelle,
  fmtCotisation,
  fmtMontant,
  joursDeRetard,
  libelleFormule,
} from "@/lib/membership";
import {
  dernierReglementCotisation,
  fmtJour,
  renouvellementCotisation,
} from "@/lib/agenda";
import { getAccesMembre } from "@/lib/acces-membres";
import { getContacts, getInvoices, getMember } from "@/lib/queries";
import { getHistoriqueMembre, getNotesMembre } from "@/lib/queries-admin";
import { situation } from "@/lib/situation";

const ONGLETS = ["profil", "factures", "activite", "maillage"] as const;
type Onglet = (typeof ONGLETS)[number];

export default async function AdminMembreDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const demande = (await searchParams).onglet;
  const onglet: Onglet = ONGLETS.includes(demande as Onglet) ? (demande as Onglet) : "profil";
  const m = await getMember(id);
  if (!m) notFound();

  const [contacts, factures, historique, acces, commentaires, maillage, sugg, rels, etiquettes] =
    await Promise.all([
      getContacts(m.id),
      getInvoices(m.id),
      getHistoriqueMembre(m.id),
      getAccesMembre(m.id),
      getNotesMembre(m.id),
      chargerMaillage(m.id),
      suggestions(m.id),
      relations(m.id),
      prisma.member.findUnique({ where: { id: m.id }, select: { etiquettes: true, offresTags: true, besoinsTags: true, interetsTags: true } }),
    ]);
  const candidature = m.statut === "candidature";
  const dernierReglement = dernierReglementCotisation(factures);
  const renouvellement = renouvellementCotisation({
    factures,
    adhesion: m.adhesion,
    aJour: m.statut === "a_jour",
  });
  const fiche = `/admin/membres/${m.id}`;

  const s = situation(m);
  const jours = joursDeRetard(m);
  const dossier = m.motivation || m.statutJuridique || m.pays;

  return (
    <>
      <Card className="overflow-hidden p-0 mb-4">
        <CouvertureReglable
          memberId={m.id}
          src={m.cover}
          cadrage={m.cadrage}
          retour={`/admin/membres/${m.id}`}
          className="h-[170px] w-full"
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
              className="h-[170px] w-full"
              sizes="(max-width: 1240px) 100vw, 1200px"
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
        <div className="px-6 py-5 flex gap-5 flex-wrap items-start justify-between">
          <div className="flex gap-4 min-w-0">
            <LogoMark member={m} size={64} />
            <div className="min-w-0">
              <h1 className="m-0 mb-2 text-[clamp(22px,2.6vw,28px)]">
                {m.nom}
              </h1>
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
                <Pill>{libelleFormule(m.formule)}</Pill>
                {m.type === "physique" ? (
                  <Pill icon={<UserIcon size={10} />}>Indépendant</Pill>
                ) : null}
                <Pill>
                  Membre depuis{" "}
                  {fmtDate(m.adhesion, { month: "long", year: "numeric" })}
                </Pill>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 flex-wrap">
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
              retour={fiche}
            />
            <BoutonMessage memberId={m.id} space="admin" />
          </div>
        </div>
      </Card>

      <Onglets
        actif={onglet}
        onglets={[
          { cle: "profil", libelle: "Profil", href: fiche },
          { cle: "factures", libelle: "Factures", href: `${fiche}?onglet=factures`, compte: factures.length },
          { cle: "activite", libelle: "Activité", href: `${fiche}?onglet=activite` },
          { cle: "maillage", libelle: "Maillage", href: `${fiche}?onglet=maillage` },
        ]}
      />

      {onglet === "profil" ? (
      <div className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4 min-w-0">
          <Panneau titre="Présentation" teinte="degrade">
            <p className="m-0 font-semibold text-[14.5px]">
              <TexteLie texte={m.activite} />
            </p>
            <p className="m-0 mt-1.5 text-muted text-[14px] leading-relaxed max-w-[75ch] whitespace-pre-line">
              <TexteLie texte={m.desc} />
            </p>
            <NeedsAndInterests
              member={m}
              action={<AjouterBesoinButton memberId={m.id} retour={fiche} />}
            />
          </Panneau>

          {dossier ? (
            <Panneau
              titre={
                <>
                  Dossier de <Saillant ton="vert">candidature</Saillant>
                </>
              }
              sousTitre="Les réponses données à l’inscription"
              teinte="vert"
            >
              <div className="grid gap-4 mb-4 sm:grid-cols-3">
                <Donnee libelle="Statut juridique" valeur={m.statutJuridique} />
                <Donnee libelle="Pays d’implantation" valeur={m.pays} />
                <Donnee
                  libelle="Formule demandée"
                  valeur={
                    m.formule
                      ? `${libelleFormule(m.formule)} · ${fmtCotisation(m.formule)}`
                      : "Pas encore choisie"
                  }
                />
              </div>
              {m.motivation ? (
                <>
                  <div className="text-[12.3px] font-semibold text-muted mb-1.5">
                    Motivation à rejoindre CanCham
                  </div>
                  <p className="m-0 text-[13.6px] text-ink leading-relaxed whitespace-pre-line">
                    <TexteLie texte={m.motivation} />
                  </p>
                </>
              ) : null}
            </Panneau>
          ) : null}

          <Card className="carte-filet filet-fixe filet-bleu px-6 pb-6">
            {contacts.length ? (
              <ListeContacts
                contacts={contacts}
                titre={m.type === "physique" ? "Contact" : "Contacts"}
                intro="Les personnes déclarées par le membre. Le contact principal est joint en premier."
                action={<AddContactButton memberId={m.id} retour={fiche} />}
                actionContact={(c) => (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <EditContactButton
                      contact={c}
                      seul={contacts.length === 1}
                      retour={fiche}
                    />
                    {contacts.length > 1 ? (
                      <RemoveContactButton
                        contactId={c.id}
                        nom={c.nom}
                        retour={fiche}
                      />
                    ) : null}
                  </div>
                )}
                piedContact={(c) =>
                  c.invitationEnAttente &&
                  !candidature &&
                  c.id !== acces.contact?.id ? (
                    <div className="mt-2.5 flex flex-col items-start gap-1.5">
                      <Pill tone="warn">Jamais connecté</Pill>
                      <RenvoyerInvitationButton
                        contactId={c.id}
                        retour={`/admin/membres/${m.id}`}
                      />
                    </div>
                  ) : null
                }
              />
            ) : (
              <div className="pt-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-[18px] m-0">Contacts</h2>
                  <AddContactButton memberId={m.id} retour={fiche} />
                </div>
                <p className="m-0 mt-2 text-[13.4px] text-muted">
                  Aucun contact déclaré par ce membre.
                </p>
              </div>
            )}
          </Card>

          <Panneau
            titre="Produits & services"
            sousTitre={`${m.produits.length} offre${m.produits.length > 1 ? "s" : ""} au catalogue du membre`}
            teinte="rouge"
            action={<AjouterServiceButton memberId={m.id} retour={fiche} />}
          >
            {m.produits.length ? (
              <CarrouselSection libelle={`Produits et services de ${m.nom}`}>
                {m.produits.map((p, i) => (
                  <CarteService
                    key={p.id ?? i}
                    produit={p}
                    seed={m.id + p.label}
                    actions={
                      <>
                        <ModifierServiceButton produit={p} retour={fiche} />
                        <SupprimerServiceButton
                          produitId={p.id!}
                          label={p.label}
                          retour={fiche}
                        />
                      </>
                    }
                  />
                ))}
              </CarrouselSection>
            ) : (
              <p className="m-0 text-[13.4px] text-muted">
                Aucune offre au catalogue pour le moment.
              </p>
            )}
          </Panneau>
        </div>

        <div className="flex flex-col gap-4">
          <Panneau titre="Vidéo de l’entreprise" teinte="bleu">
            <div>
              <VideoPresentation
                memberId={m.id}
                nom={m.nom}
                fichier={m.video}
                gestion={fiche}
              />
            </div>
          </Panneau>

          <Panneau titre="Tags" sousTitre="Repères internes de l’équipe, invisibles pour le membre" teinte="degrade">
            <EtiquettesMembre memberId={m.id} champ="etiquettes" valeurs={etiquettes?.etiquettes ?? []} />
          </Panneau>

          <NotesMembre memberId={m.id} notes={commentaires} />

          <Card className="p-5 border-dashed">
            <div className="surtitre text-faint mb-2">Zone sensible</div>
            <p className="m-0 mb-3 text-[12.5px] text-muted">
              La suppression retire le membre, ses contacts et ses inscriptions.
              Ses factures restent dans les paiements, à son nom.
            </p>
            <DeleteMemberButton memberId={m.id} nom={m.nom} />
          </Card>
        </div>
      </div>
      ) : null}

      {onglet === "factures" ? (
      <div className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4 min-w-0">
          <Panneau
            titre="Factures"
            teinte="bleu"
            lien={
              factures.length
                ? {
                    href: `/admin/paiements?q=${encodeURIComponent(m.nom)}`,
                    libelle: "Toutes",
                  }
                : undefined
            }
            corpsClassName="px-6 pb-4"
          >
            {factures.length ? (
              <ul className="list-none m-0 p-0">
                {factures.map((f) => (
                  <li key={f.id} className="border-t border-line">
                    <Link
                      href={`/admin/paiements/${f.id}`}
                      className="flex items-center gap-3 py-2.5 no-underline group"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-ink truncate group-hover:text-accent">
                          {f.objet}
                        </span>
                        <span className="block text-[11.5px] text-muted font-[family-name:var(--font-mono)]">
                          {f.numero} ·{" "}
                          {fmtDate(f.date, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="block text-[13px] font-semibold tabular-nums text-ink">
                          {fmtMontant(f.montant, f.devise)}
                        </span>
                        <StatusPill status={f.statut} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-[13px] text-muted">
                Aucune facture émise pour ce membre.
              </p>
            )}
          </Panneau>
        </div>
        <div className="flex flex-col gap-4">
          <Panneau
            titre="Adhésion & cotisation"
            teinte={s.urgent ? "rouge" : "vert"}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <StatusPill status={m.statut} />
            </div>
            <p
              className={`m-0 mt-2 text-[13px] ${s.urgent ? "text-accent font-semibold" : "text-muted"}`}
            >
              {s.detail}
            </p>

            {m.statut === "en_retard" ? (
              <div className="mt-3">
                <Jauge
                  valeur={Math.min(jours, RETARD_BLOCAGE_JOURS)}
                  max={RETARD_BLOCAGE_JOURS}
                  teinte="rouge"
                />
                <p className="m-0 mt-1.5 text-[11.5px] text-faint">
                  L’accès se restreint seul après {RETARD_BLOCAGE_JOURS} jours
                  de retard.
                </p>
              </div>
            ) : null}

            <dl className="m-0 mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
              <dt className="text-muted">Membre depuis</dt>
              <dd className="m-0 text-ink flex items-center justify-end gap-2">
                {fmtDate(m.adhesion)}
                <ModifierAdhesionButton
                  memberId={m.id}
                  nom={m.nom}
                  adhesion={m.adhesion}
                />
              </dd>
              <dt className="text-muted">Formule</dt>
              <dd className="m-0 text-ink flex items-center justify-end gap-2">
                {libelleFormule(m.formule)}
                <ModifierFormuleButton
                  memberId={m.id}
                  nom={m.nom}
                  formule={m.formule}
                />
              </dd>
              <dt className="text-muted">Cotisation</dt>
              <dd className="m-0 text-ink text-right font-semibold tabular-nums">
                {cotisationAnnuelle(m.formule)}
              </dd>
              {m.paiementNote || dernierReglement ? (
                <>
                  <dt className="text-muted">Dernier règlement</dt>
                  <dd className="m-0 text-ink flex items-center justify-end gap-2 text-right">
                    <span>
                      {m.paiementNote
                        ? m.paiementNote.replace(/^Payé par /, "")
                        : fmtDate(dernierReglement!)}
                    </span>
                    {dernierReglement ? (
                      <ModifierReglementButton
                        memberId={m.id}
                        nom={m.nom}
                        date={dernierReglement}
                      />
                    ) : null}
                  </dd>
                </>
              ) : null}
              {candidature ? null : (
                <>
                  <dt className="text-muted">Prochain renouvellement</dt>
                  <dd className="m-0 text-ink text-right">
                    {renouvellement
                      ? fmtJour(renouvellement)
                      : "Au premier règlement"}
                  </dd>
                </>
              )}
            </dl>

            <div className="flex flex-col gap-2 mt-5">
              {candidature ? (
                <>
                  <EtatAcces
                    acces={acces}
                    memberId={m.id}
                    nom={m.nom}
                    candidature
                    retour={fiche}
                    large
                  />
                  <RejectButton memberId={m.id} nom={m.nom} />
                </>
              ) : m.statut === "refusee" ? (
                <>
                  <p className="m-0 flex items-center gap-2 rounded-[var(--radius-s)] bg-bad-soft px-3 py-2.5 text-[13px] text-bad">
                    <X size={16} className="shrink-0" />
                    Demande refusée : rien n’en paraît côté membre.
                  </p>
                  {commentaires.map((c) => (
                    <figure
                      key={c.id}
                      className="m-0 rounded-[var(--radius-s)] border border-line bg-surface-2 px-3.5 py-3"
                    >
                      <blockquote className="m-0 whitespace-pre-line text-[13.4px] leading-relaxed text-ink [overflow-wrap:anywhere]">
                        {c.texte}
                      </blockquote>
                      <figcaption className="mt-1.5 text-[12px] text-muted">
                        {c.auteur} · {fmtJour(c.date.slice(0, 10))}
                      </figcaption>
                    </figure>
                  ))}
                  <ReconsidererButton memberId={m.id} nom={m.nom} />
                </>
              ) : m.statut === "a_jour" ? (
                <p className="m-0 flex items-center gap-2 text-[13px] text-success-strong bg-success-soft rounded-[var(--radius-s)] px-3 py-2.5">
                  <CheckCircle2 size={16} className="shrink-0" />
                  Cotisation réglée : aucun règlement à enregistrer.
                </p>
              ) : (
                <RegisterPaymentButton
                  memberId={m.id}
                  premier={!m.paiementNote}
                  nom={m.nom}
                  formule={m.formule}
                />
              )}
              {m.statut === "en_retard" || m.statut === "en_attente" ? (
                <ReminderButton memberId={m.id} />
              ) : null}
            </div>

            {candidature ? null : (
              <div className="mt-5 pt-4 border-t border-line">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-[12.5px] font-semibold text-muted">
                    Accès à la plateforme
                  </span>
                  {acces.etat === "actif" || acces.etat === "sans_contact" ? (
                    <EtatAcces
                      acces={acces}
                      memberId={m.id}
                      nom={m.nom}
                      candidature={false}
                      retour={fiche}
                    />
                  ) : null}
                </div>
                {acces.etat === "invite" || acces.etat === "a_envoyer" ? (
                  <EtatAcces
                    acces={acces}
                    memberId={m.id}
                    nom={m.nom}
                    candidature={false}
                    retour={fiche}
                    large
                  />
                ) : null}
                <p className="m-0 mt-2 text-[12px] text-faint">
                  {acces.contact
                    ? acces.etat === "actif"
                      ? `${acces.contact.nom} se connecte avec ${acces.contact.email}.`
                      : `Le lien pour créer son mot de passe part à ${acces.contact.email}.`
                    : "Il faut un contact avec une adresse e-mail pour ouvrir l’accès."}
                </p>
              </div>
            )}
          </Panneau>
        </div>
      </div>
      ) : null}

      {onglet === "activite" ? (
      <div className="flex flex-col gap-4">
          <Panneau
            titre="Historique"
            teinte="degrade"
            corpsClassName="px-6 pb-3"
          >
            {historique.length ? (
              historique
                                .map((e) => <LigneJournal key={e.id} entree={e} compacte />)
            ) : (
              <Vide>Aucune opération enregistrée.</Vide>
            )}
          </Panneau>
      </div>
      ) : null}

      {onglet === "maillage" ? (
      <div className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4 min-w-0">
          {maillage ? <EtatQuestionnaireAdmin d={maillage} /> : null}
          <Panneau titre="Suggestions de mises en relation" sousTitre="Rapprochements entre ce que le membre recherche et ce que d’autres proposent" teinte="rouge">
            <ListeSuggestions suggestions={sugg} memberId={m.id} espace="admin" retour={`${fiche}?onglet=maillage`} />
          </Panneau>
          <Panneau titre="Mises en relation" teinte="bleu">
            <ListeRelations relations={rels} espace="admin" />
          </Panneau>
        </div>
        <div className="flex flex-col gap-4">
          <Panneau titre="Ce qu’il propose" teinte="degrade">
            <EtiquettesMembre memberId={m.id} champ="offresTags" valeurs={etiquettes?.offresTags ?? []} ton="bleu" />
          </Panneau>
          <Panneau titre="Ce qu’il recherche" teinte="rouge">
            <EtiquettesMembre memberId={m.id} champ="besoinsTags" valeurs={etiquettes?.besoinsTags ?? []} />
          </Panneau>
          <Panneau titre="Ses centres d’intérêt" teinte="vert">
            <EtiquettesMembre memberId={m.id} champ="interetsTags" valeurs={etiquettes?.interetsTags ?? []} ton="vert" />
          </Panneau>
        </div>
      </div>
      ) : null}
    </>
  );
}

function Donnee({ libelle, valeur }: { libelle: string; valeur?: string }) {
  return (
    <div>
      <div className="text-[12.3px] font-semibold text-muted mb-1">
        {libelle}
      </div>
      <div className="text-[13.6px] text-ink">{valeur || "—"}</div>
    </div>
  );
}
