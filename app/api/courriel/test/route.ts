import { guard } from '@/lib/auth';
import { deliver } from '@/lib/mail';
import { journal } from '@/lib/hooks';

// Courriel de test, envoyé uniquement à l'administrateur connecté (jamais aux membres)
export async function POST() {
  const u = await guard(true);
  if (u instanceof Response) return u;
  const r = await deliver([u.email], 'Test d’envoi — CanCham Madagascar',
    `Bonjour ${u.nom},\n\nCe courriel confirme que l’envoi fonctionne depuis la plateforme (${process.env.SMTP_HOST ?? 'serveur non configuré'}).\nLes newsletters, factures, relances et rappels partiront avec cet expéditeur : ${process.env.MAIL_FROM || process.env.SMTP_USER || '—'}.\n\nL’Alliée Virtuelle`);
  await journal('Système', 'Courriel de test', r.sent ? `Envoyé à ${u.email}` : `Échec : ${r.error}`, u.nom);
  return r.sent ? Response.json({ ok: true, a: u.email }) : Response.json({ error: r.error || 'Envoi impossible' }, { status: 400 });
}
