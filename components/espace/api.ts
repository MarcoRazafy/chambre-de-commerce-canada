// Appels aux routes de l'espace membre ; une session expirée ramène à la connexion
export async function appel<T = any>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401 && typeof window !== 'undefined') { window.location.href = '/connexion'; throw new Error('Connexion requise'); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Erreur ${r.status}`);
  return d;
}

export const argent = (n: number, devise: string) => devise === 'CAD'
  ? `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`
  : `${n.toLocaleString('fr-FR')} Ar`;
export const totalLignes = (l: { mt: number }[] | null) => (l ?? []).reduce((a, x) => a + Number(x.mt || 0), 0);
export const jour = (v?: string | null, annee = true) => (v ? new Date(v.length === 10 ? v + 'T12:00' : v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', ...(annee ? { year: 'numeric' } : {}) }) : '—');
