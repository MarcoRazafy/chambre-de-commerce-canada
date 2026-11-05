'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import { blocsEnregistres } from '@/lib/blocs';
import { CATS, FMTS, FMT_ICON, ariary, mediaUrl, quand } from '@/lib/bibliotheque';
import Icon from '../Icon';
import PageRessource from '../ressources/PageRessource';
import EditeurPage from '../ressources/EditeurPage';
import RessourceFichier from '../ressources/RessourceFichier';
import { AccesFenetre } from '../ressources/Fenetres';

const dateLongue = (v: string) => new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

// /ressources/12 : lecture (lecteur du navigateur pour PDF, vidéo, photo ; blocs pour une page) ;
// /ressources/12?modifier=1 : modification ; /ressources/nouvelle?mode=page|fichier&dossier=3 : création (id 0)
export default function RessourceDetail({ id }: { id: number }) {
  const router = useRouter();
  const [r, setR] = useState<Row | null>(null);
  const [biblio, setBiblio] = useState<{ dossiers: Row[]; membres: Row[] } | null>(null);
  const [mode, setMode] = useState<'lire' | 'modifier' | null>(null);
  const [neuve, setNeuve] = useState<{ fmt: 'page' | 'fichier'; dossier: number | null }>({ fmt: 'page', dossier: null });
  const [acces, setAcces] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => Promise.all([id ? api<Row>(`/api/ressources/${id}`) : Promise.resolve(null), api<Row>('/api/ressources')])
    .then(([x, b]) => { setR(x); setBiblio({ dossiers: b.dossiers, membres: b.membres }); setError(''); })
    .catch(e => setError(e.message)), [id]);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setMode(id && !p.has('modifier') ? 'lire' : 'modifier');
    const d = Number(p.get('dossier'));
    setNeuve({ fmt: p.get('mode') === 'fichier' ? 'fichier' : 'page', dossier: Number.isInteger(d) && d > 0 ? d : null });
    load();
  }, [id, load]);

  const retour = (dossier: number | null | undefined) => `/ressources${dossier ? `?dossier=${dossier}` : ''}`;
  function basculer(m: 'lire' | 'modifier') {
    setMode(m);
    const url = new URL(window.location.href);
    if (m === 'modifier') url.searchParams.set('modifier', '1'); else url.searchParams.delete('modifier');
    window.history.replaceState(null, '', url);
    window.scrollTo({ top: 0 });
  }
  async function supprimer() {
    if (!r || !confirm(`Supprimer « ${r.titre} » de la bibliothèque ? Son fichier est effacé avec elle.`)) return;
    try { await api(`/api/ressources/${r.id}`, 'DELETE'); toast('Ressource supprimée.'); router.push(retour(r.dossier_id)); }
    catch (e) { toast((e as Error).message, 'error'); }
  }

  if (error) return <div className="err">{error}</div>;
  if (!biblio || mode === null || (id && !r)) return <div className="card"><div className="skeleton"><span /><span /><span /></div></div>;

  // Création ou modification
  if (mode === 'modifier') {
    const page = r ? r.fmt === 'page' : neuve.fmt === 'page';
    const dossierParDefaut = r ? r.dossier_id : neuve.dossier;
    const props = {
      ressource: r ?? undefined, dossiers: biblio.dossiers, dossierParDefaut,
      onSaved: (nid: number) => { if (r) { basculer('lire'); load(); } else router.replace(`/ressources/${nid}`); },
      onCancel: () => (r ? basculer('lire') : router.push(retour(neuve.dossier))),
    };
    return (
      <>
        <div className="head rv-top">
          <div><Link className="rv-back" href={retour(dossierParDefaut)}><Icon name="back" size={14} /> Bibliothèque</Link>
            <h1>{r ? `Modifier « ${r.titre} »` : page ? 'Nouvelle page' : 'Nouvelle ressource'}</h1></div>
          {!r && <Link className="btn" replace href={`/ressources/nouvelle?mode=${page ? 'fichier' : 'page'}${neuve.dossier ? `&dossier=${neuve.dossier}` : ''}`}
            onClick={() => setNeuve(n => ({ ...n, fmt: page ? 'fichier' : 'page' }))}>
            <Icon name={page ? 'upload' : 'article'} size={16} /> {page ? 'Déposer un fichier plutôt' : 'Composer une page plutôt'}</Link>}
        </div>
        {page ? <EditeurPage key={`p${r?.id ?? 0}`} {...props} /> : <RessourceFichier key={`f${r?.id ?? 0}`} {...props} />}
      </>
    );
  }

  // Lecture
  const x = r!;
  const fichier = mediaUrl(x.fichier);
  const reserve = (x.fil as Row[]).filter(d => d.restreint);
  const blocs = x.fmt === 'page' ? blocsEnregistres(x.contenu) : [];
  return (
    <div className="rv">
      <nav className="rb-fil" aria-label="Chemin de la ressource">
        <Link href="/ressources"><Icon name="books" size={15} /> Bibliothèque</Link>
        {(x.fil as Row[]).map(d => <span key={d.id}><Icon name="caret" size={12} /><Link href={retour(d.id)}>{d.nom}</Link></span>)}
      </nav>

      <header className="card rv-head">
        <span className="tile-ic"><Icon name={FMT_ICON[x.fmt]} size={20} fill /></span>
        <div className="grow">
          <span className="dcard-sector">{CATS[x.cat]} · {FMTS[x.fmt]}</span>
          <h1>{x.titre}</h1>
          <div className="rv-facts">
            <span className={`rv-price${x.type === 'payant' ? ' paid' : ''}`}>{x.type === 'payant' ? ariary(x.prix) : 'Gratuit, inclus dans l’adhésion'}</span>
            <span>{x.taille}</span><span>Modifiée {quand(x.updated_at)}</span>
          </div>
        </div>
        <div className="rv-act">
          {fichier && x.fmt !== 'page' && <a className="btn" href={`${fichier}?dl=1`}><Icon name="download" size={16} /> Télécharger</a>}
          <button type="button" className="btn cta" onClick={() => basculer('modifier')}><Icon name="edit" size={16} /> Modifier</button>
          <button type="button" className="btn ghost danger" onClick={supprimer} aria-label="Supprimer la ressource" title="Supprimer"><Icon name="trash" size={16} /></button>
        </div>
      </header>

      <div className="rv-layout">
        <div className="rv-main">
          {x.fmt === 'page' ? <PageRessource titre={x.titre} blocs={blocs} />
            : !fichier ? (
              <div className="card empty-state rv-missing">
                {mediaUrl(x.vignette) && <img src={mediaUrl(x.vignette)!} alt="" />}
                <Icon name="alert" size={26} /><b>Fichier manquant</b>
                <span className="small muted">Le fichier de cette ressource n’a pas pu être repris de CanCham Connect. Déposez-le pour que les membres puissent la lire.</span>
                <button type="button" className="btn cta" onClick={() => basculer('modifier')}><Icon name="upload" size={16} /> Déposer le fichier</button>
              </div>
            ) : x.fmt === 'pdf' ? <iframe className="rv-pdf" src={fichier} title={x.titre} />
            : x.fmt === 'video' ? <div className="pr-video rv-video"><video src={fichier} controls playsInline preload="metadata" poster={mediaUrl(x.cover) ?? undefined} /></div>
            : x.fmt === 'image' ? <a className="rv-image" href={fichier} target="_blank" rel="noreferrer"><img src={fichier} alt={x.titre} /></a>
            : (
              <div className="card empty-state">
                <span className="tile-ic"><Icon name="docx" size={22} fill /></span><b>{x.fichier_nom}</b>
                <span className="small muted">Le navigateur n’affiche pas les documents Word : téléchargez-le pour l’ouvrir.</span>
                <a className="btn cta" href={`${fichier}?dl=1`}><Icon name="download" size={16} /> Télécharger ({x.taille})</a>
              </div>
            )}
        </div>

        <aside className="rv-side">
          {mediaUrl(x.vignette) && x.fmt !== 'image' && <img className="card rv-cover" src={mediaUrl(x.vignette)!} alt="" />}
          <section className="card">
            <h2>Description</h2>
            {x.description ? <p className="mabout-text">{x.description}</p> : <p className="small muted">Aucune description. <button type="button" className="linkish" onClick={() => basculer('modifier')}>En ajouter une</button></p>}
          </section>
          <section className="card">
            <h2>Accès</h2>
            {x.type === 'payant' ? (<>
              <p className="small"><b>Ressource payante</b> · {ariary(x.prix)}</p>
              <p className="small muted">{x.acces.length ? `${x.acces.length} entreprise${x.acces.length > 1 ? 's y ont' : ' y a'} accès : ${x.acces.slice(0, 5).map((a: Row) => a.nom).join(', ')}${x.acces.length > 5 ? '…' : ''}` : 'Aucune entreprise n’y a encore accès.'}</p>
              <button type="button" className="btn sm" onClick={() => setAcces(true)}><Icon name="userplus" size={14} /> Gérer les accès</button>
            </>) : <p className="small muted">Gratuite : tout membre à jour de sa cotisation la lit.</p>}
            {reserve.length > 0 && <p className="small rh-acc lock"><Icon name="lock" size={14} /> Rangée dans « {reserve[reserve.length - 1].nom} », dossier réservé à des entreprises choisies.</p>}
          </section>
          <section className="card rv-meta">
            <h2>Informations</h2>
            <dl>
              <dt>Ajoutée le</dt><dd>{dateLongue(x.created_at)}</dd>
              <dt>Modifiée</dt><dd>{quand(x.updated_at)}</dd>
              {x.fichier_nom && <><dt>Fichier</dt><dd>{x.fichier_nom}</dd></>}
              <dt>Dossier</dt><dd>{(x.fil as Row[]).map(d => d.nom).join(' › ') || 'Racine de la bibliothèque'}</dd>
            </dl>
          </section>
        </aside>
      </div>
      {acces && <AccesFenetre ressources={[x]} membres={biblio.membres} onClose={() => setAcces(false)} onChanged={load} />}
    </div>
  );
}
