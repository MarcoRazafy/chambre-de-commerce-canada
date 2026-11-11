// Onglet « Courriel » d'un événement : écrire tout de suite aux inscrits (événement passé, en cours ou à venir)
// et retrouver les courriels qui leur ont été écrits. « ecrire » : nouveau courriel ; « lettre » : un brouillon rouvert.
import Link from "next/link";
import { Mail, PenLine } from "lucide-react";
import { Panneau, Vide } from "@/components/admin/ui";
import { EditeurLettre } from "@/components/newsletter/EditeurLettre";
import { Card, Pill } from "@/components/ui";
import { quandEvenement } from "@/lib/billets";
import { prisma } from "@/lib/db";
import { dateEnvoi, etatLettre, fmtDateHeure, fmtTaux, suiviDe, taux } from "@/lib/lettres";
import { AUDIENCE_DEFAUT, destinataires, lireAudience } from "@/lib/newsletter";

const PASTILLE = { brouillon: ["Brouillon", "muted"], programmee: ["Programmée", "info"], envoyee: ["Envoyée", "ok"] } as const;

export async function CourrielsInscrits({
  eventId,
  passe,
  ecrire,
  lettreId,
}: {
  eventId: string;
  passe: boolean;
  ecrire: boolean;
  lettreId?: string;
}) {
  const [e, lettres] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { id: true, titre: true, date: true, debut: true, fin: true, lieu: true } }),
    prisma.lettre.findMany({
      where: { audience: { path: ["evenement"], equals: eventId } },
      orderBy: { updatedAt: "desc" },
      include: { envois: { select: { livreLe: true, ouvertLe: true, clicLe: true, erreurLe: true } } },
    }),
  ]);
  if (!e) return null;
  const base = `/admin/evenements/${e.id}?vue=courriel`;
  const audience = { ...AUDIENCE_DEFAUT, evenement: e.id };

  // Un brouillon de cet événement, rouvert pour être terminé
  const brouillon = lettreId ? lettres.find((l) => l.id === lettreId && etatLettre(l) === "brouillon") : undefined;
  if (brouillon || ecrire) {
    const quand = quandEvenement(e);
    const lettre = brouillon
      ? { id: brouillon.id, sujet: brouillon.sujet, contenu: brouillon.contenu }
      : passe
        ? {
            sujet: `Merci pour votre participation — ${e.titre}`,
            contenu: `Bonjour,\n\nMerci d’avoir participé à « ${e.titre} », le ${quand}.\n\n…\n\nÀ bientôt,\nL’équipe de la Chambre`,
          }
        : {
            sujet: `Informations pratiques — ${e.titre}`,
            contenu: `Bonjour,\n\nQuelques informations au sujet de « ${e.titre} », le ${quand}, ${e.lieu}.\n\n…\n\nÀ bientôt,\nL’équipe de la Chambre`,
          };
    const audienceLettre = brouillon ? lireAudience(brouillon.audience) : audience;
    return (
      <div className="flex flex-col gap-3">
        <Link href={base} className="self-start text-[13px] font-semibold text-muted no-underline hover:text-accent">← Courriels envoyés aux inscrits</Link>
        <EditeurLettre
          lettre={lettre}
          audience={audienceLettre}
          etiquettes={[]}
          nbDestinataires={(await destinataires(audienceLettre)).length}
          evenement={{ id: e.id, titre: e.titre }}
          retour={base}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`${base}&ecrire=1`} className="btn-action btn-action-sm no-underline">
          <PenLine size={15} /> Écrire aux inscrits
        </Link>
      </div>

      {lettres.length ? (
        <Panneau titre="Courriels aux inscrits" teinte="bleu">
          <ul className="list-none m-0 p-0">
            {lettres.map((l) => {
              const etat = etatLettre(l);
              const s = suiviDe(l.envois);
              const date = dateEnvoi(l);
              const nb = etat === "programmee" ? l.destinataires : l.envoyes;
              const href = etat === "brouillon" ? `${base}&lettre=${l.id}` : `/admin/newsletter/${l.id}`;
              return (
                <li key={l.id} className="py-2.5 border-t border-line first:border-t-0">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={href} className="min-w-0 truncate text-[13.4px] font-semibold text-ink no-underline hover:text-accent">{l.sujet || "Sans objet"}</Link>
                    <Pill tone={PASTILLE[etat][1]}>{PASTILLE[etat][0]}</Pill>
                  </div>
                  <div className="text-[12px] text-muted">
                    {etat === "brouillon"
                      ? `Par ${l.auteur}`
                      : `${date ? fmtDateHeure(date) : ""} · ${nb} destinataire${nb > 1 ? "s" : ""}${etat === "envoyee" && s.envoyes ? ` · ouverture ${fmtTaux(taux(s.ouverts, s.envoyes))}` : ""}`}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panneau>
      ) : (
        <Card>
          <Vide icone={<Mail size={26} />}>Aucun courriel écrit aux inscrits pour l’instant.</Vide>
        </Card>
      )}
    </div>
  );
}
