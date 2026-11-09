import { notFound } from "next/navigation";
import { CalendarX, Copy } from "lucide-react";
import { EnTeteAdmin, Panneau } from "@/components/admin/ui";
import { EditeurLettre } from "@/components/newsletter/EditeurLettre";
import { Pill, Saillant } from "@/components/ui";
import { annulerProgrammation, dupliquerLettre } from "@/lib/actions/newsletter";
import { getTagsEntreprises } from "@/lib/contacts-admin";
import { ApercuLettre } from "@/components/newsletter/EditeurBlocs";
import { lireDoc } from "@/lib/lettre-blocs";
import { prisma } from "@/lib/db";
import { dateEnvoi, etatLettre, fmtDateHeure, fmtTaux, suiviDe, taux } from "@/lib/lettres";
import { destinataires, lireAudience } from "@/lib/newsletter";

export default async function Lettre({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const l = await prisma.lettre.findUnique({
    where: { id },
    include: { envois: { select: { livreLe: true, ouvertLe: true, clicLe: true, erreurLe: true } } },
  });
  if (!l) notFound();
  const audience = lireAudience(l.audience);
  const etat = etatLettre(l);
  const quand = dateEnvoi(l);
  const suivi = suiviDe(l.envois);
  const dupliquer = (
    <form action={dupliquerLettre}>
      <input type="hidden" name="id" value={l.id} />
      <button type="submit" className="btn-contour btn-contour-sm text-ink"><Copy size={14} /> Dupliquer</button>
    </form>
  );

  if (etat === "brouillon") {
    const [etiquettes, evenement] = await Promise.all([
      getTagsEntreprises(),
      audience.evenement ? prisma.event.findUnique({ where: { id: audience.evenement }, select: { id: true, titre: true } }) : null,
    ]);
    return (
      <>
        <EnTeteAdmin surtitre="Newsletter" titre={<>Modifier la <Saillant>lettre</Saillant></>} actions={dupliquer}>
          Brouillon de {l.auteur}.
        </EnTeteAdmin>
        <EditeurLettre lettre={l} audience={audience} etiquettes={etiquettes} nbDestinataires={(await destinataires(audience)).length} evenement={evenement} />
      </>
    );
  }

  const programmee = etat === "programmee";
  const chiffres: [string, string][] = [
    ["Courriels partis", String(l.envoyes)],
    ["Remis", suivi.envoyes ? fmtTaux(taux(suivi.livres, suivi.envoyes)) : "—"],
    ["Ouverture", suivi.envoyes ? fmtTaux(taux(suivi.ouverts, suivi.envoyes)) : "—"],
    ["Clics", suivi.envoyes ? fmtTaux(taux(suivi.clics, suivi.envoyes)) : "—"],
    ["Adresses en erreur", suivi.envoyes ? String(suivi.erreurs) : "—"],
  ];

  return (
    <>
      <EnTeteAdmin
        surtitre="Newsletter"
        titre={l.sujet}
        actions={
          <>
            {programmee ? (
              <form action={annulerProgrammation}>
                <input type="hidden" name="id" value={l.id} />
                <input type="hidden" name="retour" value="lettre" />
                <button type="submit" className="btn-contour btn-contour-sm text-ink"><CalendarX size={14} /> Annuler l’envoi</button>
              </form>
            ) : null}
            {dupliquer}
          </>
        }
      >
        {programmee
          ? `Programmée pour le ${fmtDateHeure(quand!)} · ${l.destinataires} destinataire${l.destinataires > 1 ? "s" : ""} aujourd’hui (liste relue à l’envoi). Pour la modifier, annulez l’envoi : elle redevient un brouillon.`
          : `Envoyée le ${quand ? fmtDateHeure(quand) : "—"} à ${l.envoyes} destinataire${l.envoyes > 1 ? "s" : ""} sur ${l.destinataires}.`}
      </EnTeteAdmin>

      {!programmee ? (
        <div className="grid gap-3 mb-4 grid-cols-2 md:grid-cols-5">
          {chiffres.map(([k, v]) => (
            <div key={k} className="rounded-[var(--radius-m)] border border-line bg-surface px-4 py-3">
              <div className="text-[12px] text-muted">{k}</div>
              <div className="titre text-[22px] tabular-nums text-ink">{v}</div>
            </div>
          ))}
        </div>
      ) : null}
      {!programmee && !suivi.envoyes ? (
        <p className="m-0 mb-4 text-[12.5px] text-faint">Cette lettre est partie avant la mise en place du suivi : ses ouvertures et ses clics ne sont pas connus.</p>
      ) : null}

      <Panneau
        titre={programmee ? "Texte programmé" : "Texte envoyé"}
        teinte={programmee ? "bleu" : "vert"}
        action={<Pill tone={programmee ? "info" : "ok"}>{programmee ? "Programmée" : "Envoyée"}</Pill>}
      >
        {lireDoc(l.contenu) ? (
          <ApercuLettre doc={lireDoc(l.contenu)!} hauteur={720} />
        ) : (
          <div className="text-[14px] leading-relaxed text-ink whitespace-pre-line max-w-[70ch]">{l.contenu}</div>
        )}
      </Panneau>
    </>
  );
}
