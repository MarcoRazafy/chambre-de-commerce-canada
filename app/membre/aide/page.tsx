import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Agenda / Actualités retirés pour l'instant, gardé pour les remettre
  CalendarRange,
  CreditCard,
  Headset,
  Mail,
  MessageSquare,
  Phone,
} from "lucide-react";
import { CentreAide } from "@/components/CentreAide";
import { Card, Saillant, ViewHead } from "@/components/ui";
import { themesDeLaChambre } from "@/lib/aide";
import { getFormules } from "@/lib/formules";
import { chiffres } from "@/lib/coordonnees";
import { getProfilChambre } from "@/lib/profil-chambre";

const ACCES = [
  {
    href: "/membre/profil",
    libelle: "Mon entreprise",
    detail: "Fiche, contacts, produits et certificat",
    Icone: Building2,
  },
  {
    href: "/membre/cotisations",
    libelle: "Cotisations & factures",
    detail: "Situation, factures et règlements",
    Icone: CreditCard,
  },
  {
    href: "/membre/messagerie",
    libelle: "Messagerie",
    detail: "Membres, groupes et équipe CanCham",
    Icone: MessageSquare,
  },
  // Agenda retiré pour l'instant : à décommenter pour le remettre
  // {
  //   href: "/membre/agenda",
  //   libelle: "Agenda",
  //   detail: "Événements, échéances et rappels",
  //   Icone: CalendarRange,
  // },
  {
    href: "/membre/offres-cancham",
    libelle: "Services CanCham",
    detail: "Accompagnements et réservations",
    Icone: Briefcase,
  },
];

export default async function AidePage() {
  // Les coordonnées saisies dans « Mon entreprise » (admin)
  const AIDE_CONTACT = await getProfilChambre();
  return (
    <>
      <div className="grid gap-6 items-start xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <ViewHead
            title={
              <>
                Besoin d’<Saillant>aide</Saillant> ?
              </>
            }
          />
          <CentreAide themes={themesDeLaChambre(await getFormules())} />
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-4">
          <Card className="tuile-hote carte-filet filet-fixe filet-degrade p-6">
            <span className="tuile tuile-sm tuile-rouge">
              <Headset size={20} />
            </span>
            <h2 className="m-0 mt-3.5 text-[18px]">
              Vous ne trouvez pas votre <Saillant ton="vert">réponse</Saillant>{" "}
              ?
            </h2>
            <p className="m-0 mt-1.5 text-[13.6px] text-muted leading-relaxed">
              Écrivez à l’équipe : la réponse arrive dans votre messagerie. La
              bulle ronde, en bas de l’écran, vous met aussi en relation depuis
              n’importe quelle page.
            </p>
            <div className="flex flex-col gap-2 mt-3.5 text-[13.2px]">
              <a
                href={`tel:+${chiffres(AIDE_CONTACT.telephone)}`}
                className="inline-flex items-center gap-2 text-ink no-underline hover:underline"
              >
                <Phone size={14} className="text-faint" />{" "}
                {AIDE_CONTACT.telephone}
              </a>
              <a
                href={`mailto:${AIDE_CONTACT.email}`}
                className="inline-flex items-center gap-2 text-ink no-underline hover:underline"
              >
                <Mail size={14} className="text-faint" /> {AIDE_CONTACT.email}
              </a>
            </div>
            <Link
              href="/membre/contact"
              className="btn-action btn-action-sm mt-4 w-full justify-center"
            >
              Contacter l’équipe <ArrowRight size={14} />
            </Link>
          </Card>

          <Card className="p-5">
            <h2 className="m-0 mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-faint">
              Accès rapides
            </h2>
            <ul className="m-0 p-0 list-none flex flex-col">
              {ACCES.map(({ href, libelle, detail, Icone }) => (
                <li key={href} className="border-b border-line last:border-b-0">
                  <Link
                    href={href}
                    className="group flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-[var(--radius-s)] no-underline hover:bg-surface-2"
                  >
                    <span className="w-8 h-8 rounded-[var(--radius-s)] bg-navy-soft text-navy flex items-center justify-center shrink-0">
                      <Icone size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold text-ink">
                        {libelle}
                      </span>
                      <span className="block text-[12px] text-muted truncate">
                        {detail}
                      </span>
                    </span>
                    <ArrowRight
                      size={14}
                      className="text-faint shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}
