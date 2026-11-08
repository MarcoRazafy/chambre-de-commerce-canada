import { notFound } from "next/navigation";
import { Partage } from "@/components/Partage";
import {
  Building2,
  Globe,
  User as UserIcon,
} from "lucide-react";
import {
  ListeContacts,
  LogoMark,
  NeedsAndInterests,
  PuceSecteur,
  Visuel,
} from "@/components/domain";
import { Agrandir } from "@/components/Agrandir";
import { PresentationAvecVideo } from "@/components/VideoPresentation";
import { TexteLie } from "@/components/TexteLie";
import { CarrouselSection } from "@/components/CarrouselSection";
import { CarteService } from "@/components/CarteService";
import { BoutonMessage } from "@/components/forms/MessageMembre";
import { Card, Pill } from "@/components/ui";
import { getContacts, getMember } from "@/lib/queries";
import { fmtDate } from "@/lib/format";
import { affichageSite } from "@/lib/liens";
import { positionObjet } from "@/lib/cadrage";

export async function FicheAnnuairePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const m = await getMember(id);
  if (!m || m.statut === "candidature") notFound();
  const contacts = await getContacts(m.id);

  return (
    <>
      {/* Le bouton « Retour » de la barre du haut ramène à l'annuaire */}
      <div className="mb-4 flex items-center justify-end gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <BoutonMessage memberId={m.id} space="membre" />
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <Agrandir src={m.cover} alt={`Couverture de ${m.nom}`} legende={m.nom}>
          <Visuel
            src={m.cover}
            position={positionObjet(m.cadrage)}
            alt=""
            seed={m.id}
            className="h-[190px] w-full sm:h-[260px]"
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
        <div className="flow-root p-[22px]">
          <PresentationAvecVideo memberId={m.id} nom={m.nom} fichier={m.video}>
            <div className="flex gap-4 flex-wrap justify-between">
              <div className="flex gap-4">
                <Partage nom={`membre-${m.id}`}>
                  <div className="shrink-0">
                    <LogoMark member={m} size={64} />
                  </div>
                </Partage>
                <div>
                  <h1 className="m-0 mb-2 text-[22px]">{m.nom}</h1>
                  <PuceSecteur secteur={m.secteur} grand />
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
            </div>

            <p className="mt-5 font-semibold text-[14.5px]">
              <TexteLie texte={m.activite} />
            </p>
            <p className="mt-1.5 text-muted text-[14px] leading-relaxed max-w-[70ch] whitespace-pre-line">
              <TexteLie texte={m.desc} />
            </p>
          </PresentationAvecVideo>

          <NeedsAndInterests member={m} />

          <div className="clear-both flex items-center gap-2.5 mt-[22px] mb-3.5 flex-wrap">
            <div className="w-[3px] self-stretch min-h-[18px] bg-accent rounded-sm" />
            <h2 className="text-[17px] font-semibold m-0">
              Produits &amp; services
            </h2>
          </div>
          {m.produits.length ? (
            <CarrouselSection libelle={`Produits et services de ${m.nom}`}>
              {m.produits.map((p, i) => (
                <CarteService
                  key={p.id ?? i}
                  produit={p}
                  seed={m.id + p.label}
                />
              ))}
            </CarrouselSection>
          ) : (
            <p className="m-0 text-[13.4px] text-muted border border-dashed border-line rounded-[var(--radius-m)] px-4 py-6 text-center">
              Cette entreprise n’a pas encore présenté ses produits et services.
            </p>
          )}

          <ListeContacts
            contacts={contacts}
            titre={m.type === "physique" ? "Contact" : "Contacts"}
            intro="Écrivez directement à la bonne personne plutôt qu’à une adresse générique."
          />
        </div>
      </Card>
    </>
  );
}
