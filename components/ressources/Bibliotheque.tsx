'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import { CATS, FMTS, FMT_ICON, ariary, mediaUrl, quand } from '@/lib/bibliotheque';
import Icon from '../Icon';
import { AccesFenetre, Choix, DossierFenetre, Menu } from './Fenetres';
import { chemin } from './outils';

type Filtre = 'tout' | 'gratuit' | 'payant';
type Tri = 'ordre' | 'date' | 'nom';
type Vue = 'grille' | 'liste';
type Presse = { ids: number[]; mode: 'copier' | 'couper' };
type Fenetre = { genre: 'dossier'; dossier?: Row; parent: number | null; vue?: 'tout' | 'acces' } | { genre: 'acces'; ids: number[] };

const fold = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const dateCourte = (v: string) => new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const lirePresse = (): Presse | null => { try { return JSON.parse(sessionStorage.getItem('res-presse') ?? 'null'); } catch { return null; } };

// Bibliothèque de ressources, reprise de CanCham Connect
export default function Bibliotheque() {
  const router = useRouter();
  const [data, setData] = useState<{ dossiers: Row[]; ressources: Row[]; membres: Row[] } | null>(null);
  const [error, setError] = useState('');
  const [dossierId, setDossierId] = useState<number | null>(null);
  const [term, setTerm] = useState('');
  const [filtre, setFiltre] = useState<Filtre>('tout');
  const [tri, setTri] = useState<Tri>('ordre');
  const [vue, setVue] = useState<Vue>('grille');
  const [selection, setSelection] = useState<number[]>([]);
  const [presse, setPresseState] = useState<Presse | null>(null);
  const [fenetre, setFenetre] = useState<Fenetre | null>(null);
  const [ouverts, setOuverts] = useState<Set<number>>(new Set());
  const [ajout, setAjout] = useState(false);
  const [glisse, setGlisse] = useState<number | null>(null);
  const [survol, setSurvol] = useState<number | null>(null);

  const load = useCallback(() => api<{ dossiers: Row[]; ressources: Row[]; membres: Row[] }>('/api/ressources').then(d => { setData(d); setError(''); }).catch(e => setError(e.message)), []);

  // L'adresse garde le dossier ouvert et les réglages d'affichage : ?dossier=3&q=…&type=payant&tri=nom&vue=liste
  const lireAdresse = useCallback(() => {
    const p = new URLSearchParams(window.location.search);
    const d = Number(p.get('dossier'));
    setDossierId(Number.isInteger(d) && d > 0 ? d : null);
    setTerm(p.get('q') ?? '');
    const t = p.get('type'); setFiltre(t === 'gratuit' || t === 'payant' ? t : 'tout');
    const s = p.get('tri'); setTri(s === 'date' || s === 'nom' ? s : 'ordre');
    setVue(p.get('vue') === 'liste' ? 'liste' : 'grille');
  }, []);
  useEffect(() => {
    load(); lireAdresse(); setPresseState(lirePresse());
    window.addEventListener('popstate', lireAdresse);
    return () => window.removeEventListener('popstate', lireAdresse);
  }, [load, lireAdresse]);
  function ecrire(p: { dossier?: number | null; q?: string; type?: Filtre; tri?: Tri; vue?: Vue }, push = false) {
    const url = new URL(window.location.href);
    const set = (k: string, v: string | null) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
    if ('dossier' in p) set('dossier', p.dossier ? String(p.dossier) : null);
    if ('q' in p) set('q', p.q?.trim() || null);
    if ('type' in p) set('type', p.type === 'tout' ? null : p.type!);
    if ('tri' in p) set('tri', p.tri === 'ordre' ? null : p.tri!);
    if ('vue' in p) set('vue', p.vue === 'grille' ? null : p.vue!);
    window.history[push ? 'pushState' : 'replaceState'](null, '', url);
  }
  function ouvrirDossier(id: number | null) {
    setDossierId(id); setTerm(''); setSelection([]); setOuverts(new Set());
    ecrire({ dossier: id, q: '' }, true);
    window.scrollTo({ top: 0 });
  }
  const setPresse = (p: Presse | null) => { setPresseState(p); try { if (p) sessionStorage.setItem('res-presse', JSON.stringify(p)); else sessionStorage.removeItem('res-presse'); } catch { /* stockage indisponible */ } };

  const dossiers = useMemo(() => data?.dossiers ?? [], [data]);
  const ressources = useMemo(() => data?.ressources ?? [], [data]);
  const membres = data?.membres ?? [];
  const courant = dossiers.find(d => d.id === dossierId) ?? null;
  useEffect(() => { if (data && dossierId && !courant) ouvrirDossier(null); });   // dossier supprimé entre-temps
  const fil = chemin(dossiers, dossierId);
  const recherche = term.trim();

  const garder = (r: Row) => filtre === 'tout' || r.type === filtre;
  const trier = useCallback((l: Row[]) => [...l].sort((a, b) => tri === 'nom' ? a.titre.localeCompare(b.titre, 'fr')
    : tri === 'date' ? +new Date(b.updated_at) - +new Date(a.updated_at) : a.ordre - b.ordre || a.id - b.id), [tri]);
  const trierDossiers = (l: Row[]) => [...l].sort((a, b) => (tri === 'date' ? +new Date(b.updated_at) - +new Date(a.updated_at) : a.nom.localeCompare(b.nom, 'fr')));
  const enfants = (id: number | null) => trierDossiers(dossiers.filter(d => d.parent_id === id));
  const directes = (id: number | null) => trier(ressources.filter(r => r.dossier_id === id && garder(r)));
  const sousArbre = (id: number): Row[] => [...ressources.filter(r => r.dossier_id === id), ...dossiers.filter(d => d.parent_id === id).flatMap(d => sousArbre(d.id))];
  const rangeable = tri === 'ordre' && filtre === 'tout' && !recherche;
  const cheminDe = (id: number | null) => chemin(dossiers, id).map(d => d.nom).join(' › ');

  // Dans un dossier, la première section qui a du contenu est ouverte
  useEffect(() => {
    if (!courant || ouverts.size) return;
    const premiere = enfants(courant.id).find(d => sousArbre(d.id).length);
    if (premiere) setOuverts(new Set([premiere.id]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courant?.id, data]);

  /* ===== Actions ===== */
  async function action(body: Row, message?: string) {
    try { await api('/api/ressources/actions', 'POST', body); if (message) toast(message); await load(); }
    catch (e) { toast((e as Error).message, 'error'); }
  }
  async function supprimer(r: Row) {
    if (!confirm(`Supprimer « ${r.titre} » de la bibliothèque ? Son fichier est effacé avec elle.`)) return;
    try { await api(`/api/ressources/${r.id}`, 'DELETE'); toast('Ressource supprimée.'); setSelection(s => s.filter(x => x !== r.id)); load(); }
    catch (e) { toast((e as Error).message, 'error'); }
  }
  async function supprimerDossier(d: Row) {
    if (!confirm(`Supprimer le dossier « ${d.nom} » ? Ce qu’il contient remonte d’un niveau : aucune ressource n’est effacée.`)) return;
    try { await api(`/api/ressources/dossiers/${d.id}`, 'DELETE'); toast('Dossier supprimé, son contenu a remonté d’un niveau.'); if (d.id === dossierId) ouvrirDossier(d.parent_id); load(); }
    catch (e) { toast((e as Error).message, 'error'); }
  }
  const mettre = (ids: number[], mode: Presse['mode']) => {
    setPresse({ ids, mode }); setSelection([]);
    toast(`${pluriel(ids.length, 'ressource')} ${mode === 'couper' ? 'à déplacer' : 'à copier'} : ouvrez un dossier, puis « Coller ici ».`);
  };
  async function coller() {
    if (!presse) return;
    await action({ op: 'coller', ids: presse.ids, mode: presse.mode, dossier_id: dossierId },
      presse.mode === 'couper' ? `${pluriel(presse.ids.length, 'ressource')} déplacée${presse.ids.length > 1 ? 's' : ''} ici.` : `${pluriel(presse.ids.length, 'copie')} ajoutée${presse.ids.length > 1 ? 's' : ''} ici.`);
    setPresse(null);
  }
  // Glisser-déposer : la ressource prend la place de celle survolée, dans son dossier
  function deposer(cible: Row) {
    const src = ressources.find(r => r.id === glisse);
    setGlisse(null); setSurvol(null);
    if (!src || src.id === cible.id || src.dossier_id !== cible.dossier_id) return;
    const liste = trier(ressources.filter(r => r.dossier_id === cible.dossier_id)).map(r => r.id).filter(id => id !== src.id);
    liste.splice(liste.indexOf(cible.id) + (src.ordre < cible.ordre ? 1 : 0), 0, src.id);
    setData(d => d && { ...d, ressources: d.ressources.map(r => (liste.includes(r.id) ? { ...r, ordre: liste.indexOf(r.id) } : r)) });
    action({ op: 'ordonner', dossier_id: cible.dossier_id, ids: liste });
  }
  const basculer = (id: number) => setSelection(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

  /* ===== Affichage d'une ressource ===== */
  function menuRessource(r: Row) {
    return (
      <Menu libelle={`Actions sur « ${r.titre} »`}>
        {fermer => (<>
          <Choix icone="eye" onClick={() => router.push(`/ressources/${r.id}`)}>Ouvrir</Choix>
          <Choix icone="edit" onClick={() => router.push(`/ressources/${r.id}?modifier=1`)}>Modifier</Choix>
          <Choix icone="copy" onClick={() => { fermer(); mettre([r.id], 'copier'); }}>Copier</Choix>
          <Choix icone="cut" onClick={() => { fermer(); mettre([r.id], 'couper'); }}>Couper</Choix>
          {rangeable && <Choix icone="first" onClick={() => { fermer(); action({ op: 'premier', id: r.id }, 'Mise en tête de son dossier.'); }}>Mettre en premier</Choix>}
          {rangeable && <Choix icone="last" onClick={() => { fermer(); action({ op: 'dernier', id: r.id }, 'Mise au bout de son dossier.'); }}>Mettre en dernier</Choix>}
          {r.type === 'payant' && <Choix icone="users" onClick={() => { fermer(); setFenetre({ genre: 'acces', ids: [r.id] }); }}>Qui y a accès</Choix>}
          <Choix icone="trash" danger onClick={() => { fermer(); supprimer(r); }}>Supprimer</Choix>
        </>)}
      </Menu>
    );
  }
  const manquant = (r: Row) => r.fmt !== 'page' && !r.fichier;
  const glissable = (r: Row) => rangeable ? {
    draggable: true,
    onDragStart: (e: React.DragEvent) => { setGlisse(r.id); e.dataTransfer.effectAllowed = 'move'; },
    onDragEnd: () => { setGlisse(null); setSurvol(null); },
    onDragOver: (e: React.DragEvent) => { const src = ressources.find(x => x.id === glisse); if (src && src.dossier_id === r.dossier_id) { e.preventDefault(); if (survol !== r.id) setSurvol(r.id); } },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); deposer(r); },
  } : {};

  function carte(r: Row, avecChemin?: boolean) {
    const v = mediaUrl(r.vignette), coche = selection.includes(r.id);
    return (
      <article key={r.id} className={`rc${coche ? ' sel' : ''}${glisse === r.id ? ' drag' : ''}${survol === r.id && glisse !== r.id ? ' over' : ''}`} {...glissable(r)}>
        <div className="rc-cover" onClick={() => router.push(`/ressources/${r.id}`)}>
          {v ? <img src={v} alt="" loading="lazy" draggable={false} /> : <span className={`rc-ph f-${r.fmt}`}><Icon name={FMT_ICON[r.fmt]} size={34} /></span>}
          <label className="rc-check" title="Sélectionner" onClick={e => e.stopPropagation()}>
            <input type="checkbox" checked={coche} onChange={() => basculer(r.id)} aria-label={`Sélectionner « ${r.titre} »`} /></label>
          <span className="rc-fmt"><Icon name={FMT_ICON[r.fmt]} size={13} /> {FMTS[r.fmt]}</span>
          {r.type === 'payant' && <span className="rc-price">{ariary(r.prix)}</span>}
        </div>
        <div className="rc-body">
          <span className="dcard-sector">{CATS[r.cat]}{avecChemin && r.dossier_id ? <span className="rc-path"> · {cheminDe(r.dossier_id)}</span> : null}</span>
          <h3><Link href={`/ressources/${r.id}`} draggable={false}>{r.titre}</Link></h3>
          {r.description && <p className="rc-desc">{r.description}</p>}
          {manquant(r) && <span className="rc-miss"><Icon name="alert" size={13} /> Fichier manquant</span>}
        </div>
        <div className="rc-foot">
          <span className="small muted grow">{r.taille} · {dateCourte(r.updated_at)}</span>
          {r.type === 'payant' && <button type="button" className="rc-acc" title="Qui y a accès" onClick={() => setFenetre({ genre: 'acces', ids: [r.id] })}><Icon name="users" size={14} />{r.acces.length}</button>}
          {rangeable && <span className="rc-grip" title="Glisser pour ranger" aria-hidden="true"><Icon name="grip" size={16} /></span>}
          {menuRessource(r)}
        </div>
      </article>
    );
  }
  function ligne(r: Row, avecChemin?: boolean) {
    const v = mediaUrl(r.vignette), coche = selection.includes(r.id);
    return (
      <li key={r.id} className={`rl${coche ? ' sel' : ''}${survol === r.id && glisse !== r.id ? ' over' : ''}`} {...glissable(r)}>
        <input type="checkbox" checked={coche} onChange={() => basculer(r.id)} aria-label={`Sélectionner « ${r.titre} »`} />
        <span className="rl-thumb">{v ? <img src={v} alt="" loading="lazy" draggable={false} /> : <Icon name={FMT_ICON[r.fmt]} size={20} />}</span>
        <span className="rl-id"><Link href={`/ressources/${r.id}`} draggable={false}>{r.titre}</Link>
          <small>{CATS[r.cat]} · {FMTS[r.fmt]}{avecChemin && r.dossier_id ? ` · ${cheminDe(r.dossier_id)}` : ''}{manquant(r) ? ' · fichier manquant' : ''}</small></span>
        <span className="rl-size small muted">{r.taille}</span>
        <span className="rl-price">{r.type === 'payant' ? <><b>{ariary(r.prix)}</b><button type="button" className="rc-acc" title="Qui y a accès" onClick={() => setFenetre({ genre: 'acces', ids: [r.id] })}><Icon name="users" size={13} />{r.acces.length}</button></> : <span className="muted small">Gratuit</span>}</span>
        <span className="rl-date small muted">{quand(r.updated_at)}</span>
        <span className="rl-act">{rangeable && <span className="rc-grip" aria-hidden="true"><Icon name="grip" size={16} /></span>}{menuRessource(r)}</span>
      </li>
    );
  }
  const lot = (liste: Row[], avecChemin?: boolean) =>
    vue === 'liste' ? <ul className="rl-list">{liste.map(r => ligne(r, avecChemin))}</ul>
      : <div className="rc-grid">{liste.map(r => carte(r, avecChemin))}</div>;

  /* ===== Dossiers ===== */
  function menuDossier(d: Row) {
    return (
      <Menu libelle={`Actions sur le dossier « ${d.nom} »`}>
        {fermer => (<>
          <Choix icone="users" onClick={() => { fermer(); setFenetre({ genre: 'dossier', dossier: d, parent: d.parent_id, vue: 'acces' }); }}>Qui voit ce dossier</Choix>
          <Choix icone="edit" onClick={() => { fermer(); setFenetre({ genre: 'dossier', dossier: d, parent: d.parent_id }); }}>Réglages et rangement</Choix>
          <Choix icone="trash" danger onClick={() => { fermer(); supprimerDossier(d); }}>Supprimer</Choix>
        </>)}
      </Menu>
    );
  }
  function carteDossier(d: Row) {
    const nbD = dossiers.filter(x => x.parent_id === d.id).length, nbR = sousArbre(d.id).length;
    return (
      <article key={d.id} className={`rd${d.restreint ? ' lock' : ''}`}>
        <a href={`/ressources?dossier=${d.id}`} className="rd-link" onClick={e => { e.preventDefault(); ouvrirDossier(d.id); }}>
          <span className="rd-cover">{d.cover ? <img src={mediaUrl(d.cover)!} alt="" loading="lazy" /> : <Icon name={d.restreint ? 'folderlock' : 'folder'} size={30} fill={!d.restreint} />}</span>
          <span className="rd-id"><b>{d.nom}</b>
            <small>{[nbD && pluriel(nbD, 'dossier'), nbR && pluriel(nbR, 'ressource')].filter(Boolean).join(' · ') || 'Vide'}</small>
            {d.restreint && <small className="rd-lock"><Icon name="lock" size={12} /> Réservé à {pluriel(d.acces.length, 'entreprise')}</small>}</span>
          <Icon name="caret" size={16} />
        </a>
        {menuDossier(d)}
      </article>
    );
  }

  // Section dépliable d'un sous-dossier : ses ressources, puis ses propres sous-dossiers
  function section(d: Row, niveau: number): React.ReactNode {
    const ouvert = ouverts.has(d.id), propres = directes(d.id), sous = enfants(d.id), total = sousArbre(d.id).filter(garder).length;
    const toggle = () => setOuverts(s => { const n = new Set(s); if (n.has(d.id)) n.delete(d.id); else n.add(d.id); return n; });
    return (
      <section key={d.id} id={`sec-${d.id}`} className={`rs${ouvert ? ' open' : ''} n${Math.min(niveau, 3)}`}>
        <div className="rs-head">
          <button type="button" className="rs-toggle" aria-expanded={ouvert} onClick={toggle}>
            <Icon name="caret" size={15} /><Icon name={d.restreint ? 'folderlock' : ouvert ? 'folderopen' : 'folder'} size={18} fill={!d.restreint} />
            <b>{d.nom}</b><span className="tab-n">{total}</span>
            {d.restreint && <span className="rs-lock" title={`Réservé à ${pluriel(d.acces.length, 'entreprise')}`}><Icon name="lock" size={12} /> {d.acces.length}</span>}
          </button>
          <a className="btn sm ghost" href={`/ressources?dossier=${d.id}`} onClick={e => { e.preventDefault(); ouvrirDossier(d.id); }}>Ouvrir</a>
          {menuDossier(d)}
        </div>
        {ouvert && (
          <div className="rs-body">
            {propres.length ? lot(propres) : !sous.length && <p className="small muted">{total ? 'Aucune ressource de ce type ici.' : 'Ce dossier est vide.'}</p>}
            {sous.map(x => section(x, niveau + 1))}
          </div>
        )}
      </section>
    );
  }
  function sommaire(racine: Row) {
    const items = (id: number, n: number): React.ReactNode[] => enfants(id).flatMap(d => [
      <li key={d.id} className={`n${Math.min(n, 3)}`}><button type="button" onClick={() => {
        // Ouvre la section et ses parents, puis y descend
        const ids = chemin(dossiers, d.id).map(x => x.id).filter(x => x !== racine.id);
        setOuverts(s => new Set([...s, ...ids]));
        setTimeout(() => document.getElementById(`sec-${d.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
      }}><span className="grow">{d.nom}</span><span className="tab-n">{sousArbre(d.id).filter(garder).length}</span></button></li>,
      ...(n < 3 ? items(d.id, n + 1) : []),
    ]);
    const liste = items(racine.id, 0);
    return liste.length ? <nav className="card rsum" aria-label="Sommaire du dossier"><h2>Sommaire</h2><ul>{liste}</ul></nav> : null;
  }

  /* ===== Rendu ===== */
  if (error) return <div className="err">{error}</div>;
  if (!data) return <div className="card"><div className="skeleton"><span /><span /><span /></div></div>;

  const resultats = recherche ? {
    dossiers: trierDossiers(dossiers.filter(d => fold(d.nom).includes(fold(recherche)))),
    ressources: trier(ressources.filter(r => garder(r) && fold([r.titre, r.description, CATS[r.cat], FMTS[r.fmt]].join(' ')).includes(fold(recherche)))),
  } : null;
  const portee = courant ? sousArbre(courant.id) : ressources;
  const comptes = { tout: portee.length, gratuit: portee.filter(r => r.type === 'gratuit').length, payant: portee.filter(r => r.type === 'payant').length };
  const visibles = resultats ? resultats.ressources : courant ? sousArbre(courant.id).filter(garder) : directes(null);
  const toutCoche = visibles.length > 0 && visibles.every(r => selection.includes(r.id));
  const choisies = ressources.filter(r => selection.includes(r.id));

  const outils = (
    <div className="dir-tools rb-tools">
      <label className="search-inp dir-search"><Icon name="search" size={16} />
        <input className="inp" type="search" placeholder="Rechercher un document, un dossier…" aria-label="Rechercher dans la bibliothèque" value={term}
          onChange={e => { setTerm(e.target.value); ecrire({ q: e.target.value }); }} /></label>
      <div className="seg" role="radiogroup" aria-label="Type d’accès">
        {(['tout', 'gratuit', 'payant'] as Filtre[]).map(f => (
          <button key={f} type="button" role="radio" aria-checked={filtre === f} className={filtre === f ? 'on' : ''} onClick={() => { setFiltre(f); ecrire({ type: f }); }}>
            {f === 'tout' ? 'Tous' : f === 'gratuit' ? 'Gratuit' : 'Payant'} <span className="seg-n">{comptes[f]}</span></button>
        ))}
      </div>
      <select className="inp rb-sort" aria-label="Trier" value={tri} onChange={e => { const t = e.target.value as Tri; setTri(t); ecrire({ tri: t }); }}>
        <option value="ordre">Ordre du dossier</option><option value="date">Date de modification</option><option value="nom">Nom</option>
      </select>
      <div className="seg rb-view" role="radiogroup" aria-label="Affichage">
        <button type="button" role="radio" aria-checked={vue === 'grille'} aria-label="En cartes" title="En cartes" className={vue === 'grille' ? 'on' : ''} onClick={() => { setVue('grille'); ecrire({ vue: 'grille' }); }}><Icon name="dash" size={16} /></button>
        <button type="button" role="radio" aria-checked={vue === 'liste'} aria-label="En liste" title="En liste" className={vue === 'liste' ? 'on' : ''} onClick={() => { setVue('liste'); ecrire({ vue: 'liste' }); }}><Icon name="rows" size={16} /></button>
      </div>
      {(recherche || filtre !== 'tout') && <button type="button" className="linkish small" onClick={() => { setTerm(''); setFiltre('tout'); ecrire({ q: '', type: 'tout' }); }}>Effacer</button>}
    </div>
  );

  const barres = (
    <>
      {presse && (
        <div className="rb-bar presse">
          <Icon name={presse.mode === 'couper' ? 'cut' : 'copy'} size={16} />
          <span><b>{pluriel(presse.ids.length, 'ressource')}</b> {presse.mode === 'couper' ? 'à déplacer' : 'à copier'}{courant ? ` dans « ${courant.nom} »` : ' à la racine'}.</span>
          <span className="grow" />
          <button type="button" className="btn sm cta" onClick={coller}><Icon name="paste" size={14} /> Coller ici</button>
          <button type="button" className="btn sm ghost" onClick={() => setPresse(null)}>Annuler</button>
        </div>
      )}
      {visibles.length > 0 && (
        <div className={`rb-bar sel${selection.length ? ' on' : ''}`}>
          <button type="button" className="btn sm" onClick={() => setSelection(toutCoche ? [] : [...new Set([...selection, ...visibles.map(r => r.id)])])}>
            <Icon name="checks" size={14} /> {toutCoche ? 'Tout décocher' : 'Tout sélectionner'}</button>
          {selection.length > 0 ? (<>
            <span className="small"><b>{selection.length}</b> sélectionnée{selection.length > 1 ? 's' : ''}, puis :</span>
            <button type="button" className="btn sm" onClick={() => mettre(selection, 'copier')}><Icon name="copy" size={14} /> Copier</button>
            <button type="button" className="btn sm" onClick={() => mettre(selection, 'couper')}><Icon name="cut" size={14} /> Couper</button>
            <button type="button" className="btn sm" onClick={() => setFenetre({ genre: 'acces', ids: selection })}><Icon name="userplus" size={14} /> Ouvrir un accès</button>
            <button type="button" className="linkish small" onClick={() => setSelection([])}>Désélectionner</button>
          </>) : <span className="small muted">Cochez des ressources pour les copier, les déplacer ou en ouvrir l’accès.{rangeable ? ' Glissez une carte pour la ranger.' : ''}</span>}
        </div>
      )}
    </>
  );

  const actions = (
    <div className="head page-tools"><div className="actions">
      <button className="btn" onClick={() => setFenetre({ genre: 'dossier', parent: dossierId })}><Icon name="folderplus" size={16} /> Nouveau dossier</button>
      <div className="rmenu">
        <button className="btn cta" aria-expanded={ajout} onClick={() => setAjout(a => !a)}><Icon name="plus" size={16} /> Ajouter une ressource</button>
        {ajout && (
          <div className="rmenu-pop wide" role="menu" onMouseLeave={() => setAjout(false)}>
            <Link role="menuitem" href={`/ressources/nouvelle?mode=page${dossierId ? `&dossier=${dossierId}` : ''}`}><span className="tile-ic xs"><Icon name="article" size={15} fill /></span>
              <span><b>Composer une page</b><small>Titres, texte mis en forme, photos, vidéos</small></span></Link>
            <Link role="menuitem" href={`/ressources/nouvelle?mode=fichier${dossierId ? `&dossier=${dossierId}` : ''}`}><span className="tile-ic xs"><Icon name="upload" size={15} fill /></span>
              <span><b>Déposer un fichier</b><small>PDF, DOCX, vidéo ou photo</small></span></Link>
          </div>
        )}
      </div>
    </div></div>
  );

  const filAriane = (
    <nav className="rb-fil" aria-label="Chemin du dossier">
      <a href="/ressources" onClick={e => { e.preventDefault(); ouvrirDossier(null); }}><Icon name="books" size={15} /> Bibliothèque</a>
      {fil.map((d, i) => (
        <span key={d.id}><Icon name="caret" size={12} />{i === fil.length - 1 && !recherche ? <b>{d.nom}</b>
          : <a href={`/ressources?dossier=${d.id}`} onClick={e => { e.preventDefault(); ouvrirDossier(d.id); }}>{d.nom}</a>}</span>
      ))}
    </nav>
  );

  const fenetres = (
    <>
      {fenetre?.genre === 'dossier' && <DossierFenetre dossier={fenetre.dossier} parentId={fenetre.parent} vue={fenetre.vue} dossiers={dossiers} membres={membres}
        onClose={() => setFenetre(null)} onSaved={() => { setFenetre(null); load(); }} />}
      {fenetre?.genre === 'acces' && <AccesFenetre ressources={ressources.filter(r => fenetre.ids.includes(r.id))} membres={membres} onClose={() => setFenetre(null)} onChanged={load} />}
    </>
  );

  // Recherche : toute la bibliothèque, dossiers compris
  if (resultats) return (
    <>
      {actions}{filAriane}{outils}
      <p className="small muted">{pluriel(resultats.dossiers.length + resultats.ressources.length, 'résultat')} pour « {recherche} » : toute la bibliothèque est fouillée, dossiers compris.</p>
      {barres}
      {resultats.dossiers.length > 0 && <section className="rb-sec"><h2>Dossiers <span className="tab-n">{resultats.dossiers.length}</span></h2>
        <div className="rd-grid">{resultats.dossiers.map(carteDossier)}</div></section>}
      {resultats.ressources.length > 0 && <section className="rb-sec"><h2>Documents <span className="tab-n">{resultats.ressources.length}</span></h2>{lot(resultats.ressources, true)}</section>}
      {!resultats.dossiers.length && !resultats.ressources.length && <div className="card empty-state"><Icon name="search" size={26} /><b>Aucun document ni dossier ne correspond.</b></div>}
      {fenetres}
    </>
  );

  // Un dossier ouvert : en-tête, ses ressources, ses sous-dossiers en sections dépliables, le sommaire à côté
  if (courant) {
    const propres = directes(courant.id), sous = enfants(courant.id), tout = sousArbre(courant.id);
    const videos = tout.filter(r => r.fmt === 'video').length, pages = tout.filter(r => r.fmt === 'page').length;
    return (
      <>
        {actions}{filAriane}
        <section className={`card rh${courant.cover ? ' has-cover' : ''}`}>
          <div className="rh-cover">{courant.cover ? <img src={mediaUrl(courant.cover)!} alt="" /> : <span className="rh-pattern" aria-hidden="true" />}</div>
          <div className="rh-body">
            <span className="tile-ic rh-ic"><Icon name={courant.restreint ? 'folderlock' : 'folderopen'} size={22} fill /></span>
            <div className="grow">
              <h1>{courant.nom}</h1>
              <p className="small muted">{[pluriel(tout.length, 'ressource'), sous.length && pluriel(sous.length, 'sous-dossier'), pages && pluriel(pages, 'page'), videos && pluriel(videos, 'vidéo')].filter(Boolean).join(' · ')}
                {' · '}modifié {quand(courant.updated_at)}</p>
              <p className={`rh-acc${courant.restreint ? ' lock' : ''}`}>
                <Icon name={courant.restreint ? 'lock' : 'users'} size={14} />
                {courant.restreint ? <>Réservé à {pluriel(courant.acces.length, 'entreprise')} : <span className="rh-names">{courant.acces.slice(0, 4).map((a: Row) => a.nom).join(', ')}{courant.acces.length > 4 ? `, +${courant.acces.length - 4}` : ''}</span></> : 'Ouvert à tous les membres'}
                <button type="button" className="linkish" onClick={() => setFenetre({ genre: 'dossier', dossier: courant, parent: courant.parent_id, vue: 'acces' })}>Modifier</button>
              </p>
            </div>
            <div className="rh-act">
              <button type="button" className="btn sm" onClick={() => setFenetre({ genre: 'dossier', dossier: courant, parent: courant.parent_id })}><Icon name="edit" size={14} /> Réglages</button>
              <button type="button" className="btn sm ghost danger" onClick={() => supprimerDossier(courant)}><Icon name="trash" size={14} /> Supprimer</button>
            </div>
          </div>
          {courant.auteur_nom && (
            <div className="rh-author">
              {courant.auteur_photo ? <img src={mediaUrl(courant.auteur_photo)!} alt="" /> : <span className="rh-ini">{courant.auteur_nom.slice(0, 2).toUpperCase()}</span>}
              <div><b>{courant.auteur_nom}</b>{courant.auteur_role && <span className="small muted"> · {courant.auteur_role}</span>}
                {courant.auteur_bio && <p className="small">{courant.auteur_bio}</p>}</div>
            </div>
          )}
        </section>

        {outils}{barres}
        <div className={`rb-layout${sous.length ? '' : ' solo'}`}>
          <div className="rb-main">
            {propres.length > 0 && <section className="rb-sec">{sous.length > 0 && <h2>Dans ce dossier <span className="tab-n">{propres.length}</span></h2>}{lot(propres)}</section>}
            {sous.map(d => section(d, 0))}
            {!propres.length && !sous.length && (
              <div className="card empty-state"><Icon name="folderopen" size={28} /><b>{tout.length ? 'Aucune ressource de ce type ici.' : 'Ce dossier est vide.'}</b>
                <span className="small muted">Ajoutez une ressource, créez un sous-dossier, ou collez ce que vous avez copié.</span></div>
            )}
          </div>
          {sous.length > 0 && <aside className="rb-side">{sommaire(courant)}</aside>}
        </div>
        {fenetres}
      </>
    );
  }

  // Racine de la bibliothèque : les dossiers, puis les documents rangés nulle part
  const racine = enfants(null), libres = directes(null);
  return (
    <>
      {actions}{outils}{barres}
      {racine.length > 0 && <section className="rb-sec"><h2>Dossiers <span className="tab-n">{racine.length}</span></h2>
        <div className="rd-grid">{racine.map(carteDossier)}</div></section>}
      {libres.length > 0 && <section className="rb-sec"><h2>Documents <span className="tab-n">{libres.length}</span></h2>{lot(libres)}</section>}
      {!racine.length && !libres.length && (
        <div className="card empty-state"><Icon name="books" size={28} /><b>{ressources.length ? 'Aucune ressource de ce type à la racine.' : 'La bibliothèque est vide.'}</b>
          <span className="small muted">Créez un dossier ou ajoutez une première ressource : une page composée, ou un fichier PDF, DOCX, vidéo, photo.</span></div>
      )}
      {fenetres}
    </>
  );
}
