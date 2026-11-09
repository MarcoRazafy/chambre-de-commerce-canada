import { EnTeteAdmin } from "@/components/admin/ui";
import { EditeurLettre } from "@/components/newsletter/EditeurLettre";
import { Saillant } from "@/components/ui";
import { quandEvenement } from "@/lib/billets";
import { urlPublique } from "@/lib/courriel";
import { prisma } from "@/lib/db";
import { AUDIENCE_DEFAUT, destinataires } from "@/lib/newsletter";

// Nouvelle lettre. Depuis un événement : « ?evenement= » écrit à ses inscrits, « ?annonce= » l'annonce à tous
export default async function NouvelleLettre({ searchParams }: { searchParams: Promise<{ evenement?: string; annonce?: string }> }) {
  const p = await searchParams;
  const idEvenement = p.evenement || p.annonce;
  const [ms, e] = await Promise.all([
    prisma.member.findMany({ select: { etiquettes: true } }),
    idEvenement
      ? prisma.event.findUnique({
          where: { id: idEvenement },
          include: { intervenants: { orderBy: { ordre: "asc" } } },
        })
      : null,
  ]);
  const etiquettes = [...new Set(ms.flatMap((m) => m.etiquettes))].sort((a, b) => a.localeCompare(b, "fr"));

  if (e && p.evenement) {
    const audience = { ...AUDIENCE_DEFAUT, evenement: e.id };
    return (
      <>
        <EnTeteAdmin surtitre="Newsletter" titre={<>Écrire aux <Saillant>inscrits</Saillant></>}>
          {e.titre} · {quandEvenement(e)}
        </EnTeteAdmin>
        <EditeurLettre
          lettre={{
            sujet: `Informations pratiques — ${e.titre}`,
            contenu: `Bonjour,\n\nQuelques informations avant « ${e.titre} », le ${quandEvenement(e)}, ${e.lieu}.\n\n…\n\nÀ bientôt,\nL’équipe CanCham`,
          }}
          audience={audience}
          etiquettes={etiquettes}
          nbDestinataires={(await destinataires(audience)).length}
          evenement={{ id: e.id, titre: e.titre }}
        />
      </>
    );
  }

  if (e && p.annonce) {
    const presentation = e.desc.split(/\n{2,}/).slice(0, 2).join("\n\n");
    const intervenants = e.intervenants.map((i) => `– ${i.nom}${i.fonction || i.entreprise ? `, ${[i.fonction, i.entreprise].filter(Boolean).join(" · ")}` : ""}`);
    const contenu = [
      "Bonjour,",
      `Nous vous donnons rendez-vous pour « ${e.titre} », le ${quandEvenement(e)}, ${e.lieu}.`,
      presentation,
      ...(intervenants.length ? [`${intervenants.length > 1 ? "Les intervenants" : "L’intervenant"} :\n${intervenants.join("\n")}`] : []),
      `Membres : inscrivez-vous depuis votre espace, rubrique Événements (${await urlPublique(`/membre/evenements/${e.id}`)}). Pour toute question, répondez simplement à ce courriel.`,
      "À très bientôt,\nL’équipe CanCham",
    ].join("\n\n");
    return (
      <>
        <EnTeteAdmin surtitre="Newsletter" titre={<>Annoncer <Saillant>l’événement</Saillant></>} />
        <EditeurLettre
          lettre={{ sujet: `À ne pas manquer : ${e.titre}`, contenu }}
          audience={AUDIENCE_DEFAUT}
          etiquettes={etiquettes}
          nbDestinataires={(await destinataires(AUDIENCE_DEFAUT)).length}
        />
      </>
    );
  }

  return (
    <>
      <EnTeteAdmin surtitre="Newsletter" titre={<>Nouvelle <Saillant>lettre</Saillant></>} />
      <EditeurLettre lettre={null} audience={AUDIENCE_DEFAUT} etiquettes={etiquettes} nbDestinataires={null} />
    </>
  );
}
