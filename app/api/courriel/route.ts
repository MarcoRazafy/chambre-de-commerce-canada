import { guard } from '@/lib/auth';

// État de l'envoi des courriels (administrateurs) : configuré ou non, serveur et expéditeur. Jamais le mot de passe.
export async function GET() {
  const u = await guard(true);
  if (u instanceof Response) return u;
  const e = process.env;
  const masque = (s?: string) => (s ? s.replace(/^(.{3}).*(@.*)?$/, (_, a, d) => `${a}…${d ?? ''}`) : null);
  return Response.json({
    configure: !!e.SMTP_HOST, hote: e.SMTP_HOST || null, port: e.SMTP_PORT || '587', securise: e.SMTP_SECURE === 'true',
    utilisateur: masque(e.SMTP_USER), expediteur: e.MAIL_FROM || e.SMTP_USER || null, adresseApp: e.APP_URL || null, vous: u.email,
  });
}
