import { q, fail } from '@/lib/db';
import { guard } from '@/lib/auth';
import { texteDemande, type Reponses } from '@/lib/maillage';

type Member = { id: number; nom: string; pays: string; besoins: string[]; offres: string[]; interets: string[]; texte: string };

// Étiquettes trop générales pour justifier, seules, une mise en relation
const GENERIC = new Set(['Réseau d’affaires au Canada']);
// Pour les étiquettes de l'annuaire CanCham, le besoin doit se retrouver dans ce que le membre a écrit
// (« ce qu'il recherche », motivation) ; une étiquette saisie à la main par l'équipe compte toujours.
const NEED_WORDS: Record<string, RegExp> = {
  'Site web & applications': /(site web|e-commerce|en ligne|digital|numérique|application)/i,
  'Marketing digital & réseaux sociaux': /(visibilit|promo|faire (découvrir|connaître)|marketing|image de marque|communication)/i,
  'Externalisation & assistance à distance': /(externalis|sous-trait|assistan|main-d)/i,
  'Acheteurs & distributeurs au Canada': /(acheteur|distribut|importateur|grossiste|débouché|partenaires? commerciaux|export)/i,
  'Transport & logistique': /(export|logisti|expédi|transport|fret)/i,
  'Produits malgaches à l’export': /(distribut|import|épice|vanille|produits? malgache)/i,
  'Voyage, études & emploi au Canada': /(emploi|étudier|études|voyager|mobilit|visa)/i,
  'Formation & montée en compétences': /(formation|compétenc|renforcement)/i,
  'Conseil & accompagnement d’affaires': /(accompagnement|appuis?|implant|structurer|conseil)/i,
  'Agence réceptive à Madagascar': /(séminaire|incentive|voyage d'affaires|mission à madagascar|découvrir madagascar)/i,
};
const MAX_PAR_MEMBRE = 3;     // un membre n'apparaît que dans ses meilleurs rapprochements
const SEUIL = 61;             // au moins un vrai échange besoin ↔ offre

// Besoins ↔ offres, intérêts communs, pont Canada–Madagascar.
// Un besoin ne compte que si le membre l'a vraiment exprimé : un besoin seulement déduit de son secteur ne suffit pas.
function match(a: Member, b: Member) {
  const real = (needer: Member, x: string, offerer: Member) => !GENERIC.has(x) && offerer.offres.includes(x) && (!NEED_WORDS[x] || NEED_WORDS[x].test(needer.texte));
  const ab = a.besoins.filter(x => real(a, x, b)), ba = b.besoins.filter(x => real(b, x, a));
  if (!ab.length && !ba.length) return null;
  const shared = a.interets.filter(x => b.interets.includes(x));
  const bridge = a.pays !== b.pays;
  const raw = (ab.length + ba.length) * 26 + shared.length * 12 + (bridge ? 10 : 0);
  const score = Math.min(97, 35 + raw);
  if (score < SEUIL) return null;
  const why: string[] = [];
  ab.forEach(x => why.push(`${a.nom} cherche « ${x} », proposé par ${b.nom}`));
  ba.forEach(x => why.push(`${b.nom} cherche « ${x} », proposé par ${a.nom}`));
  if (shared.length) why.push(`Intérêts communs : ${shared.join(', ')}`);
  if (bridge) why.push('Un membre au Canada, l’autre à Madagascar');
  // Échanges structurés pour l'affichage : qui propose (from) quoi (tag) à qui (to)
  const flows = [...ab.map(tag => ({ tag, from: b.id, to: a.id })), ...ba.map(tag => ({ tag, from: a.id, to: b.id }))];
  return { a: { id: a.id, nom: a.nom, pays: a.pays }, b: { id: b.id, nom: b.nom, pays: b.pays }, score, why, flows, shared, bridge };
}

// GET /api/suggestions?member=12 pour limiter à un membre
export async function GET(req: Request) {
  const u = await guard();
  if (u instanceof Response) return u;
  const only = Number(new URL(req.url).searchParams.get('member')) || null;
  try {
    // Ce que le membre cherche : sa fiche, et ses réponses au questionnaire de maillage (section C)
    const ms = (await q<Member & { reponses: Reponses | null }>(`select m.id, m.nom, m.pays, m.besoins, m.offres, m.interets,
                                       concat_ws(' ', m.recherche, m.motivation) as texte, mg.reponses
                                from members m left join maillage mg on mg.member_id = m.id
                                where m.statut in ('a_jour', 'attente', 'retard') order by m.id`))
      .map(({ reponses, ...m }) => ({ ...m, texte: [m.texte, reponses ? texteDemande(reponses) : ''].join(' ') }));
    const done = new Set((await q<{ a: number; b: number }>('select member_a as a, member_b as b from connections')).map(c => [c.a, c.b].sort().join('|')));
    const all = [];
    for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) {
      const a = ms[i], b = ms[j];
      if (done.has([a.id, b.id].sort().join('|'))) continue;
      if (only && a.id !== only && b.id !== only) continue;
      const r = match(a, b);
      if (r) all.push(r);
    }
    all.sort((x, y) => y.score - x.score || y.flows.length - x.flows.length);
    if (only) return Response.json(all);
    // Vue d'ensemble : chaque membre garde ses meilleurs rapprochements seulement
    const n = new Map<number, number>(), out = [];
    for (const s of all) {
      if ((n.get(s.a.id) ?? 0) >= MAX_PAR_MEMBRE || (n.get(s.b.id) ?? 0) >= MAX_PAR_MEMBRE) continue;
      n.set(s.a.id, (n.get(s.a.id) ?? 0) + 1); n.set(s.b.id, (n.get(s.b.id) ?? 0) + 1);
      out.push(s);
    }
    return Response.json(out);
  } catch (e) {
    return fail(e);
  }
}
