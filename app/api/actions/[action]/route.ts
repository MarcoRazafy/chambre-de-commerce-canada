import { fail, q } from '@/lib/db';
import { guard } from '@/lib/auth';
import { runJobs } from '@/lib/jobs';
import * as B from '@/lib/business';

// Boutons d'action du back-office : POST /api/actions/<action> avec { id, ... }
type Body = { id?: number; mode?: string; a?: number; b?: number; message?: string; rows?: { email: string; nom?: string }[] };
const ACTIONS: Record<string, (b: Body, par: string) => Promise<string>> = {
  'member-approve': (b, par) => B.approveMember(b.id!, par),
  'member-refuse': (b, par) => B.refuseMember(b.id!, par),
  'member-remind': (b, par) => B.remindMember(b.id!, par),
  'invoice-paid': (b, par) => B.markPaid(b.id!, b.mode ?? null, par),
  'invoice-remind': (b, par) => B.remindInvoice(b.id!, par),
  'reglement-confirm': (b, par) => B.confirmReglement(b.id!, par),
  'reglement-reject': (b, par) => B.rejectReglement(b.id!, par),
  'campaign-send': (b, par) => B.sendCampaign(b.id!, par),
  'outbox-send': (b, par) => B.sendOutbox(b.id!, par),
  'outbox-cancel': async b => {
    if (!(await q(`update outbox set statut = 'annulé' where id = $1 and statut = 'programmé' returning id`, [b.id])).length) throw new B.ActionError('Seul un envoi programmé peut être annulé');
    return 'Envoi annulé.';
  },
  'introduce': (b, par) => {
    if (!b.a || !b.b || b.a === b.b || !b.message?.trim()) throw new B.ActionError('Deux membres différents et un message sont requis');
    return B.introduce(b.a, b.b, b.message.trim(), par);
  },
  'subscribers-import': (b, par) => B.importSubscribers(b.rows ?? [], par),
  'notifications-read': async () => B.readAllNotifications(),
  'run-jobs': async () => { await runJobs(); return 'Tâches automatiques exécutées.'; },
};

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!Object.hasOwn(ACTIONS, action)) return Response.json({ error: 'Action inconnue' }, { status: 404 });
  const u = await guard();
  if (u instanceof Response) return u;
  try {
    const body: Body = await req.json().catch(() => ({}));
    if (body.id !== undefined && !Number.isInteger(body.id)) return Response.json({ error: 'Identifiant invalide' }, { status: 400 });
    return Response.json({ message: await ACTIONS[action](body, u.nom) });
  } catch (e) {
    return e instanceof B.ActionError ? Response.json({ error: e.message }, { status: 400 }) : fail(e);
  }
}
