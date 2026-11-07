'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { useMoi } from './EspaceShell';

type Profil = { entreprise: Record<string, any> };
const date = (v?: string | null) => (v ? new Date(v.slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const STATUT: Record<string, [string, string]> = { a_jour: ['Adhésion à jour', 'ok'], attente: ['Cotisation attendue', 'warn'], retard: ['Cotisation en retard', 'late'] };

// Accueil de l'espace membre : où en est le questionnaire, l'adhésion, et ce qui arrive bientôt
export default function EspaceAccueil() {
  const { moi } = useMoi();
  const [p, setP] = useState<Profil | null>(null);
  useEffect(() => { fetch('/api/espace/profil').then(r => (r.ok ? r.json() : null)).then(setP).catch(() => {}); }, []);
  if (!moi) return <div className="card"><div className="skeleton"><span /><span /><span /></div></div>;
  const prenom = moi.nom.split(/\s+/)[0];
  const q = moi.maillage, e = p?.entreprise;
  const [st, ton] = STATUT[moi.statut] ?? ['Membre', 'off'];
  return (
    <>
      <div className="hero">
        <div style={{ position: 'relative', zIndex: 1 }}><div className="eyebrow">{moi.entreprise}</div><h1>Bonjour <em>{prenom}</em>,</h1><p>Bienvenue dans votre espace membre de la CanCham.</p></div>
        <div className="hero-stats">
          <span><b className="num">{q.faites}/{q.total}</b>questionnaire</span>
          <span><b className="num">{moi.messages}</b>message{moi.messages > 1 ? 's' : ''} non lu{moi.messages > 1 ? 's' : ''}</span>
          <span><b className="num">{moi.factures}</b>facture{moi.factures > 1 ? 's' : ''} à régler</span>
        </div>
      </div>

      <div className="grid g21">
        <section className={`card es-quest${q.pct === 100 ? ' fini' : ''}`}>
          <div className="card-h"><h2>Questionnaire de maillage</h2><span className={`pchip ${q.pct === 100 ? 'ok' : q.pct ? 'warn' : 'off'}`}>{q.pct === 100 ? '✓ Complet' : `${q.faites} / ${q.total}`}</span></div>
          <p className="small">{q.pct === 100
            ? 'Merci ! Vous participez aux mises en relation : la Chambre vous présentera les membres qui ont besoin de ce que vous offrez, et ceux qui offrent ce que vous cherchez.'
            : 'Dites-nous ce que vous offrez et ce que vous cherchez : la Chambre vous présentera les bons partenaires parmi ses membres. Environ 15 minutes, enregistré au fur et à mesure.'}</p>
          <div className="bar"><i style={{ width: `${q.pct}%` }} /></div>
          <Link className={`btn ${q.pct === 100 ? '' : 'cta'}`} href="/espace/maillage" style={{ alignSelf: 'flex-start' }}>
            {q.pct === 100 ? 'Mettre à jour mes réponses' : q.pct ? 'Continuer le questionnaire ›' : 'Commencer le questionnaire ›'}</Link>
        </section>

        <section className="card">
          <div className="card-h"><h2>Mon adhésion</h2><span className={`pchip ${ton}`}>{st}</span></div>
          <dl className="es-kv">
            <dt>Entreprise</dt><dd>{moi.entreprise}</dd>
            <dt>Formule</dt><dd>{e?.formule ?? '—'}</dd>
            <dt>Membre depuis</dt><dd>{date(e?.membre_depuis)}</dd>
            <dt>Renouvellement</dt><dd>{date(e?.renouvellement)}</dd>
          </dl>
          <Link className="btn sm" href="/espace/profil" style={{ alignSelf: 'flex-start' }}><Icon name="edit" size={14} /> Modifier la présentation</Link>
        </section>
      </div>

      <div className="es-raccourcis">
        {([['/espace/messagerie', 'chat', 'Messagerie', moi.messages ? `${moi.messages} message${moi.messages > 1 ? 's' : ''} non lu${moi.messages > 1 ? 's' : ''}` : 'Écrire à la Chambre', moi.messages > 0],
          ['/espace/factures', 'file', 'Mes factures', moi.factures ? `${moi.factures} à régler` : 'Tout est réglé', moi.factures > 0],
          ['/espace/evenements', 'cal', 'Événements', 'S’inscrire aux prochains rendez-vous', false],
          ['/espace/annuaire', 'book', 'Annuaire', 'Les entreprises membres', false],
          ['/espace/ressources', 'folder', 'Ressources', 'Guides et documents réservés aux membres', false],
          ['/espace/actualites', 'news', 'Actualités', 'Les nouvelles de la Chambre', false]] as const).map(([href, ic, t, d, chaud]) => (
          <Link key={href} href={href} className={`card es-raccourci${chaud ? ' chaud' : ''}`}><span className="tile-ic"><Icon name={ic} size={18} fill /></span>
            <span className="grow"><b>{t}</b><small>{d}</small></span><Icon name="caret" size={16} /></Link>
        ))}
      </div>
    </>
  );
}
