export type EvenementBrevo = {
  event?: string;
  email?: string;
  "message-id"?: string;
  "X-Mailin-custom"?: string;
  ts_event?: number;
  ts_epoch?: number;
};

export type Effet = {
  envoi: "livreLe" | "ouvertLe" | "clicLe" | "erreurLe" | null;
  abonne: "erreurLe" | "desabonneLe" | null;
};

export function effetBrevo(e: EvenementBrevo): Effet {
  switch (e.event) {
    case "delivered":
      return { envoi: "livreLe", abonne: null };
    case "opened":
    case "unique_opened":
      return { envoi: "ouvertLe", abonne: null };
    case "click":
      return { envoi: "clicLe", abonne: null };
    case "hard_bounce":
    case "invalid_email":
    case "blocked":
      return { envoi: "erreurLe", abonne: "erreurLe" };
    case "error":
      return { envoi: "erreurLe", abonne: null };
    case "spam":
    case "unsubscribed":
      return { envoi: null, abonne: "desabonneLe" };
    default:
      return { envoi: null, abonne: null };
  }
}

export function identifiantsBrevo(e: EvenementBrevo): { suivi: string | null; messageId: string | null } {
  const propre = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().replace(/^<|>$/g, "") : null);
  return { suivi: propre(e["X-Mailin-custom"]), messageId: propre(e["message-id"]) };
}

export function momentBrevo(e: EvenementBrevo): Date {
  const s = e.ts_epoch ?? e.ts_event;
  const d = typeof s === "number" ? new Date(s > 1e12 ? s : s * 1000) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}
