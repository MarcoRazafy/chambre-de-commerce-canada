'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import Icon from '../Icon';
import ModalBackdrop from '../ModalBackdrop';

export type Tag = { cle: string; nom: string; n: number; id?: number; couleur?: string };
export type Groupe = { titre: string; tags: Tag[]; manuelles?: boolean };
export type Catalogue = { groupes: Groupe[]; etiquettes: Row[]; total: number; posees: { abonnes: Record<number, number[]>; membres: Record<number, number[]> } };

export const COULEURS = ['#256bff', '#13733a', '#b45309', '#b91c1c', '#5b3fa8', '#0e6767', '#8a3651', '#4f5d73'];

// Catalogue des étiquettes, rechargeable après chaque changement
export function useEtiquettes() {
  const [cat, setCat] = useState<Catalogue | null>(null);
  const load = useCallback(() => api<Catalogue>('/api/etiquettes').then(setCat).catch(() => setCat(null)), []);
  useEffect(() => { load(); }, [load]);
  return { cat, load };
}

export const Pastille = ({ nom, couleur, petite }: { nom: string; couleur?: string; petite?: boolean }) => (
  <span className={`etq${petite ? ' sm' : ''}`} style={{ '--etq': couleur ?? '#256bff' } as React.CSSProperties}><i />{nom}</span>
);

// Pastilles des étiquettes posées sur une personne
export function PastillesDe({ ids, cat }: { ids?: number[]; cat: Catalogue | null }) {
  if (!ids?.length || !cat) return null;
  const parId = new Map(cat.etiquettes.map(e => [e.id, e]));
  return <span className="etq-list">{ids.map(id => parId.get(id)).filter(Boolean).map(e => <Pastille key={e!.id} nom={e!.nom} couleur={e!.couleur} petite />)}</span>;
}

/* ===== Gérer les étiquettes de l'équipe ===== */
export function GestionEtiquettes({ cat, onClose, onChanged }: { cat: Catalogue; onClose: () => void; onChanged: () => void }) {
  const [nom, setNom] = useState('');
  const [couleur, setCouleur] = useState(COULEURS[0]);
  const [edit, setEdit] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(f: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await f(); toast(ok); onChanged(); } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  }
  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal" style={{ width: 'min(100%, 600px)' }} role="dialog" aria-label="Étiquettes">
        <div className="modal-h"><h2>Vos étiquettes</h2><button type="button" className="btn sm ghost" aria-label="Fermer" onClick={onClose}>✕</button></div>
        <div className="modal-b">
          <p className="small muted">Posez-les sur des abonnés ou des membres (cochez-les dans leur liste), puis choisissez-les comme destinataires d’une lettre.
            Les étiquettes automatiques (pays, secteur, cotisation, formule, événement, source) n’ont pas besoin d’être posées.</p>
          <form className="etq-new" onSubmit={e => { e.preventDefault(); run(() => api('/api/etiquettes', 'POST', { nom, couleur }), `Étiquette « ${nom.trim()} » créée.`).then(() => setNom('')); }}>
            <input className="inp" maxLength={40} placeholder="Nouvelle étiquette : Presse, VIP, Délégation MECC 9…" aria-label="Nom de la nouvelle étiquette" value={nom} onChange={e => setNom(e.target.value)} />
            <Couleurs valeur={couleur} onChange={setCouleur} />
            <button className="btn cta" disabled={busy || !nom.trim()}><Icon name="plus" size={15} /> Créer</button>
          </form>
          {cat.etiquettes.length ? (
            <ul className="etq-rows">
              {cat.etiquettes.map(e => (
                <li key={e.id}>
                  {edit && edit.id === e.id ? (
                    <form className="etq-new" onSubmit={ev => { ev.preventDefault(); run(() => api(`/api/etiquettes/${e.id}`, 'PATCH', edit), 'Étiquette modifiée.').then(() => setEdit(null)); }}>
                      <input className="inp" autoFocus maxLength={40} aria-label="Nom de l’étiquette" value={edit.nom} onChange={ev => setEdit({ ...edit, nom: ev.target.value })} />
                      <Couleurs valeur={edit.couleur} onChange={c => setEdit({ ...edit, couleur: c })} />
                      <button className="btn sm cta" disabled={busy}>Enregistrer</button>
                      <button type="button" className="btn sm ghost" onClick={() => setEdit(null)}>Annuler</button>
                    </form>
                  ) : (<>
                    <Pastille nom={e.nom} couleur={e.couleur} />
                    <span className="grow small muted">{[e.membres && `${e.membres} membre${e.membres > 1 ? 's' : ''}`, e.abonnes && `${e.abonnes} abonné${e.abonnes > 1 ? 's' : ''}`].filter(Boolean).join(' · ') || 'Posée sur personne'}</span>
                    <button type="button" className="btn sm ghost nl-icon" title="Modifier" aria-label={`Modifier ${e.nom}`} onClick={() => setEdit({ id: e.id, nom: e.nom, couleur: e.couleur })}><Icon name="edit" size={15} /></button>
                    <button type="button" className="btn sm ghost nl-icon" title="Supprimer" aria-label={`Supprimer ${e.nom}`} disabled={busy}
                      onClick={() => confirm(`Supprimer l’étiquette « ${e.nom} » ? Elle est retirée de tout le monde, et des lettres non envoyées qui l’utilisaient.`) && run(() => api(`/api/etiquettes/${e.id}`, 'DELETE'), 'Étiquette supprimée.')}><Icon name="trash" size={15} /></button>
                  </>)}
                </li>
              ))}
            </ul>
          ) : <p className="small muted etq-empty">Aucune étiquette pour le moment.</p>}
        </div>
        <div className="modal-f"><button type="button" className="btn" onClick={onClose}>Fermer</button></div>
      </div>
    </ModalBackdrop>
  );
}

function Couleurs({ valeur, onChange }: { valeur: string; onChange: (c: string) => void }) {
  return (
    <span className="etq-colors" role="radiogroup" aria-label="Couleur">
      {COULEURS.map(c => <button key={c} type="button" role="radio" aria-checked={valeur === c} aria-label={`Couleur ${c}`} className={valeur === c ? 'on' : ''} style={{ background: c }} onClick={() => onChange(c)} />)}
    </span>
  );
}

/* ===== Poser ou retirer une étiquette sur plusieurs personnes ===== */
export function PoserEtiquette({ cat, cible, ids, onClose, onDone }: { cat: Catalogue; cible: 'abonne' | 'membre'; ids: number[]; onClose: () => void; onDone: () => void }) {
  const [choix, setChoix] = useState<number | 'nouvelle'>(cat.etiquettes[0]?.id ?? 'nouvelle');
  const [nom, setNom] = useState('');
  const [couleur, setCouleur] = useState(COULEURS[0]);
  const [busy, setBusy] = useState(false);
  const qui = `${ids.length} ${cible === 'membre' ? 'membre' : 'abonné'}${ids.length > 1 ? 's' : ''}`;
  async function run(retirer: boolean) {
    setBusy(true);
    try {
      const r = await api<Row>('/api/etiquettes/poser', 'POST', { cible, ids, retirer, ...(choix === 'nouvelle' ? { nom, couleur } : { etiquette_id: choix }) });
      toast(retirer ? `« ${r.nom} » retirée de ${r.n} personne${r.n > 1 ? 's' : ''}.` : `« ${r.nom} » posée sur ${r.n} personne${r.n > 1 ? 's' : ''}${r.n < ids.length ? ' (les autres l’avaient déjà)' : ''}.`);
      onDone();
    } catch (e) { toast((e as Error).message, 'error'); setBusy(false); }
  }
  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal" style={{ width: 'min(100%, 520px)' }} role="dialog" aria-label="Étiqueter">
        <div className="modal-h"><h2>Étiqueter {qui}</h2><button type="button" className="btn sm ghost" aria-label="Fermer" onClick={onClose}>✕</button></div>
        <div className="modal-b">
          <div className="etq-pick">
            {cat.etiquettes.map(e => (
              <button key={e.id} type="button" className={choix === e.id ? 'on' : ''} aria-pressed={choix === e.id} onClick={() => setChoix(e.id)}><Pastille nom={e.nom} couleur={e.couleur} /></button>
            ))}
            <button type="button" className={`etq-plus${choix === 'nouvelle' ? ' on' : ''}`} aria-pressed={choix === 'nouvelle'} onClick={() => setChoix('nouvelle')}><Icon name="plus" size={14} /> Nouvelle étiquette</button>
          </div>
          {choix === 'nouvelle' && (
            <div className="etq-new">
              <input className="inp" autoFocus maxLength={40} placeholder="Nom : Presse, VIP…" aria-label="Nom de la nouvelle étiquette" value={nom} onChange={e => setNom(e.target.value)} />
              <Couleurs valeur={couleur} onChange={setCouleur} />
            </div>
          )}
        </div>
        <div className="modal-f">
          <button type="button" className="btn" onClick={onClose}>Annuler</button>
          {choix !== 'nouvelle' && <button type="button" className="btn" disabled={busy} onClick={() => run(true)}><Icon name="minus" size={15} /> Retirer</button>}
          <button type="button" className="btn cta" disabled={busy || (choix === 'nouvelle' && !nom.trim())} onClick={() => run(false)}><Icon name="tag" size={15} /> Poser l’étiquette</button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

/* ===== Choix des destinataires d'une lettre ===== */
export type Regle = { inclure: string[]; exclure: string[]; mode: 'une' | 'toutes'; contacts: 'principal' | 'tous'; retires: string[] };
// Par défaut : tout le monde, avec tous les contacts de chaque membre
export const REGLE_DEFAUT: Regle = { inclure: ['type:membre', 'type:abonne'], exclure: [], mode: 'une', contacts: 'tous', retires: [] };
export const regleDe = (c: Row): Regle => (c.inclure?.length
  ? { inclure: c.inclure, exclure: c.exclure ?? [], mode: c.mode === 'toutes' ? 'toutes' : 'une', contacts: c.contacts === 'principal' ? 'principal' : 'tous', retires: c.retires ?? [] }
  : { ...REGLE_DEFAUT, retires: c.retires ?? [] });

// « Tourisme ou Canada, sauf En retard »
export function resumer(r: Regle, cat: Catalogue | null) {
  const nom = new Map(cat?.groupes.flatMap(g => g.tags.map(t => [t.cle, t.nom] as const)) ?? []);
  const dire = (l: string[], et: string) => l.map(k => nom.get(k) ?? k).join(et);
  const base = !r.exclure.length && r.inclure.length === 2 && r.inclure.includes('type:membre') && r.inclure.includes('type:abonne') && r.mode === 'une'
    ? 'Tous les adhérents et abonnés'
    : dire(r.inclure, r.mode === 'toutes' ? ' et ' : ' ou ') + (r.exclure.length ? `, sauf ${dire(r.exclure, ', ')}` : '');
  return base + (r.retires.length ? ` (${r.retires.length} retiré${r.retires.length > 1 ? 's' : ''} à la main)` : '');
}

type Personne = { email: string; nom: string; entreprise: string | null; origine: string; retire: boolean };
type Apercu = { total: number; membres: number; abonnes: number; retires: number; liste: Personne[] };
const plier = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function DestinatairesFenetre({ titre, initiale, cat, onClose, onSave }: {
  titre: string; initiale: Regle; cat: Catalogue; onClose: () => void; onSave: (r: Regle) => Promise<void>;
}) {
  const [r, setR] = useState<Regle>(initiale);
  const [ap, setAp] = useState<Apercu | null>(null);
  const [busy, setBusy] = useState(false);
  const [audiences, setAudiences] = useState<Row[]>([]);
  const [filtre, setFiltre] = useState('');
  const [cherche, setCherche] = useState('');
  useEffect(() => { api<Row[]>('/api/audiences').then(setAudiences).catch(() => {}); }, []);
  // Liste et compteur en direct (après une courte pause)
  useEffect(() => {
    let fini = false;
    const t = setTimeout(() => api<Apercu>('/api/audiences/apercu', 'POST', r).then(a => !fini && setAp(a)).catch(() => {}), 200);
    return () => { fini = true; clearTimeout(t); };
  }, [r]);

  const etat = (k: string) => (r.inclure.includes(k) ? 'in' : r.exclure.includes(k) ? 'out' : '');
  // Un clic : inclure ; deuxième clic : exclure ; troisième : neutre
  const cycle = (k: string) => setR(x => {
    const e = etat(k), sans = { inclure: x.inclure.filter(y => y !== k), exclure: x.exclure.filter(y => y !== k) };
    return { ...x, ...(e === '' ? { ...sans, inclure: [...sans.inclure, k] } : e === 'in' ? { ...sans, exclure: [...sans.exclure, k] } : sans) };
  });
  // Cocher / décocher une personne : décochée, elle ne reçoit pas cette lettre
  const basculer = (email: string) => setR(x => ({ ...x, retires: x.retires.includes(email) ? x.retires.filter(e => e !== email) : [...x.retires, email] }));
  const groupes = useMemo(() => cat.groupes.map(g => ({ ...g, tags: g.tags.filter(t => !filtre || plier(t.nom).includes(plier(filtre))) })).filter(g => g.tags.length), [cat, filtre]);
  const gens = (ap?.liste ?? []).filter(p => !cherche || plier([p.entreprise, p.nom, p.email].join(' ')).includes(plier(cherche)));
  const retiresIci = (ap?.liste ?? []).filter(p => r.retires.includes(p.email)).length;

  async function enregistrerAudience() {
    const nom = prompt('Nom de cette audience (pour la réutiliser) :', '');
    if (!nom?.trim()) return;
    try { const a = await api<Row>('/api/audiences', 'POST', { nom, ...r }); setAudiences(l => [...l, a]); toast(`Audience « ${a.nom} » enregistrée.`); }
    catch (e) { toast((e as Error).message, 'error'); }
  }
  async function supprimerAudience(a: Row) {
    if (!confirm(`Supprimer l’audience « ${a.nom} » ? Les lettres qui l’ont utilisée gardent leurs destinataires.`)) return;
    try { await api(`/api/audiences/${a.id}`, 'DELETE'); setAudiences(l => l.filter(x => x.id !== a.id)); } catch (e) { toast((e as Error).message, 'error'); }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal aud-modal" role="dialog" aria-label="Destinataires de la lettre">
        <div className="modal-h"><div><h2>Destinataires</h2><p className="small muted">{titre}</p></div><button type="button" className="btn sm ghost" aria-label="Fermer" onClick={onClose}>✕</button></div>
        <div className="aud-body">
          <section className="aud-col">
            <h3 className="aud-h">1. Qui ? <span>par étiquettes</span></h3>
            {audiences.length > 0 && (
              <div className="aud-saved"><span className="small muted">Audiences enregistrées :</span>
                {audiences.map(a => (
                  <span key={a.id} className="aud-chip">
                    <button type="button" onClick={() => setR({ inclure: a.inclure, exclure: a.exclure, mode: a.mode, contacts: a.contacts, retires: a.retires ?? [] })}>{a.nom}</button>
                    <button type="button" aria-label={`Supprimer l’audience ${a.nom}`} title="Supprimer" onClick={() => supprimerAudience(a)}><Icon name="close" size={12} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="aud-how">
              <span><b className="aud-in">1 clic : ✓ inclure</b> · <b className="aud-out">2 clics : ✕ exclure</b> · 3 clics : retirer</span>
              {(r.inclure.length > 0 || r.exclure.length > 0) && <button type="button" className="linkish small" onClick={() => setR({ ...r, inclure: [], exclure: [] })}>Tout effacer</button>}
            </div>
            <label className="search-inp aud-filter"><Icon name="search" size={15} /><input className="inp" placeholder="Chercher une étiquette…" aria-label="Chercher une étiquette" value={filtre} onChange={e => setFiltre(e.target.value)} /></label>
            <div className="aud-groups">
              {groupes.map(g => (
                <div key={g.titre} className="aud-group">
                  <h4>{g.titre}</h4>
                  <div className="aud-tags">
                    {g.tags.length ? g.tags.map(t => {
                      const e = etat(t.cle);
                      return (
                        <button key={t.cle} type="button" className={`aud-tag ${e}`} onClick={() => cycle(t.cle)} aria-pressed={!!e}
                          title={e === 'in' ? 'Incluse : cliquez pour l’exclure' : e === 'out' ? 'Exclue : cliquez pour la retirer' : 'Cliquez pour l’inclure'}>
                          {e === 'in' ? '✓ ' : e === 'out' ? '✕ ' : ''}{t.couleur && <i style={{ background: t.couleur }} />}{t.nom}<small>{t.n}</small>
                        </button>
                      );
                    }) : <span className="small muted">{g.manuelles ? 'Aucune étiquette : créez-en depuis « Étiquettes ».' : '—'}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="aud-opts">
              <div className="seg" role="radiogroup" aria-label="Combinaison des étiquettes incluses">
                <button type="button" role="radio" aria-checked={r.mode === 'une'} className={r.mode === 'une' ? 'on' : ''} onClick={() => setR({ ...r, mode: 'une' })}>Au moins une étiquette</button>
                <button type="button" role="radio" aria-checked={r.mode === 'toutes'} className={r.mode === 'toutes' ? 'on' : ''} onClick={() => setR({ ...r, mode: 'toutes' })}>Toutes les étiquettes</button>
              </div>
              <label className="fs-switch aud-switch">
                <input type="checkbox" className="switch" checked={r.contacts === 'tous'} onChange={e => setR({ ...r, contacts: e.target.checked ? 'tous' : 'principal' })} />
                <span><b>Tous les contacts des membres</b><small>Coupé : seulement le contact principal de chaque membre.</small></span>
              </label>
            </div>
          </section>

          <section className="aud-col aud-people">
            <h3 className="aud-h">2. Vérifiez la liste <span>décochez qui ne doit pas la recevoir</span></h3>
            <div className="aud-people-tools">
              <label className="search-inp"><Icon name="search" size={15} /><input className="inp" placeholder="Chercher une personne, une entreprise…" aria-label="Chercher une personne" value={cherche} onChange={e => setCherche(e.target.value)} /></label>
              {r.retires.length > 0 && <button type="button" className="linkish small" onClick={() => setR({ ...r, retires: [] })}>Tout remettre ({r.retires.length})</button>}
            </div>
            {!r.inclure.length ? <p className="small muted aud-vide">Choisissez au moins une étiquette à gauche.</p>
              : !ap ? <div className="skeleton"><span /><span /><span /></div>
              : !gens.length ? <p className="small muted aud-vide">{cherche ? 'Personne ne correspond.' : 'Aucune personne ne porte ces étiquettes.'}</p>
              : (
                <ul className="aud-list">
                  {gens.map(p => {
                    const garde = !r.retires.includes(p.email);
                    return (
                      <li key={p.email} className={garde ? '' : 'off'}>
                        <label>
                          <input type="checkbox" checked={garde} onChange={() => basculer(p.email)} aria-label={`${garde ? 'Retirer' : 'Remettre'} ${p.email}`} />
                          <span className="aud-who"><b>{p.entreprise ?? (p.nom || p.email)}</b><span>{p.entreprise && p.nom ? `${p.nom} · ` : ''}{p.email}</span></span>
                          <small>{garde ? (p.origine === 'membre' ? 'Membre' : 'Abonné') : 'Retiré'}</small>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
          </section>
        </div>
        <div className="aud-foot">
          <div className="aud-count" aria-live="polite">
            <b>{ap ? ap.total : '…'}</b> destinataire{ap && ap.total > 1 ? 's' : ''}
            {ap && <small>{ap.membres} contact{ap.membres > 1 ? 's' : ''} de membres · {ap.abonnes} abonné{ap.abonnes > 1 ? 's' : ''}{retiresIci ? ` · ${retiresIci} retiré${retiresIci > 1 ? 's' : ''} à la main` : ''} · sans doublon ni désabonné</small>}
          </div>
          <div className="row">
            <button type="button" className="btn sm" disabled={!r.inclure.length} onClick={enregistrerAudience}><Icon name="star" size={14} /> Enregistrer comme audience</button>
            <button type="button" className="btn" onClick={onClose}>Annuler</button>
            <button type="button" className="btn cta" disabled={busy || !r.inclure.length || !ap?.total} onClick={async () => { setBusy(true); try { await onSave(r); } finally { setBusy(false); } }}>
              <Icon name="ok" size={15} /> Valider ces destinataires</button>
          </div>
        </div>
      </div>
    </ModalBackdrop>
  );
}
