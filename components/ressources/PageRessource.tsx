import { Fragment, type ReactNode } from 'react';
import { type Alignement, type Bloc, type Ligne, type Passage } from '@/lib/blocs';
import { mediaUrl } from '@/lib/bibliotheque';
import Icon from '../Icon';
import VideoPrivee from './VideoPrivee';
import DocxApercu from './DocxApercu';

const ALIGN: Record<Alignement, string> = { centre: 'center', droite: 'right' };

// Icône d'une pièce jointe d'après son extension
export const iconeDocument = (nom = '') => (/\.pdf$/i.test(nom) ? 'pdf' : /\.(docx?|odt|rtf)$/i.test(nom) ? 'docx' : 'doc');
const LIBELLE: Record<string, string> = { pdf: 'PDF', docx: 'Document Word', doc: 'Document' };

function Passages({ passages }: { passages: Passage[] }) {
  return passages.map((p, i) => {
    let c: ReactNode = p.t.split('\n').flatMap((m, j) => (j ? [<br key={`r${j}`} />, m] : [m]));
    if (p.s) c = <u>{c}</u>;
    if (p.i) c = <i>{c}</i>;
    if (p.g) c = <b>{c}</b>;
    if (p.couleur || p.taille) c = <span data-taille={p.taille} style={p.couleur ? { color: p.couleur } : undefined}>{c}</span>;
    if (p.lien) c = <a href={p.lien} {...(p.lien.startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>{c}</a>;
    return <Fragment key={i}>{c}</Fragment>;
  });
}

export function TexteMisEnForme({ lignes }: { lignes: Ligne[] }) {
  return (
    <div className="texte-riche">
      {lignes.map((l, i) => l.genre === 'p'
        ? <p key={i} style={l.alignement ? { textAlign: ALIGN[l.alignement] as 'center' } : undefined}>{l.passages.length ? <Passages passages={l.passages} /> : <br />}</p>
        : l.genre === 'ul'
          ? <ul key={i}>{l.items.map((it, j) => <li key={j}><Passages passages={it} /></li>)}</ul>
          : <ol key={i}>{l.items.map((it, j) => <li key={j}><Passages passages={it} /></li>)}</ol>)}
    </div>
  );
}

function BlocLu({ bloc, titre, media = id => mediaUrl(id)! }: { bloc: Bloc; titre: string; media?: (id: number) => string }) {
  if (bloc.type === 'titre') {
    const style = { ...(bloc.couleur ? { color: bloc.couleur } : {}), ...(bloc.alignement ? { textAlign: ALIGN[bloc.alignement] as 'center' } : {}) };
    return bloc.niveau === 2 ? <h2 className="pr-h2" style={style}>{bloc.texte}</h2> : <h3 className="pr-h3" style={style}>{bloc.texte}</h3>;
  }
  if (bloc.type === 'texte') return <TexteMisEnForme lignes={bloc.lignes} />;
  if (bloc.type === 'photo') return (
    <figure className="pr-photo">
      <a href={media(bloc.media)} target="_blank" rel="noreferrer" title="Voir en grand"><img src={media(bloc.media)} alt={bloc.legende ?? ''} loading="lazy" /></a>
      {bloc.legende && <figcaption>{bloc.legende}</figcaption>}
    </figure>
  );
  if (bloc.type === 'fichier') {
    const url = media(bloc.media);
    return <PieceJointe url={url} nom={bloc.nom} taille={bloc.taille}
      actions={<>{iconeDocument(bloc.nom) === 'pdf' && <a className="btn sm" href={url} target="_blank" rel="noreferrer"><Icon name="external" size={14} /> Plein écran</a>}
        <a className="btn sm" href={`${url}?dl=1`}><Icon name="download" size={14} /> Télécharger</a></>} />;
  }
  if (bloc.source === 'lien') return <VideoPrivee url={bloc.url} titre={titre} />;
  return <div className="pr-video"><video src={media(bloc.media)} controls playsInline preload="metadata" aria-label={titre} /></div>;
}

// Pièce jointe affichée dans la page : un PDF s'ouvre directement dans le lecteur du navigateur ;
// un document Office (que le navigateur ne sait pas afficher) reste une carte à télécharger
export function PieceJointe({ url, nom, taille, actions }: { url: string; nom?: string; taille?: string; actions?: ReactNode }) {
  const ic = iconeDocument(nom);
  return (
    <div className={`pr-file${ic === 'pdf' || /\.docx$/i.test(nom ?? '') ? ' inline' : ''}`}>
      <div className="pr-file-h">
        <span className="tile-ic xs"><Icon name={ic} size={15} fill /></span>
        <span className="grow"><b>{nom ?? 'Pièce jointe'}</b><small>{[LIBELLE[ic], taille].filter(Boolean).join(' · ')}</small></span>
        {actions}
      </div>
      {ic === 'pdf' && <iframe className="pr-file-view" src={`${url}#toolbar=0&navpanes=0&view=FitH`} title={nom ?? 'Pièce jointe'} />}
      {/\.docx$/i.test(nom ?? '') && <DocxApercu url={url} />}
    </div>
  );
}

// Lecture d'une ressource « Page » : les blocs dans l'ordre, sur une feuille blanche
// media : adresse d'un fichier (l'espace membre passe la sienne, qui vérifie les droits de l'entreprise)
export default function PageRessource({ titre, blocs, media }: { titre: string; blocs: Bloc[]; media?: (id: number) => string }) {
  return (
    <article className="pr-page">
      {blocs.length ? blocs.map((b, i) => <BlocLu key={i} bloc={b} titre={titre} media={media} />) : <p className="muted">Cette page est encore vide.</p>}
    </article>
  );
}
