import type { AttendeeStatus, InvoiceStatus, MemberStatus } from "@/lib/types";

export function today(): Date {
  const override = process.env.CANCHAM_TODAY;
  if (override) return new Date(`${override}T00:00:00`);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function aujourdhuiISO(): string {
  const d = today();
  const deux = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
}

export function jourBase(iso: string = aujourdhuiISO()): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function jourSaisi(v: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
    ? v
    : null;
}

export function parseISO(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function isPast(iso: string): boolean {
  return parseISO(iso) < today();
}

export function fmtDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  },
): string {
  return parseISO(iso).toLocaleDateString("fr-FR", opts);
}

export function fmtDateShort(iso: string): string {
  return fmtDate(iso, { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Tous les tarifs sont en dollars canadiens
export function fmtMoney(n: number): string {
  return `${n.toLocaleString("fr-FR")} $`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const STATUS_LABELS: Record<
  MemberStatus | InvoiceStatus | AttendeeStatus,
  string
> = {
  a_jour: "À jour",
  en_attente: "En attente de paiement",
  en_retard: "En retard",
  candidature: "Nouvelle demande",
  refusee: "Refusée",
  payee: "Payée",
  envoyee: "Envoyée",
  confirmé: "Confirmé",
  présent: "Présent",
  absent: "Absent",
};

export function statusLabel(
  s: MemberStatus | InvoiceStatus | AttendeeStatus,
): string {
  return STATUS_LABELS[s] ?? s;
}
