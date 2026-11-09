import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // En local, les tâches ne tournent que sur demande (TACHES_EN_DEV=1) : la base de démo a de fausses adresses
  if (process.env.NODE_ENV === "production" || process.env.TACHES_EN_DEV === "1") await lancerTaches();
  if (process.env.NODE_ENV !== "production") return;

  const alertes: string[] = [];
  if (!process.env.AUTH_SECRET) {
    alertes.push("AUTH_SECRET manquant : aucune connexion ne fonctionnera.");
  }
  if (!process.env.STOCKAGE_RACINE) {
    alertes.push(
      "STOCKAGE_RACINE manquant : les fichiers envoyés seront perdus au prochain déploiement.",
    );
  }
  const smtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  if (!smtp && !process.env.RESEND_API_KEY) {
    alertes.push("SMTP_HOST, SMTP_USER, SMTP_PASS (Brevo) manquants : aucun e-mail ne partira.");
  } else if (!process.env.COURRIEL_EXPEDITEUR && !process.env.MAIL_FROM) {
    alertes.push("MAIL_FROM manquant : indiquez l'expéditeur, sur une adresse validée chez Brevo.");
  }
  if (smtp && !process.env.BREVO_WEBHOOK_SECRET) {
    alertes.push(
      "BREVO_WEBHOOK_SECRET manquant : la newsletter part, mais ses ouvertures, clics et adresses en erreur ne sont pas suivis.",
    );
  } else if (!smtp && process.env.RESEND_API_KEY && !process.env.RESEND_WEBHOOK_SECRET) {
    alertes.push(
      "RESEND_WEBHOOK_SECRET manquant : la newsletter part, mais ses ouvertures, clics et adresses en erreur ne sont pas suivis.",
    );
  }
  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) {
    alertes.push(
      "APP_URL manquant : les liens des e-mails utilisent https://app.cancham.mg.",
    );
  } else if (
    /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/i.test(appUrl)
  ) {
    alertes.push(
      `APP_URL=${appUrl} pointe vers le serveur lui-même : ignorée, les liens des e-mails utilisent https://app.cancham.mg.`,
    );
  }
  if (process.env.CANCHAM_TODAY) {
    alertes.push(
      `CANCHAM_TODAY=${process.env.CANCHAM_TODAY} : la date du jour est figée. À retirer en production.`,
    );
  }
  for (const a of alertes) console.warn(`[configuration] ${a}`);
}

export const onRequestError: Instrumentation.onRequestError = (
  err,
  request,
  context,
) => {
  const e = err instanceof Error ? err : null;
  const digest =
    typeof err === "object" && err !== null && "digest" in err
      ? String(err.digest)
      : undefined;
  console.error(
    JSON.stringify({
      niveau: "erreur",
      date: new Date().toISOString(),
      methode: request.method,
      chemin: request.path.split("?")[0],
      route: context.routePath,
      type: context.routeType,
      digest,
      message: e?.message ?? String(err),
      pile: e?.stack
        ?.split("\n")
        .slice(1, 8)
        .map((l) => l.trim()),
    }),
  );
};

// Tâches régulières : toutes les 5 minutes, le serveur s'appelle lui-même pour envoyer les newsletters
// programmées et les rappels d'événements dus. Le jeton, tiré au démarrage, ne sort pas du processus.
const PERIODE_TACHES = 5 * 60 * 1000;

async function lancerTaches() {
  if (process.env.TACHES_DESACTIVEES === "1") return;
  const { randomUUID } = await import("node:crypto");
  // TACHES_SECRET, s'il est défini, sert aussi ici (utile si une tâche externe appelle la même route)
  const jeton = process.env.TACHES_SECRET || randomUUID();
  process.env.TACHES_JETON = jeton;
  const adresse = `http://127.0.0.1:${process.env.PORT || 3000}/api/taches`;
  const tourner = async () => {
    try {
      const r = await fetch(adresse, { method: "POST", headers: { "x-taches-jeton": jeton } });
      if (!r.ok) console.error(`[taches] réponse ${r.status}`);
    } catch (e) {
      console.error("[taches] route injoignable", e);
    }
  };
  // Premier passage une minute après le démarrage, le temps que le serveur écoute
  setTimeout(() => {
    void tourner();
    setInterval(() => void tourner(), PERIODE_TACHES).unref();
  }, 60_000).unref();
}
