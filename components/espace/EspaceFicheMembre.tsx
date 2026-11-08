'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Row } from '@/lib/format';
import Icon from '../Icon';
import Avatar from '../Avatar';
import MembreHero from '../MembreHero';
import TexteLie from '../TexteLie';
import Produits from '../details/member/Produits';
import { appel } from './api';

// Fiche d'un membre vue depuis l'annuaire de l'espace membre : en-tête, présentation, catalogue ; « Demander une mise en relation »
export default function EspaceFicheMembre() {
  const { id } = useParams<{ id: string }>();
  const [m, setM] = useState<Row | null>(null);
  const [erreur, setErreur] = useState('');
  useEffect(() => { appel<Row>(`/api/espace/annuaire/${id}`).then(setM).catch(x => setErreur(x.message)); }, [id]);
  if (!m) return erreur ? <div className="err">{erreur}</div> : <div className="card"><div className="skeleton"><span /><span /><span /></div></div>;
  const demande = `Bonjour, je souhaiterais être mis en relation avec ${m.nom}.`;
  return (
    <>
      <nav className="crumbs" aria-label="Fil d’Ariane"><Link href="/espace/annuaire">Annuaire des membres</Link><span className="crumb-sep">›</span><span aria-current="page">{m.nom}</span></nav>
      <MembreHero m={m} secteur={m.secteur} actions={<Link className="btn cta" href={`/espace/messagerie?ecrire=1&texte=${encodeURIComponent(demande)}`}><Icon name="spark" size={16} /> Demander une mise en relation</Link>} />
      <div className="grid g21">
        <div className="col">
          <section className="card"><h2>Présentation</h2>
            {m.activite && <p className="flead">{m.activite}</p>}
            {m.description ? <p className="mabout-text"><TexteLie texte={m.description} /></p> : !m.activite && <p className="small muted">Pas encore de présentation.</p>}
            {m.recherche && <div className="mabout-block"><h3>Recherche actuellement</h3><p className="mabout-text"><TexteLie texte={m.recherche} /></p></div>}</section>
          {m.produits?.length > 0 && <Produits liste={m.produits} />}
        </div>
        <div className="col">
          {(m.offres?.length > 0 || m.besoins?.length > 0) && (
            <section className="card">
              {m.offres?.length > 0 && <><h2>Propose</h2><div className="es-chips">{m.offres.map((o: string) => <span key={o} className="dchip">{o}</span>)}</div></>}
              {m.besoins?.length > 0 && <><h2>Recherche</h2><div className="es-chips">{m.besoins.map((o: string) => <span key={o} className="dchip need">{o}</span>)}</div></>}
            </section>
          )}
          {m.contacts?.length > 0 && (
            <section className="card"><h2>{m.contacts.length > 1 ? 'Contacts' : 'Contact'}</h2>
              <ul className="es-fiche-ct">{m.contacts.map((c: Row) => (
                <li key={c.id}><Avatar kind="contact" id={c.id} size={44} nom={c.nom} />
                  <div className="ct-id"><b>{c.nom}</b>{c.principal && <span className="ct-main">Contact principal</span>}
                    {c.fonction && <span className="ct-fn">{c.fonction}</span>}
                    {c.email && <a href={`mailto:${c.email}`}><Icon name="mail" size={13} />{c.email}</a>}
                    {c.tel && <a href={`tel:${String(c.tel).replace(/\s/g, '')}`}><Icon name="chat" size={13} />{c.tel}</a>}</div></li>
              ))}</ul></section>
          )}
          <section className="card"><h2>Travailler ensemble</h2>
            <p className="small muted">La Chambre présente les membres entre eux quand l’un a besoin de ce que l’autre propose. Écrivez-lui pour être mis en relation avec {m.nom}.</p>
            <Link className="btn" style={{ alignSelf: 'flex-start' }} href={`/espace/messagerie?ecrire=1&texte=${encodeURIComponent(demande)}`}><Icon name="chat" size={16} /> Écrire à la Chambre</Link></section>
        </div>
      </div>
    </>
  );
}
