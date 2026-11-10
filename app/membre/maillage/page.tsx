import { notFound } from "next/navigation";
import { Panneau } from "@/components/admin/ui";
import { EtiquettesMembre } from "@/components/maillage/EtiquettesMembre";
import { Avancement, ListeRelations, ListeSuggestions } from "@/components/maillage/PanneauxMaillage";
import { RepondreQuestionnaire } from "@/components/maillage/RepondreQuestionnaire";
import { Saillant, ViewHead } from "@/components/ui";
import { prisma } from "@/lib/db";
import { chargerMaillage, relations, suggestions } from "@/lib/maillage-donnees";
import { getCurrentUser } from "@/lib/session";

// Maillage du membre : le questionnaire, ses mises en relation, les suggestions et ses étiquettes
export default async function MaillageMembre() {
  const user = await getCurrentUser("membre");
  if (!user.memberId) notFound();
  const [maillage, sugg, rels, tags] = await Promise.all([
    chargerMaillage(user.memberId),
    suggestions(user.memberId),
    relations(user.memberId),
    prisma.member.findUnique({ where: { id: user.memberId }, select: { offresTags: true, besoinsTags: true, interetsTags: true } }),
  ]);
  if (!maillage) notFound();
  const id = user.memberId;

  return (
    <>
      <ViewHead title={<><Saillant>Maillage</Saillant></>} />
      <div className="grid gap-4 items-start grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4 min-w-0">
          <Panneau titre="Questionnaire de maillage" sousTitre="Seize questions pour que la Chambre vous présente les bons partenaires" teinte={maillage.pct === 100 ? "vert" : "rouge"}>
            <Avancement d={maillage} />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 text-[13px] text-muted">
                {maillage.pct === 100 ? "Merci : vos réponses servent aux suggestions." : "Environ 15 minutes ; vos réponses s’enregistrent au fur et à mesure."}
              </p>
              <RepondreQuestionnaire memberId={id} reponses={maillage.reponses} secteurs={maillage.secteurs} commence={maillage.commence} fini={maillage.pct === 100} />
            </div>
          </Panneau>
          <Panneau titre="Mes mises en relation" sousTitre="Les entreprises que la Chambre vous a présentées" teinte="bleu">
            <ListeRelations relations={rels} espace="membre" />
          </Panneau>
          <Panneau titre="Suggestions" sousTitre="Membres qui proposent ce que vous recherchez : écrivez à la Chambre pour être présentés" teinte="rouge">
            <ListeSuggestions suggestions={sugg} memberId={id} espace="membre" />
          </Panneau>
        </div>
        <div className="flex flex-col gap-4">
          <Panneau titre="Ce que vous proposez" teinte="degrade">
            <EtiquettesMembre memberId={id} champ="offresTags" valeurs={tags?.offresTags ?? []} ton="bleu" />
          </Panneau>
          <Panneau titre="Ce que vous recherchez" teinte="rouge">
            <EtiquettesMembre memberId={id} champ="besoinsTags" valeurs={tags?.besoinsTags ?? []} />
          </Panneau>
          <Panneau titre="Vos centres d’intérêt" teinte="vert">
            <EtiquettesMembre memberId={id} champ="interetsTags" valeurs={tags?.interetsTags ?? []} ton="vert" />
          </Panneau>
        </div>
      </div>
    </>
  );
}
