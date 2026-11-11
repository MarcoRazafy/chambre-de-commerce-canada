import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  Briefcase,
  Building2,
  CalendarDays,
  CheckCheck,
  CreditCard,
  FileText,
  ImageIcon,
  MapPin,
  MessageSquare,
  Play,
  Tag,
  User as UserIcon,
  Users,
} from "lucide-react";
import { Card, Pill } from "@/components/ui";
import { Partage } from "@/components/Partage";
import { PhotoNaturelle } from "@/components/PhotoNaturelle";
import { Reactions } from "@/components/forms/Reactions";
import { TexteLie } from "@/components/TexteLie";
import { ModaleOffre } from "@/components/ModaleOffre";
import { positionObjet } from "@/lib/cadrage";
import { publicationLongue } from "@/lib/publications";
import { filetDe } from "@/lib/filets";
import { initialesDe } from "@/lib/avatars";
import {
  fmtDate,
  fmtDateShort,
  fmtMoney,
  parseISO,
} from "@/lib/format";
import type {
  CanchamEvent,
  CanchamService,
  Contact,
  Member,
  NewsItem,
  NewsMedia,
  Offer,
  Produit,
  Resource,
  Space,
} from "@/lib/types";

export function PhotoPlaceholder({
  seed,
  className = "",
  icon,
  iconSize = 20,
}: {
  seed: string;
  className?: string;
  icon?: ReactNode;
  iconSize?: number;
}) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const green = h % 2 === 0;
  const bg = green
    ? "linear-gradient(135deg, var(--accent-strong), var(--accent))"
    : "linear-gradient(135deg, var(--navy), var(--navy-2))";

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden text-white/90 shrink-0 ${className}`}
      style={{ background: bg }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgb(255 255 255 / 0.09) 0 2px, transparent 2px 20px)",
        }}
      />
      {icon ?? <ImageIcon size={iconSize} />}
    </div>
  );
}

export function AvatarRond({
  src,
  alt,
  initiales,
  taille,
  className = "",
  style,
  ajuste = "couverture",
}: {
  src?: string | null;
  alt: string;
  initiales: string;
  taille: number;
  className?: string;
  style?: CSSProperties;
  ajuste?: "couverture" | "contenu";
}) {
  if (src) {
    const contenu = ajuste === "contenu";
    return (
      <span
        className={`rounded-full overflow-hidden shrink-0 block ${
          contenu ? "bg-white border border-line p-1.5" : "bg-line"
        }`}
        style={{ width: taille, height: taille }}
      >
        <Image
          src={src}
          alt={alt}
          width={taille}
          height={taille}
          sizes={`${taille}px`}
          className={`w-full h-full ${contenu ? "object-contain" : "object-cover"}`}
        />
      </span>
    );
  }

  return (
    <span
      className={`rounded-full flex items-center justify-center font-bold shrink-0 ${className}`}
      style={{
        ...style,
        width: taille,
        height: taille,
        fontSize: taille * 0.36,
      }}
    >
      {initiales}
    </span>
  );
}

export function LogoMark({
  member,
  size = 46,
}: {
  member: Pick<Member, "id" | "type" | "nom" | "photo" | "logo">;
  size?: number;
}) {
  if (member.type === "physique") {
    if (member.photo) {
      return (
        <AvatarRond
          src={member.photo}
          alt={member.nom}
          initiales=""
          taille={size}
        />
      );
    }
    return (
      <div style={{ width: size, height: size }} className="shrink-0">
        <PhotoPlaceholder
          seed={`rep-${member.id}`}
          className="rounded-full w-full h-full"
          icon={<UserIcon size={size * 0.4} />}
        />
      </div>
    );
  }
  if (member.logo) {
    return (
      <div
        className="rounded-[var(--radius-s)] bg-white border border-line flex items-center justify-center shrink-0 px-2 py-1.5"
        style={{ width: size * 1.75, height: size }}
      >
        <Image
          src={member.logo}
          alt={member.nom}
          width={Math.round(size * 1.75)}
          height={size}
          sizes={`${Math.round(size * 1.75)}px`}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  if (member.photo) {
    return (
      <div
        className="rounded-[var(--radius-s)] overflow-hidden bg-surface-2 border border-line shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src={member.photo}
          alt={member.nom}
          width={size}
          height={size}
          sizes={`${size}px`}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Ni logo ni photo : une icône de personne
  return (
    <div
      role="img"
      aria-label={member.nom}
      className="rounded-[var(--radius-s)] bg-surface-2 border border-line text-muted flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <UserIcon size={Math.round(size * 0.5)} aria-hidden />
    </div>
  );
}

export function Visuel({
  src,
  alt,
  seed,
  className = "",
  icon,
  iconSize = 20,
  sizes = "400px",
  cadrage = "object-center",
  position,
}: {
  src?: string | null;
  alt: string;
  seed: string;
  className?: string;
  icon?: ReactNode;
  iconSize?: number;
  sizes?: string;
  cadrage?: "object-center" | "object-top";
  position?: string;
}) {
  if (!src) {
    return (
      <PhotoPlaceholder
        seed={seed}
        className={className}
        icon={icon}
        iconSize={iconSize}
      />
    );
  }
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={`object-cover ${cadrage}`}
        style={position ? { objectPosition: position } : undefined}
      />
    </div>
  );
}

export function PuceSecteur({
  secteur,
  grand = false,
}: {
  secteur: string;
  grand?: boolean;
}) {
  return (
    <span
      title="Secteur d’activité"
      className={`inline-flex items-center gap-1.5 max-w-full font-semibold rounded-full bg-navy-soft text-navy ${
        grand ? "text-[12.5px] px-3 py-1" : "text-[11.3px] px-2.5 py-[3px]"
      }`}
    >
      <Briefcase size={grand ? 13 : 11} className="shrink-0" />
      <span className="truncate">{secteur}</span>
    </span>
  );
}

const VIGNETTES_PAR_CARTE = 4;

export function MemberCard({ member, href }: { member: Member; href: string }) {
  const swatches = [
    "bg-surface-2 text-muted",
    "bg-surface-3 text-muted",
    "bg-accent-soft text-accent-strong",
  ];
  const avecPhotos = member.produits.some((p) => p.photos.length > 0);
  const vignettes = avecPhotos
    ? member.produits.slice(0, VIGNETTES_PAR_CARTE)
    : member.produits;
  const reste = member.produits.length - vignettes.length;
  return (
    <Link href={href} prefetch className="no-underline block min-w-0">
      <Card
        className={`carte-filet filet-bas ${filetDe(member.id)} h-full flex flex-col transition-shadow hover:shadow-[0_12px_28px_-20px_rgba(15,29,44,0.45)] p-0`}
      >
        <Visuel
          src={member.cover}
          position={positionObjet(member.cadrage)}
          alt=""
          seed={member.id}
          className="h-[150px] w-full"
          sizes="(max-width: 768px) 100vw, 380px"
          icon={
            member.type === "physique" ? (
              <UserIcon size={20} />
            ) : (
              <Building2 size={20} />
            )
          }
        />
        <div className="flex gap-3 px-4 pt-4 pb-3">
          <Partage nom={`membre-${member.id}`}>
            <div className="shrink-0">
              <LogoMark member={member} />
            </div>
          </Partage>
          <div className="min-w-0">
            <h3 className="m-0 mb-1.5 text-[15px]">{member.nom}</h3>
            <PuceSecteur secteur={member.secteur} />
          </div>
        </div>
        {member.type === "physique" ? (
          <div className="flex gap-1.5 flex-wrap px-4 pb-3">
            <Pill icon={<UserIcon size={10} />}>Indépendant</Pill>
          </div>
        ) : null}
        <p className="px-4 text-[12.8px] text-muted flex-1 m-0">
          <TexteLie texte={member.activite} dansUnLien />
        </p>
        <div
          className={`px-4 pt-3 pb-4 ${
            avecPhotos ? "grid grid-cols-4 gap-1.5" : "flex gap-1.5 flex-wrap"
          }`}
        >
          {vignettes.map((prod: Produit, i) => (
            <div
              key={prod.label}
              className={
                avecPhotos
                  ? `relative min-w-0 aspect-square rounded-lg overflow-hidden flex items-center justify-center text-[10px] font-semibold text-center px-1 ${swatches[i % 3]}`
                  : `rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${swatches[i % 3]}`
              }
            >
              {prod.photos[0] ? (
                <Image
                  src={prod.photos[0]}
                  alt={prod.label}
                  width={200}
                  height={200}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                prod.label
              )}
              {reste > 0 && i === vignettes.length - 1 ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-[14px] font-bold">
                  +{reste + 1}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </Link>
  );
}

export function NeedsAndInterests({
  member,
  action,
  aRemplir = false,
}: {
  member: Member;
  action?: ReactNode;
  aRemplir?: boolean;
}) {
  const lignes = [member.besoins, member.interets]
    .flatMap((texte) => (texte ?? "").split("\n"))
    .map((ligne) => ligne.replace(/^\s*[-–—•*]\s*/, "").trim())
    .filter(Boolean);
  if (!lignes.length && !action && !aRemplir) return null;

  return (
    <>
      <div className="flex items-center gap-2.5 mt-[22px] mb-3.5 flex-wrap">
        <div className="w-[3px] self-stretch min-h-[18px] bg-accent rounded-sm" />
        <h2 className="text-[17px] font-semibold m-0">
          Besoins &amp; intérêts
        </h2>
        {action ? (
          <>
            <span className="flex-1" />
            {action}
          </>
        ) : null}
      </div>
      {!lignes.length ? (
        <p className="m-0 text-[13.4px] text-muted">
          Dites ce que vous recherchez — partenaires, distributeurs,
          financement… : c’est ce qui déclenche les mises en relation.
          {aRemplir
            ? " Ajoutez vos besoins depuis « Modifier ma fiche »."
            : null}
        </p>
      ) : null}
      {lignes.length ? (
        <div className="text-[12.3px] font-semibold text-muted mb-2">
          Recherche actuellement
        </div>
      ) : null}
      <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
        {lignes.map((ligne, i) => (
          <li
            key={i}
            className="flex gap-2.5 text-[13.4px] text-muted leading-relaxed"
          >
            <span aria-hidden className="text-accent font-bold shrink-0">
              –
            </span>
            <span className="min-w-0">
              <TexteLie texte={ligne} />
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function EventCard({
  event,
  href,
  registered = false,
  footer,
}: {
  event: CanchamEvent;
  href?: string;
  registered?: boolean;
  footer?: ReactNode;
}) {
  const d = parseISO(event.date);
  const mois = d
    .toLocaleDateString("fr-FR", { month: "short" })
    .replace(".", "");

  const body = (
    <Card
      className={`carte-filet filet-bas ${href ? "" : "filet-fixe"} ${filetDe(event.id)} h-full flex flex-col transition-shadow hover:shadow-[0_12px_28px_-20px_rgba(15,29,44,0.45)] p-0`}
    >
      <div className="relative">
        <Partage nom={`evenement-${event.id}`}>
          <Visuel
            src={event.photo}
            alt=""
            seed={event.id}
            className="h-[150px] w-full"
            sizes="(max-width: 768px) 100vw, 420px"
            icon={<CalendarDays size={28} />}
          />
        </Partage>
        <div className="absolute top-2.5 left-2.5 bg-white rounded-[var(--radius-s)] px-2.5 py-[5px] text-center shadow-[var(--shadow)] min-w-[38px]">
          <div className="font-[family-name:var(--font-display)] font-bold text-base leading-none text-accent-strong">
            {d.getDate()}
          </div>
          <div className="text-[9px] uppercase tracking-[0.05em] font-bold text-muted">
            {mois}
          </div>
        </div>
        {registered ? (
          <div className="absolute top-2.5 right-2.5">
            <Pill tone="ok" icon={<CheckCheck size={10} />}>
              Inscrit
            </Pill>
          </div>
        ) : null}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="self-start mb-1.5">
          <Pill>{event.format}</Pill>
        </div>
        <h3 className="m-0 mb-1.5 text-[15.5px]">{event.titre}</h3>
        <EventMeta event={event} />
        <div className="flex-1" />
        {footer ? (
          <div className="flex gap-2 mt-3 flex-wrap">{footer}</div>
        ) : null}
      </div>
    </Card>
  );

  return href ? (
    <Link href={href} prefetch className="no-underline block min-w-0">
      {body}
    </Link>
  ) : (
    body
  );
}

export function EventMeta({ event }: { event: CanchamEvent }) {
  return (
    <div className="text-[12.3px] text-muted flex gap-3 flex-wrap mt-1">
      <span className="inline-flex items-center gap-1">
        <MapPin size={13} /> {event.lieu}
      </span>
      <span className="inline-flex items-center gap-1">
        <Users size={13} /> {event.inscrits}/{event.cap}
      </span>
      <span className="inline-flex items-center gap-1">
        <CreditCard size={13} />{" "}
        {event.payant ? fmtMoney(event.prix) : "Gratuit"}
      </span>
    </div>
  );
}

export function EventRow({
  event,
  href,
  registered = false,
}: {
  event: CanchamEvent;
  href: string;
  registered?: boolean;
}) {
  const d = parseISO(event.date);
  const mois = d
    .toLocaleDateString("fr-FR", { month: "short" })
    .replace(".", "");
  return (
    <Link href={href} className="no-underline">
      <div className="flex gap-4 p-4 border border-line rounded-[var(--radius-m)] bg-surface items-center hover:border-accent transition-colors">
        <Visuel
          src={event.photo}
          alt=""
          seed={event.id}
          className="w-[62px] h-[62px] rounded-[var(--radius-s)] shrink-0"
          sizes="62px"
          icon={<CalendarDays size={20} />}
        />
        <div className="shrink-0 w-[62px] text-center bg-accent-soft text-accent-strong rounded-[var(--radius-s)] px-1 py-2">
          <div className="font-[family-name:var(--font-display)] text-[21px] font-bold leading-none">
            {d.getDate()}
          </div>
          <div className="text-[10px] uppercase tracking-[0.06em] font-bold">
            {mois}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="m-0 mb-1 text-[15px]">
            {event.titre}{" "}
            {registered ? (
              <Pill tone="ok" icon={<CheckCheck size={10} />}>
                Inscrit
              </Pill>
            ) : null}
          </h3>
          <EventMeta event={event} />
        </div>
      </div>
    </Link>
  );
}

export function MediaBanner({
  media,
  lg = false,
}: {
  media: NewsMedia;
  lg?: boolean;
}) {
  const bg =
    media.theme === "green"
      ? "linear-gradient(135deg, var(--accent-strong), var(--accent))"
      : "linear-gradient(135deg, var(--navy), var(--navy-2))";
  return (
    <div
      className={`relative w-full rounded-[var(--radius-m)] overflow-hidden mt-2.5 flex items-center justify-center text-white ${
        lg ? "aspect-[16/7]" : "aspect-[16/8]"
      }`}
      style={{ background: bg }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgb(255 255 255 / 0.09) 0 2px, transparent 2px 20px)",
        }}
      />
      {media.type === "video" ? (
        <>
          <div className="w-[50px] h-[50px] rounded-full bg-white/20 backdrop-blur-[2px] flex items-center justify-center">
            <Play size={lg ? 32 : 24} />
          </div>
          <span className="absolute top-2.5 left-2.5 bg-black/30 backdrop-blur-[2px] text-[10.6px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
            <Play size={10} /> Vidéo · {media.duration}
          </span>
        </>
      ) : (
        <span className="absolute top-2.5 left-2.5 bg-black/30 backdrop-blur-[2px] text-[10.6px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
          <ImageIcon size={10} /> Photo
        </span>
      )}
    </div>
  );
}

export function MosaiquePhotos({
  images,
  alt,
  href,
}: {
  images: string[];
  alt: string;
  href: string;
}) {
  const visibles = images.slice(0, 4);
  const reste = images.length - visibles.length;
  const seule = visibles.length === 1;

  return (
    <div
      className={`mt-2.5 ${
        seule ? "flex justify-center" : "grid grid-cols-2 items-start gap-1.5"
      }`}
    >
      {visibles.map((src, i) => (
        <Link
          key={src + i}
          href={href}
          aria-label={
            i === 0 ? `Lire : ${alt}` : `Photo ${i + 1} sur ${images.length}`
          }
          className={`group relative block overflow-hidden rounded-[var(--radius-m)] ${
            seule ? "max-w-full" : "bg-surface-2"
          } ${visibles.length === 3 && i === 0 ? "col-span-2" : ""}`}
        >
          <PhotoNaturelle
            src={src}
            alt={i === 0 ? alt : ""}
            sizes={
              seule || (visibles.length === 3 && i === 0)
                ? "(max-width: 768px) 100vw, 640px"
                : "(max-width: 768px) 50vw, 320px"
            }
            plafond={seule ? "max-h-[620px]" : undefined}
            className="transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {reste > 0 && i === visibles.length - 1 ? (
            <span className="absolute inset-0 bg-[#0f1d2c]/55 text-white flex items-center justify-center text-[22px] font-bold">
              +{reste}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

export function SignaturePublication({ news }: { news: NewsItem }) {
  return (
    <div className="flex items-center gap-2.5">
      {news.auteur ? (
        <AvatarRond
          src={news.auteur.logo}
          alt={news.auteur.membre}
          initiales={news.auteur.membre.slice(0, 2).toUpperCase()}
          taille={44}
          ajuste="contenu"
          className="shrink-0 border border-line bg-surface-2 text-[13px] font-bold text-muted"
        />
      ) : (
        <div className="w-11 h-11 rounded-full bg-white border border-line flex items-center justify-center shrink-0 overflow-hidden">
          <Image
            src="/marque/sigle.png"
            alt="IMPACT 261"
            width={44}
            height={44}
            sizes="44px"
            className="w-full h-full object-contain"
          />
        </div>
      )}
      <div className="min-w-0">
        <div className="font-semibold text-[13.6px]">
          {news.auteur ? news.auteur.membre : "CanCham Madagascar"}{" "}
          <Pill className="ml-1">
            {news.auteur ? "Publication d’un membre" : news.cat}
          </Pill>
        </div>
        <div className="text-[11.5px] text-faint">
          {fmtDate(news.date)}
          {news.auteur?.personne ? ` · ${news.auteur.personne}` : ""}
          {news.auteur && news.public ? " · Page publique" : ""}
        </div>
      </div>
    </div>
  );
}

export function NewsFeedItem({
  news,
  base,
  space,
  actions,
}: {
  news: NewsItem;
  base: string;
  space: Space;
  actions?: ReactNode;
}) {
  const href = `${base}/${news.id}`;
  const replie = Boolean(news.libre) && publicationLongue(news.corps);
  return (
    <article className="border border-line rounded-[var(--radius-m)] bg-surface p-4 mb-3">
      <div className="mb-2.5">
        <SignaturePublication news={news} />
      </div>
      {news.libre ? (
        news.corps ? (
          <div className="text-[14.2px] leading-relaxed">
            <p
              className={`m-0 whitespace-pre-line break-words ${replie ? "line-clamp-6" : ""}`}
            >
              <TexteLie texte={news.corps} />
            </p>
            {replie ? (
              <Link
                href={href}
                className="mt-1 inline-block text-[13px] font-semibold text-muted no-underline hover:text-accent hover:underline"
              >
                Voir plus
              </Link>
            ) : null}
          </div>
        ) : null
      ) : (
        <div className="text-[13.6px] leading-relaxed">
          <b className="block text-[14.6px] mb-1">{news.titre}</b>
          <TexteLie texte={news.extrait} />
        </div>
      )}
      {news.images.length ? (
        <MosaiquePhotos images={news.images} alt={news.titre} href={href} />
      ) : news.libre ? null : (
        <MediaBanner media={news.media} />
      )}
      <div className="flex items-center justify-between gap-3 flex-wrap mt-3 pt-3 border-t border-line">
        <Reactions
          newsId={news.id}
          space={space}
          jaimes={news.jaimes}
          jaimeParMoi={news.jaimeParMoi}
          commentaires={news.commentaires.length}
          lienCommentaires={`${href}#commentaires`}
        />
        <div className="flex items-center gap-3">
          <Link
            href={href}
            className="text-[12.8px] font-semibold text-accent no-underline hover:underline"
          >
            {news.libre ? "Voir la publication" : "Lire l’article complet"}
          </Link>
          {actions ? <div className="flex gap-1.5">{actions}</div> : null}
        </div>
      </div>
    </article>
  );
}

export function OfferCard({
  offer,
  carre = false,
  className = "",
  etiquette,
}: {
  offer: Offer;
  etiquette?: ReactNode;
  carre?: boolean;
  className?: string;
}) {
  return (
    <ModaleOffre offre={offer}>
      <Card
        className={`group carte-filet filet-bas filet-degrade p-0 ${carre ? "w-full aspect-square" : "h-full"} flex flex-col overflow-hidden transition-shadow hover:shadow-[0_12px_28px_-20px_rgba(15,29,44,0.45)] ${className}`}
      >
        <div
          className={`relative overflow-hidden ${carre ? "flex-1 min-h-0" : ""}`}
        >
          {etiquette ? (
            <span className="absolute left-2.5 top-2.5 z-[2] inline-flex max-w-[calc(100%-20px)] items-center gap-1.5 rounded-full bg-[#0f1d2c]/90 px-2.5 py-1 text-[11.5px] font-semibold leading-none text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
              {etiquette}
            </span>
          ) : null}
          <Visuel
            src={offer.cover}
            position={offer.cadrage ? positionObjet(offer.cadrage) : undefined}
            alt={offer.titre}
            seed={offer.id}
            className={`${carre ? "h-full" : "h-[88px]"} w-full transition-transform duration-500 group-hover:scale-[1.04]`}
            sizes={
              carre
                ? "(max-width: 640px) 100vw, 460px"
                : "(max-width: 640px) 100vw, 240px"
            }
            iconSize={carre ? 28 : 18}
          />
        </div>
        <div className={`p-4 flex flex-col ${carre ? "shrink-0" : "flex-1"}`}>
          <Pill className="self-start">{offer.membre}</Pill>
          <div className="font-semibold text-[13.2px] mt-2 mb-1 line-clamp-2 [overflow-wrap:anywhere]">
            {offer.titre}
          </div>
          {offer.prix ? (
            <div className="text-[13.2px] font-bold text-accent mb-1 [overflow-wrap:anywhere]">{offer.prix}</div>
          ) : null}
          <div className="text-[12.4px] text-muted leading-relaxed line-clamp-2 [overflow-wrap:anywhere]">
            <TexteLie texte={offer.desc} dansUnLien />
          </div>
        </div>
      </Card>
    </ModaleOffre>
  );
}

export function ServiceCard({
  service,
  action,
}: {
  service: CanchamService;
  action?: ReactNode;
}) {
  const gratuit = service.type === "gratuit";
  const Icone = gratuit ? Tag : CreditCard;
  return (
    <Card
      className={`tuile-hote carte-filet filet-fixe filet-bas ${gratuit ? "filet-vert" : "filet-rouge"} p-0 flex flex-col`}
    >
      <div className="relative h-[168px] shrink-0">
        {service.image ? (
          <>
            <Image
              src={service.image}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 420px"
              className="object-cover"
            />
            <span className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />
          </>
        ) : (
          <div
            className="absolute inset-0 overflow-hidden text-white"
            style={{
              background: gratuit
                ? "linear-gradient(135deg, #00502e, #007140 55%, #138a58)"
                : "var(--bouton-rouge)",
            }}
          >
            <span
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgb(255 255 255 / 0.07) 0 2px, transparent 2px 22px)",
              }}
            />
            <Icone
              size={128}
              strokeWidth={1.25}
              className="absolute -right-5 -bottom-9 opacity-[0.16] rotate-[-12deg]"
            />
          </div>
        )}
        <span
          className={`absolute top-3 right-3 rounded-full bg-white/95 px-3 py-1 text-[12px] font-bold shadow-[0_4px_14px_-6px_rgb(0_0_0/0.45)] ${
            gratuit ? "text-success-strong" : "text-ink"
          }`}
        >
          {gratuit ? "Gratuit" : fmtMoney(service.prix)}
        </span>
      </div>

      <div className="relative flex flex-col flex-1 px-[22px] pb-[22px]">
        <div
          className={`tuile tuile-sm -mt-[23px] mb-3.5 ring-4 ring-surface ${gratuit ? "tuile-verte" : "tuile-rouge"}`}
        >
          <Icone size={22} />
        </div>
        <div className="font-bold text-[15px] leading-snug mb-1.5">
          {service.titre}
        </div>
        <p className="text-[12.8px] text-muted leading-relaxed m-0 flex-1">
          <TexteLie texte={service.desc} />
        </p>
        {action ? <div className="mt-4 flex gap-1.5">{action}</div> : null}
      </div>
    </Card>
  );
}

export function ResourceCard({
  resource,
  footer,
  coin,
}: {
  resource: Resource;
  footer?: ReactNode;
  coin?: ReactNode;
}) {
  const video = resource.fmt === "Vidéo";
  return (
    <Card
      className={`carte-filet filet-fixe filet-bas ${
        resource.type === "gratuit" ? "filet-vert" : "filet-rouge"
      } h-full flex flex-col p-0 transition-shadow hover:shadow-[0_12px_28px_-20px_rgba(15,29,44,0.45)]`}
    >
      <div className="relative">
        <Visuel
          src={resource.cover}
          alt=""
          seed={resource.id}
          className="h-[150px] w-full"
          sizes="(max-width: 768px) 100vw, 400px"
          cadrage={
            resource.fmt === "PDF" || resource.fmt === "DOCX"
              ? "object-top"
              : "object-center"
          }
          icon={video ? <Play size={28} /> : <FileText size={28} />}
        />
        <div className="absolute top-2.5 left-2.5 bg-white rounded-[var(--radius-s)] px-2.5 py-[5px] text-center shadow-[var(--shadow)] min-w-[38px]">
          <div className="font-[family-name:var(--font-display)] font-bold text-[13px] leading-none text-accent-strong">
            {resource.fmt}
          </div>
          <div className="text-[9px] uppercase tracking-[0.05em] font-bold text-muted mt-0.5">
            {resource.taille}
          </div>
        </div>
        {coin ? <div className="absolute top-2.5 right-2.5">{coin}</div> : null}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex gap-1.5 flex-wrap mb-1.5">
          <Pill>{resource.cat}</Pill>
          <Pill tone={resource.type === "gratuit" ? "ok" : "muted"}>
            {resource.type === "gratuit" ? "Gratuit" : fmtMoney(resource.prix)}
          </Pill>
        </div>
        <h3 className="m-0 mb-1.5 text-[15.5px]">{resource.titre}</h3>
        {resource.description ? (
          <p className="m-0 mb-1.5 text-[12.8px] text-muted leading-relaxed line-clamp-2">
            {resource.description}
          </p>
        ) : null}
        <div className="text-[12.3px] text-muted flex gap-3 flex-wrap mt-1">
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={13} /> {fmtDateShort(resource.date)}
          </span>
          {resource.commentaires.length ? (
            <span className="inline-flex items-center gap-1">
              <MessageSquare size={13} /> {resource.commentaires.length}{" "}
              commentaire
              {resource.commentaires.length > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
        <div className="flex-1" />
        {footer ? (
          <div className="flex gap-2 mt-3 flex-wrap">{footer}</div>
        ) : null}
      </div>
    </Card>
  );
}

export function ListeContacts({
  contacts,
  titre = "Contacts",
  intro,
  action,
  actionContact,
  piedContact,
}: {
  contacts: Contact[];
  titre?: string;
  intro?: string;
  action?: ReactNode;
  actionContact?: (contact: Contact) => ReactNode;
  piedContact?: (contact: Contact) => ReactNode;
}) {
  if (!contacts.length) return null;

  return (
    <>
      <div className="flex items-center gap-2.5 mt-[22px] mb-1 flex-wrap">
        <div className="w-[3px] self-stretch min-h-[18px] bg-accent rounded-sm" />
        <h2 className="text-[17px] font-semibold m-0">{titre}</h2>
        {action ? (
          <>
            <span className="flex-1" />
            {action}
          </>
        ) : null}
      </div>
      {intro ? (
        <p className="text-[12.8px] text-muted mt-0 mb-3.5">{intro}</p>
      ) : (
        <div className="mb-3.5" />
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {contacts.map((c) => (
          <div
            key={c.id}
            className="carte-filet filet-fixe filet-bleu border border-line rounded-[var(--radius-m)] p-4 flex gap-3 items-start"
          >
            <AvatarRond
              src={c.photo}
              alt={c.nom}
              initiales={initialesDe(c.nom)}
              taille={42}
              className="bg-accent-soft text-accent-strong"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13.8px] font-semibold text-ink">
                  {c.nom}
                </span>
                {c.principal ? <Pill>Contact principal</Pill> : null}
              </div>
              <div className="text-[12.5px] text-muted">{c.fonction}</div>
              <a
                href={`mailto:${c.email}`}
                className="block text-[12.8px] text-accent no-underline hover:underline mt-1.5 truncate"
              >
                {c.email}
              </a>
              {c.tel ? (
                <a
                  href={`tel:${c.tel.replace(/\s/g, "")}`}
                  className="block text-[12.8px] text-ink no-underline hover:underline font-[family-name:var(--font-mono)]"
                >
                  {c.tel}
                </a>
              ) : null}
              {piedContact?.(c)}
            </div>
            {actionContact?.(c)}
          </div>
        ))}
      </div>
    </>
  );
}
