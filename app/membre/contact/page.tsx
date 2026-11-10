import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";
import { SubmitButton } from "@/components/form-bits";
import { Banner, Card, Kicker, Saillant, ViewHead } from "@/components/ui";
import { envoyerDemandeContact } from "@/lib/actions/messages";
import { COORDONNEES, MOTIFS_CONTACT, chiffres } from "@/lib/coordonnees";
import { getProfilChambre } from "@/lib/profil-chambre";
import { getCurrentUser } from "@/lib/session";

const INPUT =
  "w-full border border-line bg-surface text-ink rounded-[var(--radius-s)] px-3 py-[9px] text-[13.6px] disabled:opacity-60";

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ envoye?: string }>;
}) {
  const { envoye } = await searchParams;
  const user = await getCurrentUser("membre");

  // Téléphone, courriel et adresse : ceux de « Mon entreprise » (admin) ; le reste vient des coordonnées fixes
  const { telephone, email, adresse } = await getProfilChambre();
  const { whatsapp, horaires, reseaux } = COORDONNEES;
  const messageWhatsapp = encodeURIComponent(
    `Bonjour, je suis ${user.nom}, membre CanCham. `,
  );

  return (
    <>
      <ViewHead
        title={
          <>
            Contacter l’<Saillant>équipe</Saillant>
          </>
        }
      />

      {envoye ? (
        <div className="mb-5">
          <Banner
            tone="ok"
            icon={<CheckCircle2 size={18} />}
            title="Votre message a bien été envoyé"
          >
            L’équipe vous répondra dans votre messagerie.{" "}
            <Link
              href={`/membre/messagerie?t=${envoye}`}
              className="font-semibold text-accent no-underline hover:underline"
            >
              Suivre la conversation
            </Link>
          </Banner>
        </div>
      ) : null}

      <div className="grid gap-4 items-start lg:grid-cols-[1.35fr_1fr]">
        <Card className="carte-filet filet-fixe filet-degrade p-6">
          <Kicker>Formulaire de contact</Kicker>
          <h2 className="mt-1.5 mb-1 text-[19px]">
            Écrire à l’<Saillant ton="vert">équipe</Saillant>
          </h2>
          <p className="m-0 mb-5 text-[13.2px] text-muted">
            Envoyé au nom de <b className="text-ink">{user.nom}</b> ·{" "}
            {user.email}
          </p>

          <form
            action={envoyerDemandeContact}
            className="flex flex-col gap-3.5"
          >
            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="block">
                <span className="block text-[12.3px] font-semibold text-muted mb-1.5">
                  Motif
                </span>
                <select
                  name="motif"
                  defaultValue={MOTIFS_CONTACT[0]}
                  className={INPUT}
                >
                  {MOTIFS_CONTACT.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-[12.3px] font-semibold text-muted mb-1.5">
                  Être rappelé au{" "}
                  <span className="font-normal text-faint">(facultatif)</span>
                </span>
                <input
                  type="tel"
                  name="rappel"
                  defaultValue={user.tel ?? ""}
                  autoComplete="tel"
                  className={INPUT}
                />
              </label>
            </div>

            <label className="block">
              <span className="block text-[12.3px] font-semibold text-muted mb-1.5">
                Sujet
              </span>
              <input
                type="text"
                name="sujet"
                required
                maxLength={140}
                placeholder="En quelques mots"
                className={INPUT}
              />
            </label>

            <label className="block">
              <span className="block text-[12.3px] font-semibold text-muted mb-1.5">
                Message
              </span>
              <textarea
                name="message"
                required
                rows={6}
                placeholder="Décrivez votre demande : le contexte, ce dont vous avez besoin, vos disponibilités…"
                className={INPUT}
              />
            </label>

            <div className="flex items-center justify-between gap-3 flex-wrap mt-1">
              <span className="text-[12px] text-faint">
                La réponse arrive dans votre messagerie.
              </span>
              <SubmitButton pendingLabel="Envoi…">
                <Send size={14} /> Envoyer
              </SubmitButton>
            </div>
          </form>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="carte-filet filet-fixe filet-bleu p-6">
            <Kicker>Coordonnées</Kicker>
            <h2 className="mt-1.5 mb-4 text-[19px]">
              Nous <Saillant>joindre</Saillant>
            </h2>

            <ul className="list-none m-0 p-0 flex flex-col gap-3">
              <Coordonnee
                icone={<Phone size={18} />}
                teinte="tuile-rouge"
                libelle="Téléphone"
                valeur={telephone}
                href={`tel:+${chiffres(telephone)}`}
              />
              {whatsapp ? (
                <Coordonnee
                  icone={<MessageCircle size={18} />}
                  teinte="tuile-verte"
                  libelle="WhatsApp"
                  valeur={whatsapp}
                  href={`https://wa.me/${chiffres(whatsapp)}?text=${messageWhatsapp}`}
                  externe
                />
              ) : null}
              <Coordonnee
                icone={<Mail size={18} />}
                teinte="tuile-bleue"
                libelle="E-mail"
                valeur={email}
                href={`mailto:${email}`}
              />
              <Coordonnee
                icone={<MapPin size={18} />}
                teinte="tuile-rouge"
                libelle="Adresse"
                valeur={adresse}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `CanCham ${adresse}`,
                )}`}
                externe
              />
              {horaires ? (
                <Coordonnee
                  icone={<Clock size={18} />}
                  teinte="tuile-verte"
                  libelle="Horaires"
                  valeur={horaires}
                />
              ) : null}
            </ul>
          </Card>

          <Card className="carte-filet filet-fixe filet-vert p-6">
            <Kicker>Réseaux</Kicker>
            <p className="m-0 mt-1.5 mb-4 text-[13.2px] text-muted">
              L’actualité de la chambre, au jour le jour.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href={reseaux.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between gap-2 rounded-[var(--radius-s)] border border-line px-3.5 py-2.5 text-[13.4px] font-semibold text-ink no-underline hover:border-faint hover:bg-surface-2"
              >
                LinkedIn <ArrowRight size={14} className="text-faint" />
              </a>
              <a
                href={reseaux.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between gap-2 rounded-[var(--radius-s)] border border-line px-3.5 py-2.5 text-[13.4px] font-semibold text-ink no-underline hover:border-faint hover:bg-surface-2"
              >
                Facebook <ArrowRight size={14} className="text-faint" />
              </a>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Coordonnee({
  icone,
  teinte,
  libelle,
  valeur,
  href,
  externe = false,
}: {
  icone: React.ReactNode;
  teinte: "tuile-rouge" | "tuile-verte" | "tuile-bleue";
  libelle: string;
  valeur: string;
  href?: string;
  externe?: boolean;
}) {
  const contenu = (
    <>
      <span className={`tuile tuile-sm ${teinte}`}>{icone}</span>
      <span className="min-w-0">
        <span className="block text-[11.5px] font-semibold uppercase tracking-[0.06em] text-faint">
          {libelle}
        </span>
        <span className="block text-[14px] font-semibold text-ink truncate">
          {valeur}
        </span>
      </span>
    </>
  );

  return (
    <li>
      {href ? (
        <a
          href={href}
          {...(externe ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="tuile-hote flex items-center gap-3 rounded-[var(--radius-s)] p-1.5 -m-1.5 no-underline hover:bg-surface-2"
        >
          {contenu}
        </a>
      ) : (
        <div className="flex items-center gap-3">{contenu}</div>
      )}
    </li>
  );
}
