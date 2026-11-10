import { Eye, EyeOff, Gift } from "lucide-react";
import { OfferCard } from "@/components/domain";
import { OffreButton, SupprimerOffreButton } from "@/components/forms/AdminContenuForms";
import { EnTeteAdmin, Vide } from "@/components/admin/ui";
import { Card, Saillant } from "@/components/ui";
import { OFFRES_ACCUEIL } from "@/lib/offres";
import { getMembers, getOffers } from "@/lib/queries";

// Offres & promotions des membres, montrées sur l'accueil de l'espace membre (les plus récentes d'abord)
export default async function OffresAdmin() {
  const [offres, membres] = await Promise.all([getOffers(), getMembers()]);
  const proposants = membres.filter((m) => m.statut !== "candidature").map((m) => ({ id: m.id, nom: m.nom }));
  // Ce que voient les membres : les plus récentes qui vont sur l'accueil
  const surAccueil = new Set(
    offres.filter((o) => o.emplacement !== "actualites").slice(0, OFFRES_ACCUEIL).map((o) => o.id),
  );

  return (
    <>
      <EnTeteAdmin
        surtitre="Activités"
        titre={<>Offres &amp; <Saillant>promotions</Saillant></>}
        actions={<OffreButton membres={proposants} />}
      />

      {offres.length ? (
        <div className="cascade grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {offres.map((o) => {
            const visible = surAccueil.has(o.id);
            return (
              <div key={o.id} className="flex flex-col gap-2">
                <OfferCard
                  offer={o}
                  etiquette={
                    visible ? (
                      <><Eye size={12} aria-hidden /> Sur l’accueil des membres</>
                    ) : (
                      <><EyeOff size={12} aria-hidden /> En réserve</>
                    )
                  }
                />
                <div className="flex items-center justify-end gap-1.5">
                  <OffreButton offre={o} membres={proposants} />
                  <SupprimerOffreButton offerId={o.id} titre={o.titre} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <Vide icone={<Gift size={28} />}>Aucune offre pour le moment.</Vide>
        </Card>
      )}

      {offres.length > OFFRES_ACCUEIL ? (
        <p className="mt-5 mb-0 text-[13px] text-muted">
          Les membres voient les {OFFRES_ACCUEIL} offres les plus récentes. Les autres restent en réserve :
          retirez-en une pour faire remonter la suivante.
        </p>
      ) : null}
    </>
  );
}
