// Questionnaire de maillage des membres (document « Questionnaire de maillage des membres », CanCham, nov. 2026).
// Première version : les 16 questions essentielles (★). Partagé par la page du membre (lien personnel)
// et par l'équipe (fiche membre) ; aucune dépendance serveur.

export type SectionId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type Champ = { k: string; label: string; type?: 'text' | 'number' | 'url' | 'date' | 'textarea'; placeholder?: string; requis?: boolean };
export type Question = {
  id: string; section: SectionId; titre: string; aide?: string;
  type: 'champs' | 'texte' | 'fiches' | 'choix' | 'mots' | 'secteurs' | 'visibilite';
  champs?: Champ[];                       // champs (plusieurs petits champs) et fiches (une fiche répétable)
  min?: number; max?: number;             // fiches : nombre de fiches
  options?: string[];                     // choix multiples
  details?: string; detailsRequis?: boolean; // texte d'accompagnement (choix, mots, secteurs)
  listes?: { k: string; label: string; placeholder?: string }[]; // mots : une ou plusieurs listes de mots-clés
  placeholder?: string;
};
export type Reponses = Record<string, unknown>;
export type Visibilite = 'membres' | 'chambre' | 'algo';

export const SECTIONS: { id: SectionId; titre: string; intro: string }[] = [
  { id: 'A', titre: 'Profil de l’entreprise', intro: 'Ces informations servent de filtres (secteur, taille, zone) pour que les propositions soient pertinentes.' },
  { id: 'B', titre: 'Ce que vous offrez', intro: 'Au-delà du catalogue, pensez aux capacités et ressources dormantes : c’est souvent là que naissent les partenariats inattendus.' },
  { id: 'C', titre: 'Ce que vous cherchez', intro: 'Chaque besoin exprimé est comparé à l’offre de tous les autres membres. Soyez concret : quantités, lieux, délais.' },
  { id: 'D', titre: 'Marchés et ambitions', intro: 'Deux membres qui visent le même client sans être concurrents peuvent vendre ensemble ou répondre ensemble à un appel d’offres.' },
  { id: 'E', titre: 'Intérêts et innovation', intro: 'Ces sujets rapprochent des membres de secteurs éloignés qui travaillent sur les mêmes thèmes.' },
  { id: 'F', titre: 'Collaboration et confidentialité', intro: 'La Chambre ne vous propose que les types de liens que vous acceptez, et respecte vos choix de confidentialité.' },
];

export const VISIBILITES: [Visibilite, string, string][] = [
  ['membres', 'Visible par les membres', 'Les autres membres peuvent lire ces réponses.'],
  ['chambre', 'Visible par la Chambre', 'Seule l’équipe de la Chambre les lit.'],
  ['algo', 'Pour les suggestions seulement', 'Utilisées pour trouver des pistes, jamais affichées.'],
];

export const QUESTIONS: Question[] = [
  { id: 'A1', section: 'A', titre: 'Nom de l’entreprise, année de création, site web', type: 'champs', champs: [
    { k: 'nom', label: 'Nom de l’entreprise', requis: true }, { k: 'annee', label: 'Année de création', type: 'number', placeholder: '2015' },
    { k: 'site', label: 'Site web', type: 'url', placeholder: 'https://…' }] },
  { id: 'A2', section: 'A', titre: 'Secteur(s) d’activité principal et secondaires', type: 'secteurs',
    details: 'Précisez si besoin (ex. « transformation de vanille, export en vrac »)' },
  { id: 'A3', section: 'A', titre: 'Décrivez votre activité en 3 phrases, comme à un futur partenaire', type: 'texte',
    placeholder: 'Nous produisons… pour… Notre force…' },

  { id: 'B1', section: 'B', titre: 'Vos 3 à 5 produits ou services phares', type: 'fiches', min: 1, max: 5, champs: [
    { k: 'nom', label: 'Produit ou service', requis: true }, { k: 'description', label: 'Description courte', type: 'textarea' },
    { k: 'client', label: 'Client type' }, { k: 'prix', label: 'Fourchette de prix', placeholder: 'ex. 50 000 à 200 000 Ar' }] },
  { id: 'B2', section: 'B', titre: 'Quel problème résolvez-vous pour vos clients ? Décrivez un cas concret récent', type: 'texte' },
  { id: 'B5', section: 'B', titre: 'Actifs sous-utilisés que vous pourriez partager ou louer', type: 'choix',
    options: ['Entrepôt ou stockage', 'Flotte de véhicules', 'Machines ou équipements', 'Laboratoire', 'Bureaux ou salles', 'Temps d’experts', 'Aucun pour l’instant'],
    details: 'Détails : où, combien, quand (ex. « 300 m² d’entrepôt à Tamatave, libres d’avril à août »)' },

  { id: 'C1', section: 'C', titre: 'Vos 3 principaux postes d’achat externes et leur volume annuel', type: 'fiches', min: 1, max: 3, champs: [
    { k: 'poste', label: 'Bien ou service acheté', requis: true, placeholder: 'ex. emballages carton' },
    { k: 'volume', label: 'Volume annuel approximatif', placeholder: 'ex. 20 tonnes, ou 40 millions Ar' }] },
  { id: 'C2', section: 'C', titre: 'Fournisseurs ou prestataires que vous cherchez actuellement, avec le délai souhaité', type: 'champs', champs: [
    { k: 'texte', label: 'Ce que vous cherchez', type: 'textarea', requis: true, placeholder: 'ex. un transporteur frigorifique pour 3 tonnes par semaine vers Tamatave' },
    { k: 'delai', label: 'Pour quand ?', type: 'date' }] },
  { id: 'C4', section: 'C', titre: 'Le problème opérationnel que vous n’arrivez pas à résoudre depuis plus de 6 mois', type: 'texte' },

  { id: 'D1', section: 'D', titre: 'Votre client idéal : secteur, taille, fonction du décideur', type: 'choix',
    options: ['Particuliers', 'Startups', 'PME', 'Grandes entreprises', 'Administrations', 'ONG et bailleurs'],
    details: 'Décrivez-le (ex. « directeurs achats des hôtels de Nosy Be »)', detailsRequis: true },
  { id: 'D3', section: 'D', titre: 'Marchés géographiques actuels et ceux que vous visez dans les 3 ans', type: 'mots', listes: [
    { k: 'actuels', label: 'Marchés actuels', placeholder: 'ex. Antananarivo, Québec' },
    { k: 'vises', label: 'Marchés visés dans 3 ans', placeholder: 'ex. Ontario, La Réunion' }] },
  { id: 'D5', section: 'D', titre: 'Vos 3 priorités stratégiques des 12 à 24 prochains mois', type: 'texte', placeholder: '1. …\n2. …\n3. …' },

  { id: 'E1', section: 'E', titre: 'Thèmes que vous explorez en ce moment', aide: 'ex. énergie solaire, traçabilité, IA, emballage durable, paiement mobile', type: 'mots',
    listes: [{ k: 'themes', label: 'Thèmes', placeholder: 'Tapez un thème puis Entrée' }], details: 'Ce que vous faites concrètement sur ces sujets' },

  { id: 'F1', section: 'F', titre: 'Types de collaboration qui vous intéressent', type: 'choix',
    options: ['Client', 'Fournisseur', 'Sous-traitance', 'Distribution', 'Co-entreprise', 'Consortium d’appel d’offres', 'Achats groupés', 'Partage de ressources', 'Investissement', 'Mentorat'] },
  { id: 'F2', section: 'F', titre: 'Profils que vous ne souhaitez PAS rencontrer', aide: 'Concurrents directs, secteurs exclus… Écrivez « aucun » si tout vous convient.', type: 'texte' },
  { id: 'F8', section: 'F', titre: 'Qui peut voir vos réponses, section par section ?', type: 'visibilite' },
];
export const IDS = new Set(QUESTIONS.map(q => q.id));

const txt = (v: unknown) => typeof v === 'string' && v.trim().length > 1;
const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
export function estRepondu(q: Question, v: unknown): boolean {
  if (v == null) return false;
  switch (q.type) {
    case 'texte': return txt(v);
    case 'champs': { const o = obj(v), req = q.champs!.filter(c => c.requis); return req.length ? req.every(c => txt(String(o[c.k] ?? ''))) : q.champs!.some(c => txt(String(o[c.k] ?? ''))); }
    case 'fiches': { const l = Array.isArray(v) ? v as Record<string, unknown>[] : [], k = q.champs!.find(c => c.requis)!.k; return l.filter(f => txt(String(f?.[k] ?? ''))).length >= (q.min ?? 1); }
    case 'choix': { const o = obj(v), c = Array.isArray(o.choix) && o.choix.length > 0, d = txt(o.details); return q.detailsRequis ? d : c || d; }
    case 'mots': { const o = obj(v); return q.listes!.some(l => Array.isArray(o[l.k]) && (o[l.k] as unknown[]).length > 0); }
    case 'secteurs': { const o = obj(v); return Array.isArray(o.ids) && o.ids.length > 0; }
    case 'visibilite': return Object.keys(obj(v)).length > 0;
  }
}
export function progression(r: Reponses) {
  const faites = QUESTIONS.filter(q => estRepondu(q, r[q.id])).length;
  return { faites, total: QUESTIONS.length, pct: Math.round((faites / QUESTIONS.length) * 100) };
}

// Ne garde que les questions connues, avec une taille raisonnable (réponses envoyées depuis le lien public)
export function nettoyer(entree: unknown): Reponses {
  const o = obj(entree), out: Reponses = {};
  for (const [k, v] of Object.entries(o)) if (IDS.has(k) && JSON.stringify(v ?? null).length <= 8000) out[k] = v;
  return out;
}

// Réponses de départ tirées de la fiche du membre (nom, site, secteur, description)
export function prerempli(m: { nom?: string | null; site_web?: string | null; secteur_id?: number | null; description?: string | null; activite?: string | null }): Reponses {
  const r: Reponses = {};
  if (m.nom || m.site_web) r.A1 = { nom: m.nom ?? '', site: m.site_web ?? '' };
  if (m.secteur_id) r.A2 = { ids: [m.secteur_id] };
  const d = (m.description || m.activite || '').trim();
  if (d) r.A3 = d;
  return r;
}

// Texte de ce que le membre cherche (section C), utilisé par les suggestions de mises en relation
export function texteDemande(r: Reponses) {
  const c1 = Array.isArray(r.C1) ? (r.C1 as Record<string, string>[]).map(f => `${f.poste ?? ''} ${f.volume ?? ''}`).join(' ') : '';
  return [c1, obj(r.C2).texte, r.C4].filter(x => typeof x === 'string' && x).join(' ');
}
