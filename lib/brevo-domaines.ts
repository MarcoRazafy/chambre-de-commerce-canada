import "server-only";

// Domaines d'expédition chez Brevo (API v3, clé BREVO_API_KEY) : savoir si l'adresse d'une entreprise peut
// servir d'expéditeur, déclarer son domaine, lancer la vérification DNS, créer l'expéditeur une fois validé.
// Sans clé ou si Brevo ne répond pas, rien n'est validé : les courriels partent de l'adresse du serveur.

const API = "https://api.brevo.com/v3";

// Messageries gratuites : leur domaine appartient au fournisseur, impossible de le valider
const WEBMAILS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.fr", "ymail.com", "hotmail.com", "hotmail.fr", "outlook.com",
  "outlook.fr", "live.com", "live.fr", "msn.com", "icloud.com", "me.com", "mac.com", "aol.com", "gmx.com", "gmx.fr",
  "proton.me", "protonmail.com", "laposte.net", "orange.fr", "free.fr", "sfr.fr", "wanadoo.fr", "yandex.com", "mail.ru",
]);

export type EnregistrementDns = { type: string; nom: string; valeur: string; ok: boolean };

export type EtatDomaine =
  | { etat: "vide" }
  | { etat: "webmail"; domaine: string }
  | { etat: "valide"; domaine: string }
  | { etat: "absent"; domaine: string }
  | { etat: "en_attente"; domaine: string; enregistrements: EnregistrementDns[] }
  | { etat: "indisponible"; domaine: string; raison: string };

export const domaineDe = (email: string) => email.trim().toLowerCase().split("@")[1] ?? "";
export const estWebmail = (domaine: string) => WEBMAILS.has(domaine);
export const brevoConfigure = () => Boolean(process.env.BREVO_API_KEY?.trim());

async function appel(chemin: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API}${chemin}`, {
    ...init,
    headers: {
      "api-key": process.env.BREVO_API_KEY!.trim(),
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}

type ReponseDomaine = {
  authenticated?: boolean;
  verified?: boolean;
  dns_records?: Record<string, { type?: string; value?: string; host_name?: string; status?: boolean } | null>;
};

function enregistrements(r: ReponseDomaine): EnregistrementDns[] {
  // Dans l'ordre où l'entreprise les ajoute : code Brevo, signatures DKIM, puis DMARC
  const ordre = ["brevo_code", "dkim1Record", "dkim2Record", "dkim_record", "dmarc_record"];
  return ordre
    .map((k) => r.dns_records?.[k])
    .filter((x): x is NonNullable<typeof x> => !!x?.value)
    .map((x) => ({ type: x.type ?? "TXT", nom: x.host_name ?? "@", valeur: x.value!, ok: Boolean(x.status) }));
}

// État d'une adresse d'expédition, lu chez Brevo (sans cache : pour la page « Mon entreprise »)
export async function etatDomaine(email: string): Promise<EtatDomaine> {
  const domaine = domaineDe(email);
  if (!domaine) return { etat: "vide" };
  if (estWebmail(domaine)) return { etat: "webmail", domaine };
  if (!brevoConfigure()) return { etat: "indisponible", domaine, raison: "clé API Brevo absente (BREVO_API_KEY)" };
  try {
    const r = await appel(`/senders/domains/${encodeURIComponent(domaine)}`);
    if (r.status === 404) return { etat: "absent", domaine };
    if (!r.ok) return { etat: "indisponible", domaine, raison: `Brevo a répondu ${r.status}` };
    const d = (await r.json()) as ReponseDomaine;
    return d.authenticated ? { etat: "valide", domaine } : { etat: "en_attente", domaine, enregistrements: enregistrements(d) };
  } catch (e) {
    console.error(`[brevo] état du domaine ${domaine} illisible`, e);
    return { etat: "indisponible", domaine, raison: "Brevo ne répond pas" };
  }
}

// Pour l'envoi : l'adresse peut-elle être l'expéditeur ? Réponse gardée 10 min par domaine
const memoire = new Map<string, { jusqua: number; ok: boolean }>();
export async function adresseValidee(email: string): Promise<boolean> {
  const domaine = domaineDe(email);
  const m = memoire.get(domaine);
  if (m && m.jusqua > Date.now()) return m.ok;
  const e = await etatDomaine(email);
  const ok = e.etat === "valide";
  // Brevo injoignable : on réessaie vite, sans retenir un « non » qui durerait
  memoire.set(domaine, { jusqua: Date.now() + (e.etat === "indisponible" ? 60_000 : 600_000), ok });
  return ok;
}
export function oublierDomaine(email: string) {
  memoire.delete(domaineDe(email));
}

// Déclare le domaine chez Brevo (sans effet s'il l'est déjà) ; renvoie son état, avec les enregistrements DNS
export async function declarerDomaine(email: string): Promise<EtatDomaine> {
  const domaine = domaineDe(email);
  if (!domaine || estWebmail(domaine) || !brevoConfigure()) return etatDomaine(email);
  const r = await appel("/senders/domains", { method: "POST", body: JSON.stringify({ name: domaine }) });
  if (!r.ok && r.status !== 400) {
    console.error(`[brevo] déclaration du domaine ${domaine} refusée (${r.status}) : ${await r.text()}`);
  }
  return etatDomaine(email);
}

// Demande à Brevo de contrôler les enregistrements DNS ; une fois validé, crée l'expéditeur s'il n'existe pas
export async function verifierDomaine(email: string, nom: string): Promise<EtatDomaine> {
  const domaine = domaineDe(email);
  if (!domaine || estWebmail(domaine) || !brevoConfigure()) return etatDomaine(email);
  const r = await appel(`/senders/domains/${encodeURIComponent(domaine)}/authenticate`, { method: "PUT" });
  if (!r.ok) console.warn(`[brevo] vérification du domaine ${domaine} : ${r.status} ${await r.text()}`);
  oublierDomaine(email);
  const etat = await etatDomaine(email);
  if (etat.etat === "valide") await assurerExpediteur(email, nom);
  return etat;
}

// L'adresse existe comme expéditeur chez Brevo (créée au besoin)
export async function assurerExpediteur(email: string, nom: string): Promise<void> {
  if (!brevoConfigure()) return;
  try {
    const r = await appel("/senders");
    const { senders = [] } = r.ok ? ((await r.json()) as { senders?: { email: string }[] }) : {};
    if (senders.some((s) => s.email.toLowerCase() === email.trim().toLowerCase())) return;
    const c = await appel("/senders", { method: "POST", body: JSON.stringify({ name: nom.slice(0, 70) || email, email: email.trim() }) });
    if (!c.ok) console.warn(`[brevo] création de l'expéditeur ${email} : ${c.status} ${await c.text()}`);
  } catch (e) {
    console.error(`[brevo] expéditeur ${email} non créé`, e);
  }
}
