'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { lienVideo } from '@/lib/blocs';
import Icon from '../Icon';

// Lecteur des vidéos en lien, repris de CanCham Connect : YouTube et Vimeo sont pilotés sans leurs commandes
// (boutons, titre, suggestions), avec nos propres commandes ; des bandes noires couvrent le haut et le bas
// au démarrage, le temps que la plateforme retire ses incrustations. Google Drive : le bouton « ouvrir dans Drive » est neutralisé.
// Si la plateforme ne répond pas, la vidéo reste jouable directement (« libre »).

const BAC_A_SABLE = 'allow-scripts allow-same-origin allow-presentation';
type Etat = 'attente' | 'lecture' | 'pause' | 'tampon' | 'fin';
type Nouvelles = { etat?: Etat; temps?: number; duree?: number; muet?: boolean };
interface Pilote {
  origine: string;
  adresse: (integration: string, ici: string) => string;
  salut: object; lire: object; pause: object;
  aller: (s: number) => object;
  couper: (muet: boolean) => object;
  recevoir: (m: Record<string, unknown>, connu: boolean) => { nouvelles: Nouvelles; reponses?: object[] } | null;
}
const nombre = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

const ETAT_YOUTUBE: Record<number, Etat> = { [-1]: 'attente', 0: 'fin', 1: 'lecture', 2: 'pause', 3: 'tampon', 5: 'attente' };
const ordreYoutube = (func: string, args: unknown[] = []) => ({ event: 'command', func, args, id: 'alliee', channel: 'widget' });
const YOUTUBE: Pilote = {
  origine: 'https://www.youtube-nocookie.com',
  adresse: (integration, ici) => `${integration}&enablejsapi=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&playsinline=1&origin=${encodeURIComponent(ici)}`,
  salut: { event: 'listening', id: 'alliee', channel: 'widget' },
  lire: ordreYoutube('playVideo'), pause: ordreYoutube('pauseVideo'),
  aller: s => ordreYoutube('seekTo', [s, true]),
  couper: muet => ordreYoutube(muet ? 'mute' : 'unMute'),
  recevoir: m => {
    const info = m.info as Record<string, unknown> | undefined;
    if (!info || typeof info !== 'object') return { nouvelles: {} };
    const etat = nombre(info.playerState);
    return { nouvelles: { etat: etat === undefined ? undefined : ETAT_YOUTUBE[etat], temps: nombre(info.currentTime), duree: nombre(info.duration) || undefined, muet: typeof info.muted === 'boolean' ? info.muted : undefined } };
  },
};

const ECOUTES_VIMEO = ['play', 'pause', 'ended', 'timeupdate', 'bufferstart', 'bufferend', 'volumechange'];
const VIMEO: Pilote = {
  origine: 'https://player.vimeo.com',
  adresse: integration => `${integration}${integration.includes('?') ? '&' : '?'}title=0&byline=0&portrait=0&controls=0&playsinline=1&dnt=1`,
  salut: { method: 'ping' }, lire: { method: 'play' }, pause: { method: 'pause' },
  aller: s => ({ method: 'setCurrentTime', value: s }),
  couper: muet => ({ method: 'setVolume', value: muet ? 0 : 1 }),
  recevoir: (m, connu) => {
    const d = (m.data ?? {}) as Record<string, unknown>;
    if (m.event === 'ready' || m.method === 'ping')
      return { nouvelles: {}, reponses: connu ? [] : [...ECOUTES_VIMEO.map(value => ({ method: 'addEventListener', value })), { method: 'getDuration' }] };
    if (m.method === 'getDuration') return { nouvelles: { duree: nombre(m.value) || undefined } };
    switch (m.event) {
      case 'play': case 'bufferend': return { nouvelles: { etat: 'lecture' } };
      case 'pause': return { nouvelles: { etat: 'pause' } };
      case 'ended': case 'finish': return { nouvelles: { etat: 'fin' } };
      case 'bufferstart': return { nouvelles: { etat: 'tampon' } };
      case 'timeupdate': case 'playProgress': return { nouvelles: { temps: nombre(d.seconds), duree: nombre(d.duration) || undefined } };
      case 'volumechange': return { nouvelles: { muet: nombre(d.volume) === 0 } };
      default: return null;
    }
  },
};

function duree(secondes: number) {
  const s = Math.max(0, Math.floor(secondes)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}
const sansAbonnement = () => () => {};

export default function VideoPrivee({ url, titre }: { url: string; titre: string }) {
  const video = lienVideo(url);
  if (!video) return null;
  if (video.plateforme === 'drive') return (
    <div className="vp">
      <iframe src={video.integration} title={titre} loading="lazy" sandbox={BAC_A_SABLE} allow="autoplay; encrypted-media; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      <span className="vp-drive" aria-hidden="true" />
    </div>
  );
  const id = /\/embed\/([^?]+)/.exec(video.integration)?.[1];
  return <Lecteur key={video.integration} pilote={video.plateforme === 'youtube' ? YOUTUBE : VIMEO} integration={video.integration}
    affiche={video.plateforme === 'youtube' && id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null} titre={titre} />;
}

function Lecteur({ pilote, integration, affiche, titre }: { pilote: Pilote; integration: string; affiche: string | null; titre: string }) {
  const conteneur = useRef<HTMLDivElement>(null);
  const cadre = useRef<HTMLIFrameElement>(null);
  const dernier = useRef<Etat>('attente');
  const garde = useRef<ReturnType<typeof setTimeout> | null>(null);
  const habiller = useRef<() => void>(() => {});
  const [etat, setEtat] = useState<Etat>('attente');
  const [temps, setTemps] = useState(0);
  const [total, setTotal] = useState(0);
  const [muet, setMuet] = useState(false);
  const [pret, setPret] = useState(false);
  const [libre, setLibre] = useState(false);
  const [plein, setPlein] = useState(false);
  const [habille, setHabille] = useState(false);
  const ici = useSyncExternalStore(sansAbonnement, () => window.location.origin, () => null);
  const pleinPossible = useSyncExternalStore(sansAbonnement, () => document.fullscreenEnabled, () => false);
  const dire = (m: object) => cadre.current?.contentWindow?.postMessage(JSON.stringify(m), pilote.origine);

  useEffect(() => {
    if (!ici) return;
    let connu = false, bandes: ReturnType<typeof setTimeout> | null = null;
    habiller.current = () => { setHabille(true); if (bandes) clearTimeout(bandes); bandes = setTimeout(() => setHabille(false), 4500); };
    const recevoir = (e: MessageEvent) => {
      const fenetre = cadre.current?.contentWindow;
      if (e.origin !== pilote.origine || !fenetre || e.source !== fenetre) return;
      let m: unknown;
      try { m = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
      if (!m || typeof m !== 'object') return;
      const recu = pilote.recevoir(m as Record<string, unknown>, connu);
      if (!recu) return;
      connu = true; setPret(true);
      for (const r of recu.reponses ?? []) fenetre.postMessage(JSON.stringify(r), pilote.origine);
      const n = recu.nouvelles;
      if (n.temps !== undefined) setTemps(n.temps);
      if (n.duree !== undefined) setTotal(n.duree);
      if (n.muet !== undefined) setMuet(n.muet);
      if (n.etat) {
        const jouait = dernier.current === 'lecture' || dernier.current === 'tampon';
        if (n.etat === 'lecture' && !jouait) habiller.current();
        dernier.current = n.etat; setEtat(n.etat);
        if (n.etat === 'lecture') setLibre(false);
      }
    };
    window.addEventListener('message', recevoir);
    const salut = setInterval(() => { if (connu) clearInterval(salut); else cadre.current?.contentWindow?.postMessage(JSON.stringify(pilote.salut), pilote.origine); }, 500);
    const abandon = setTimeout(() => { if (!connu) setLibre(true); }, 8000);
    return () => { window.removeEventListener('message', recevoir); clearInterval(salut); clearTimeout(abandon); if (bandes) clearTimeout(bandes); };
  }, [ici, pilote]);
  useEffect(() => {
    const suivre = () => setPlein(document.fullscreenElement === conteneur.current);
    document.addEventListener('fullscreenchange', suivre);
    return () => document.removeEventListener('fullscreenchange', suivre);
  }, []);
  useEffect(() => () => { if (garde.current) clearTimeout(garde.current); }, []);

  const lancer = () => {
    habiller.current(); dire(pilote.lire);
    if (garde.current) clearTimeout(garde.current);
    garde.current = setTimeout(() => { if (dernier.current !== 'lecture' && dernier.current !== 'tampon') setLibre(true); }, 2500);
  };
  const basculer = () => {
    if (etat === 'lecture' || etat === 'tampon') { habiller.current(); dire(pilote.pause); }
    else if (etat === 'fin') { dire(pilote.aller(0)); lancer(); }
    else lancer();
  };
  const joue = etat === 'lecture', occupe = etat === 'tampon' || (!pret && !libre);

  return (
    <div ref={conteneur} className="vp">
      {ici && <iframe ref={cadre} src={pilote.adresse(integration, ici)} title={titre} tabIndex={-1} sandbox={BAC_A_SABLE} allow="autoplay; encrypted-media" referrerPolicy="strict-origin-when-cross-origin" />}
      {['haut', 'bas'].map(b => <span key={b} aria-hidden="true" className={`vp-bande ${b}${habille && !libre ? ' on' : ''}`} />)}
      <button type="button" onClick={basculer} disabled={!pret} aria-label={joue ? 'Mettre en pause' : 'Lire la vidéo'}
        className={`vp-zone${libre ? ' libre' : ''}${joue || libre ? '' : etat === 'attente' || etat === 'fin' ? ' fond' : ' voile'}`}>
        {etat === 'attente' && affiche && !libre && <><img src={affiche} alt="" draggable={false} /><span className="vp-voile" /></>}
        {!libre && !joue && <span className="vp-play">{occupe ? <span className="vp-spin" /> : <Icon name={etat === 'fin' ? 'back' : 'play'} size={30} fill />}</span>}
      </button>
      {libre && !joue && <p className="vp-aide">Touchez la vidéo pour lancer la lecture.</p>}
      {pret && etat !== 'attente' && (
        <div className={`vp-barre${joue ? '' : ' on'}`}>
          <button type="button" onClick={basculer} aria-label={joue ? 'Mettre en pause' : 'Lire'}><Icon name={joue ? 'pause' : 'play'} size={18} fill /></button>
          <span className="vp-temps">{duree(temps)} / {duree(total)}</span>
          <input type="range" min={0} max={Math.max(1, Math.floor(total))} step={1} value={Math.min(Math.floor(temps), Math.max(1, Math.floor(total)))} aria-label="Avancement de la vidéo"
            onChange={e => { const v = Number(e.target.value); setTemps(v); habiller.current(); dire(pilote.aller(v)); }} />
          <button type="button" onClick={() => { habiller.current(); dire(pilote.couper(!muet)); setMuet(!muet); }} aria-label={muet ? 'Rétablir le son' : 'Couper le son'}><Icon name={muet ? 'muet' : 'son'} size={18} fill /></button>
          {pleinPossible && <button type="button" onClick={() => (document.fullscreenElement ? void document.exitFullscreen() : void conteneur.current?.requestFullscreen?.())} aria-label={plein ? 'Quitter le plein écran' : 'Plein écran'}><Icon name="open" size={18} /></button>}
        </div>
      )}
    </div>
  );
}
