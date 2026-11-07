'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { relative, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import Icon from '../Icon';
import { appel } from './api';
import { useMoi } from './EspaceShell';

const heure = (v: string) => new Date(v).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Messagerie du membre : ses conversations avec la Chambre, et « Écrire à la Chambre »
export default function EspaceMessagerie() {
  const { recharger } = useMoi();
  const [liste, setListe] = useState<Row[] | null>(null);
  const [cur, setCur] = useState<number | null>(null);
  const [fil, setFil] = useState<Row | null>(null);
  const [texte, setTexte] = useState('');
  const [busy, setBusy] = useState(false);
  const bas = useRef<HTMLDivElement>(null);
  const zone = useRef<HTMLTextAreaElement>(null);

  const charger = useCallback(() => appel<Row[]>('/api/espace/messages').then(l => {
    setListe(l);
    setCur(c => c ?? (new URLSearchParams(window.location.search).get('ecrire') ? null : l[0]?.id ?? null));
  }).catch(e => toast(e.message, 'error')), []);
  useEffect(() => { charger(); }, [charger]);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('texte')) setTexte(t => t || p.get('texte')!);
    if (p.get('ecrire')) zone.current?.focus();
  }, [liste]);
  useEffect(() => {
    if (!cur) { setFil(null); return; }
    appel<Row>(`/api/espace/messages/${cur}`).then(f => { setFil(f); recharger(); setListe(l => l?.map(t => (t.id === cur ? { ...t, non_lu: false } : t)) ?? l); })
      .catch(e => toast(e.message, 'error'));
  }, [cur, recharger]);
  useEffect(() => { bas.current?.scrollIntoView({ block: 'end' }); }, [fil]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!texte.trim()) return;
    setBusy(true);
    try {
      if (cur) { await appel(`/api/espace/messages/${cur}`, 'POST', { texte }); setFil(await appel<Row>(`/api/espace/messages/${cur}`)); }
      else { const { id } = await appel<{ id: number }>('/api/espace/messages', 'POST', { texte }); setCur(id); }
      setTexte(''); charger();
    } catch (x) { toast((x as Error).message, 'error'); } finally { setBusy(false); }
  }
  const titre = (t: Row) => (t.type === 'groupe' && t.sujet ? t.sujet : t.sujet || 'La Chambre · CanCham Madagascar');

  return (
    <>
      <div className="head"><div><h1>Messagerie</h1><p className="muted">Vos échanges avec l’équipe de la Chambre. Elle vous répond ici.</p></div>
        <div className="actions"><button className="btn cta" onClick={() => { setCur(null); setTimeout(() => zone.current?.focus(), 50); }}><Icon name="compose" size={16} /> Écrire à la Chambre</button></div></div>
      <div className="card es-mx">
        <aside className="es-mx-liste" aria-label="Conversations">
          {liste === null ? <div className="skeleton"><span /><span /></div>
            : liste.length === 0 ? <p className="small muted es-mx-vide">Aucune conversation pour l’instant. Écrivez à la Chambre : elle vous répondra ici.</p>
            : liste.map(t => (
              <button key={t.id} type="button" className={`es-mx-it${t.id === cur ? ' on' : ''}`} onClick={() => setCur(t.id)}>
                <span className="es-mx-av"><Icon name={t.type === 'groupe' ? 'users' : 'chat'} size={18} /></span>
                <span className="grow"><span className="row between"><b className={t.non_lu ? 'nl' : ''}>{titre(t)}</b><small>{t.dernier_at ? relative(t.dernier_at) : ''}</small></span>
                  <small className="es-mx-prev">{t.dernier ? (t.dernier_de_nous ? t.dernier : `Vous : ${String(t.dernier).replace(/^[^\n:]{2,80} : /, '')}`) : 'Pas encore de message'}</small></span>
                {t.non_lu && <i className="es-mx-point" aria-label="non lu" />}
              </button>
            ))}
        </aside>
        <section className="es-mx-fil">
          <div className="es-mx-h"><b>{cur && fil ? titre(fil) : 'Nouveau message à la Chambre'}</b><small>{cur ? 'Conversation avec l’équipe de la Chambre' : 'L’équipe de la Chambre vous répondra ici.'}</small></div>
          <div className="es-mx-msgs">
            {cur && !fil ? <div className="skeleton"><span /><span /></div>
              : !cur ? <p className="small muted es-mx-vide">Posez votre question, demandez un document, proposez une idée…</p>
              : fil!.messages.map((m: Row) => (
                <div key={m.id} className={`es-msg${m.moi || (!m.de_nous) ? ' moi' : ''}`}>
                  <span className="es-msg-a">{m.auteur || (m.de_nous ? 'La Chambre' : 'Votre entreprise')} · {heure(m.created_at)}</span>
                  <div className="es-bulle">{m.supprime ? <i className="muted">Message supprimé</i> : m.texte}
                    {m.fichiers?.map((f: Row) => <a key={f.id} className="es-pj" href={`/api/espace/messages/fichiers/${f.id}`} target="_blank" rel="noreferrer"><Icon name="attach" size={14} />{f.nom}</a>)}</div>
                </div>
              ))}
            <div ref={bas} />
          </div>
          <form className="es-mx-comp" onSubmit={envoyer}>
            <textarea ref={zone} className="inp" rows={3} placeholder="Votre message…" value={texte} onChange={e => setTexte(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) envoyer(e); }} aria-label="Votre message" />
            <div className="row between"><small className="muted">Ctrl + Entrée pour envoyer</small>
              <button className="btn cta" disabled={busy || !texte.trim()}><Icon name="send" size={15} /> {busy ? 'Envoi…' : 'Envoyer'}</button></div>
          </form>
        </section>
      </div>
    </>
  );
}
