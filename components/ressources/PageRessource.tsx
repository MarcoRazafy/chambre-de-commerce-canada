import { Fragment, type ReactNode } from 'react';
import { lienVideo, type Alignement, type Bloc, type Ligne, type Passage } from '@/lib/blocs';
import { mediaUrl } from '@/lib/bibliotheque';

const ALIGN: Record<Alignement, string> = { centre: 'center', droite: 'right' };

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

// Vidéo YouTube, Vimeo ou Google Drive lue par le lecteur de la plateforme, sans quitter la page
export function VideoEnLien({ url, titre }: { url: string; titre: string }) {
  const v = lienVideo(url);
  if (!v) return null;
  return (
    <div className="pr-embed">
      <iframe src={v.integration} title={titre} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
    </div>
  );
}

function BlocLu({ bloc, titre }: { bloc: Bloc; titre: string }) {
  if (bloc.type === 'titre') {
    const style = { ...(bloc.couleur ? { color: bloc.couleur } : {}), ...(bloc.alignement ? { textAlign: ALIGN[bloc.alignement] as 'center' } : {}) };
    return bloc.niveau === 2 ? <h2 className="pr-h2" style={style}>{bloc.texte}</h2> : <h3 className="pr-h3" style={style}>{bloc.texte}</h3>;
  }
  if (bloc.type === 'texte') return <TexteMisEnForme lignes={bloc.lignes} />;
  if (bloc.type === 'photo') return (
    <figure className="pr-photo">
      <a href={mediaUrl(bloc.media)!} target="_blank" rel="noreferrer" title="Voir en grand"><img src={mediaUrl(bloc.media)!} alt={bloc.legende ?? ''} loading="lazy" /></a>
      {bloc.legende && <figcaption>{bloc.legende}</figcaption>}
    </figure>
  );
  if (bloc.source === 'lien') return <VideoEnLien url={bloc.url} titre={titre} />;
  return <div className="pr-video"><video src={mediaUrl(bloc.media)!} controls playsInline preload="metadata" aria-label={titre} /></div>;
}

// Lecture d'une ressource « Page » : les blocs dans l'ordre, sur une feuille blanche
export default function PageRessource({ titre, blocs }: { titre: string; blocs: Bloc[] }) {
  return (
    <article className="pr-page">
      {blocs.length ? blocs.map((b, i) => <BlocLu key={i} bloc={b} titre={titre} />) : <p className="muted">Cette page est encore vide.</p>}
    </article>
  );
}
