import Link from "next/link";
import {
  KeyRound,
  KeySquare,
  PenLine,
  ShieldCheck,
  ShieldOff,
  ShieldPlus,
  CalendarCheck,
  BadgeCheck,
  Banknote,
  BellRing,
  Briefcase,
  BriefcaseBusiness,
  CalendarCog,
  CalendarDays,
  CalendarPlus,
  CalendarX2,
  CalendarClock,
  CalendarX,
  Send,
  CreditCard,
  Database,
  FilePenLine,
  FilePlus2,
  FileText,
  FileX2,
  MailPlus,
  MessageSquare,
  MessageSquareX,
  Newspaper,
  Receipt,
  ShoppingBag,
  Ticket,
  TicketCheck,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  UserRound,
  UserRoundMinus,
  UserRoundPlus,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { actionJournal, lienJournal, type FamilleJournal } from "@/lib/journal";
import type { EntreeJournal } from "@/lib/queries-admin";

const ICONES: Record<string, LucideIcon> = {
  candidature_deposee: UserPlus,
  candidature_approuvee: UserCheck,
  candidature_refusee: UserX,
  membre_cree: UserPlus,
  membre_supprime: UserMinus,
  membre_renomme: PenLine,
  adhesion_modifiee: CalendarCheck,
  fiche_modifiee: PenLine,
  inscription_publique: Ticket,
  inscription_validee: TicketCheck,
  question_visiteur: MessageSquare,
  abonne_infolettre: MailPlus,
  abonnes_importes: MailPlus,
  abonne_invite: Send,
  lettre_programmee: CalendarClock,
  lettre_deprogrammee: CalendarX,
  contact_ajoute: UserRoundPlus,
  contact_retire: UserRoundMinus,
  paiement_enregistre: Banknote,
  facture_emise: Receipt,
  facture_payee: BadgeCheck,
  facture_supprimee: Trash2,
  relance_envoyee: BellRing,
  ressource_achetee: ShoppingBag,
  acces_active: KeyRound,
  acces_envoye: KeyRound,
  compte_supprime: UserMinus,
  mot_de_passe_reinitialise: KeySquare,
  equipe_ajoutee: ShieldPlus,
  mot_de_passe_modifie: KeyRound,
  admin_promu: ShieldCheck,
  admin_retire: ShieldOff,
  service_reserve: CreditCard,
  service_gratuit_reserve: CalendarCheck,
  evenement_cree: CalendarPlus,
  evenement_modifie: CalendarCog,
  evenement_supprime: CalendarX2,
  actualite_publiee: Newspaper,
  actualite_modifiee: FilePenLine,
  actualite_supprimee: Trash2,
  commentaire_supprime: MessageSquareX,
  ressource_ajoutee: FilePlus2,
  ressource_modifiee: FilePenLine,
  ressource_supprimee: FileX2,
  service_ajoute: BriefcaseBusiness,
  service_modifie: Briefcase,
  service_supprime: Trash2,
  seed: Database,
};

const ICONES_FAMILLE: Record<FamilleJournal, LucideIcon> = {
  adhesion: UserRound,
  finance: CreditCard,
  programme: CalendarDays,
  contenu: FileText,
};

const TONS = {
  ok: "bg-success text-white",
  bad: "bg-accent text-white",
  info: "bg-[#14263a] text-white",
} as const;

export function ilYa(iso: string, maintenant = new Date()): string {
  const d = new Date(iso);
  const minutes = Math.round((maintenant.getTime() - d.getTime()) / 60_000);
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 60 * 12) return `il y a ${Math.round(minutes / 60)} h`;
  const heure = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const jour = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ecart = Math.round((jour(maintenant) - jour(d)) / 86_400_000);
  if (ecart === 0) return `aujourd’hui à ${heure}`;
  if (ecart === 1) return `hier à ${heure}`;
  return `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", ...(d.getFullYear() !== maintenant.getFullYear() ? { year: "numeric" } : {}) })} à ${heure}`;
}

export function LigneJournal({
  entree,
  compacte = false,
}: {
  entree: EntreeJournal;
  compacte?: boolean;
}) {
  const action = actionJournal(entree.action);
  const Icone = ICONES[entree.action] ?? ICONES_FAMILLE[action.famille];
  const lien = lienJournal(entree.action, entree.entite, entree.entiteId);

  const contenu = (
    <>
      <span
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${TONS[action.ton]}`}
      >
        <Icone size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-[13.5px] font-semibold text-ink">
            {action.libelle}
          </span>
          <span className="text-[11.5px] text-faint whitespace-nowrap">
            {ilYa(entree.date)}
          </span>
        </span>
        {entree.detail ? (
          <span
            className={`block text-[12.8px] text-muted ${compacte ? "truncate" : ""}`}
          >
            {entree.detail}
          </span>
        ) : null}
        {compacte ? null : (
          <span className="block text-[11.5px] text-faint mt-0.5">
            Par {entree.acteur}
          </span>
        )}
      </span>
    </>
  );

  const classes =
    "flex gap-3 items-start py-3 border-b border-line last:border-b-0 no-underline";
  return lien ? (
    <Link
      href={lien}
      className={`${classes} group hover:bg-surface-2 -mx-2 px-2 rounded-md`}
    >
      {contenu}
    </Link>
  ) : (
    <div className={classes}>{contenu}</div>
  );
}
