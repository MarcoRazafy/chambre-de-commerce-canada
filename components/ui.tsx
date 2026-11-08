import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Check, Clock, Plus, X } from "lucide-react";
import { statusLabel } from "@/lib/format";
import type { AttendeeStatus, InvoiceStatus, MemberStatus } from "@/lib/types";

export function Card({
  className = "",
  children,
  ...rest
}: ComponentProps<"div">) {
  return (
    <div
      className={`bg-surface border border-line rounded-[var(--radius-m)] shadow-[var(--shadow)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-3.5">
      <div className="w-[3px] self-stretch min-h-[18px] bg-accent rounded-sm" />
      <h2 className="text-[17px] font-semibold m-0">{children}</h2>
    </div>
  );
}

export function ViewHead({
  title,
  children,
  action,
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
      <div>
        <h1 className="text-[26px] font-semibold m-0 mb-1">{title}</h1>
        {children ? (
          <p className="m-0 text-muted text-[13.6px] max-w-[56ch]">
            {children}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

type PillTone = "ok" | "warn" | "bad" | "muted" | "info";

const PILL_TONES: Record<PillTone, string> = {
  ok: "bg-success-soft text-success-strong",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  muted: "bg-surface-3 text-muted",
  info: "bg-navy-soft text-navy",
};

export function Pill({
  tone = "muted",
  icon,
  children,
  className = "",
}: {
  tone?: PillTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11.3px] font-bold px-2.5 py-[3px] rounded-full ${PILL_TONES[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<
  MemberStatus | InvoiceStatus | AttendeeStatus,
  PillTone
> = {
  a_jour: "ok",
  payee: "ok",
  présent: "ok",
  en_attente: "warn",
  envoyee: "warn",
  candidature: "warn",
  refusee: "bad",
  confirmé: "warn",
  en_retard: "bad",
  absent: "bad",
};

export function StatusPill({
  status,
}: {
  status: MemberStatus | InvoiceStatus | AttendeeStatus;
}) {
  const tone = STATUS_TONE[status];
  const icon =
    status === "en_retard" || status === "absent" ? (
      <X size={10} strokeWidth={2.5} />
    ) : status === "candidature" ? (
      <Plus size={10} strokeWidth={2.5} />
    ) : tone === "warn" ? (
      <Clock size={10} strokeWidth={2.5} />
    ) : (
      <Check size={10} strokeWidth={2.5} />
    );
  return (
    <Pill tone={tone} icon={icon}>
      {statusLabel(status)}
    </Pill>
  );
}

type BtnVariant = "primary" | "line" | "ghost";

const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary: "btn-action",
  line: "bg-transparent border-line text-ink hover:border-faint hover:bg-surface-2",
  ghost:
    "bg-transparent border-transparent text-muted hover:text-ink hover:bg-surface-2",
};

const BTN_BASE =
  "inline-flex items-center gap-[7px] rounded-[var(--radius-s)] font-semibold cursor-pointer border no-underline whitespace-nowrap transition-colors";

export function Btn({
  variant = "line",
  sm = false,
  className = "",
  children,
  ...rest
}: ComponentProps<"button"> & { variant?: BtnVariant; sm?: boolean }) {
  const primaire = variant === "primary";
  const size = primaire
    ? sm
      ? "btn-action-sm"
      : ""
    : sm
      ? "text-[12.4px] px-[11px] py-1.5"
      : "text-[13.4px] px-[15px] py-[9px]";
  return (
    <button
      className={`${primaire ? "" : BTN_BASE} ${size} ${BTN_VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function BtnLink({
  variant = "line",
  sm = false,
  className = "",
  children,
  ...rest
}: ComponentProps<typeof Link> & { variant?: BtnVariant; sm?: boolean }) {
  const primaire = variant === "primary";
  const size = primaire
    ? sm
      ? "btn-action-sm"
      : ""
    : sm
      ? "text-[12.4px] px-[11px] py-1.5"
      : "text-[13.4px] px-[15px] py-[9px]";
  return (
    <Link
      className={`${primaire ? "" : BTN_BASE} ${size} ${BTN_VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function Stat({
  k,
  v,
  d,
  vClassName = "",
}: {
  k: string;
  v: ReactNode;
  d?: ReactNode;
  vClassName?: string;
}) {
  return (
    <Card className="p-[22px] flex flex-col gap-1.5">
      <div className="text-[11.5px] uppercase tracking-[0.08em] text-faint font-semibold">
        {k}
      </div>
      <div
        className={`font-[family-name:var(--font-display)] text-[30px] font-semibold tabular-nums ${vClassName}`}
      >
        {v}
      </div>
      {d ? <div className="text-xs text-muted">{d}</div> : null}
    </Card>
  );
}

type BannerTone = "ok" | "warn" | "bad";

const BANNER_TONES: Record<BannerTone, string> = {
  ok: "bg-success-soft text-success-strong",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
};

export function Banner({
  tone,
  icon,
  title,
  children,
  action,
}: {
  tone: BannerTone;
  icon?: ReactNode;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={`flex gap-3 px-4 py-3.5 rounded-[var(--radius-m)] items-start text-[13.3px] ${BANNER_TONES[tone]}`}
    >
      {icon ? <div className="shrink-0 mt-px">{icon}</div> : null}
      <div>
        {title ? (
          <>
            <b>{title}</b>
            <br />
          </>
        ) : null}
        <span>{children}</span>
        {action ? <div className="mt-2.5">{action}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="px-5 py-11 text-center text-muted border border-dashed border-line rounded-[var(--radius-m)]">
      {children}
    </div>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11.3px] font-bold tracking-[0.09em] uppercase text-accent">
      {children}
    </span>
  );
}

export function Avatar({
  initials: init,
  src,
  alt = "",
  className = "",
  size = 34,
}: {
  initials: string;
  src?: string | null;
  alt?: string;
  className?: string;
  size?: number;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        sizes={`${size}px`}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.37 }}
    >
      {init}
    </div>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-line rounded-[var(--radius-m)] bg-surface">
      <table className="w-full border-collapse text-[13.3px]">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: ComponentProps<"th">) {
  return (
    <th
      className={`text-left text-[11px] uppercase tracking-[0.07em] text-faint font-semibold px-3.5 py-[11px] border-b border-line whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: ComponentProps<"td">) {
  return (
    <td
      className={`px-3.5 py-3 border-b border-line align-middle ${className}`}
    >
      {children}
    </td>
  );
}

export function Saillant({
  children,
  ton = "rouge",
}: {
  children: ReactNode;
  ton?: "rouge" | "vert";
}) {
  return (
    <span className={`saillant ${ton === "vert" ? "saillant-vert" : ""}`}>
      {children}
    </span>
  );
}
