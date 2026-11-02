import { q, fail } from '@/lib/db';
import { guard } from '@/lib/auth';

type Member = { id: number; nom: string; pays: string; besoins: string[]; offres: string[]; interets: string[] };

// Même calcul que la maquette : besoins ↔ offres, intérêts communs, pont Canada–Madagascar
function match(a: Member, b: Member) {
  const shared = a.interets.filter(x => b.interets.includes(x));
  const ab = a.besoins.filter(x => b.offres.includes(x)), ba = b.besoins.filter(x => a.offres.includes(x));
  const bridge = a.pays !== b.pays;
  const raw = shared.length * 12 + (ab.length + ba.length) * 26 + (bridge && (ab.length || ba.length) ? 10 : 0);
  if (!raw) return null;
  const why: string[] = [];
  ab.forEach(x => why.push(`${a.nom} cherche « ${x} », proposé par ${b.nom}`));
  ba.forEach(x => why.push(`${b.nom} cherche « ${x} », proposé par ${a.nom}`));
  if (shared.length) why.push(`Intérêts communs : ${shared.join(', ')}`);
  if (bridge) why.push('Un membre au Canada, l’autre à Madagascar');
  return { a: { id: a.id, nom: a.nom, pays: a.pays }, b: { id: b.id, nom: b.nom, pays: b.pays }, score: Math.min(97, 35 + raw), why };
}

// GET /api/suggestions?member=12 pour limiter à un membre
export async function GET(req: Request) {
  const u = await guard();
  if (u instanceof Response) return u;
  const only = Number(new URL(req.url).searchParams.get('member')) || null;
  try {
    const ms = await q<Member>(`select id, nom, pays, besoins, offres, interets from members where statut in ('a_jour', 'attente', 'retard') order by id`);
    const done = new Set((await q<{ a: number; b: number }>('select member_a as a, member_b as b from connections')).map(c => [c.a, c.b].sort().join('|')));
    const out = [];
    for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) {
      const a = ms[i], b = ms[j];
      if (done.has([a.id, b.id].sort().join('|'))) continue;
      if (only && a.id !== only && b.id !== only) continue;
      const r = match(a, b);
      if (r && r.score >= 55) out.push(r);
    }
    return Response.json(out.sort((x, y) => y.score - x.score));
  } catch (e) {
    return fail(e);
  }
}
