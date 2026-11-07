'use client';
import { useEffect, useState } from 'react';
import { api, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import Icon from './Icon';

// Paramètres › Courriels : l'envoi est-il configuré (Brevo ou autre SMTP), et un test vers sa propre adresse
export default function CourrielsReglages() {
  const [e, setE] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { api<Row>('/api/courriel').then(setE).catch(x => setErr(x.message)); }, []);
  async function tester() {
    setBusy(true);
    try { const r = await api<Row>('/api/courriel/test', 'POST'); toast(`Courriel de test envoyé à ${r.a}. Vérifiez votre boîte (et les indésirables).`); }
    catch (x) { toast((x as Error).message, 'error'); } finally { setBusy(false); }
  }
  if (!e) return err ? <div className="err">{err}</div> : <div className="card"><div className="skeleton"><span /><span /></div></div>;
  return (
    <div className="grid g21">
      <section className="card">
        <div className="card-h"><h2>Envoi des courriels</h2><span className={`pchip ${e.configure ? 'ok' : 'warn'}`}>{e.configure ? '✓ Configuré' : 'Pas encore configuré'}</span></div>
        <dl className="es-kv">
          <dt>Serveur</dt><dd>{e.hote ? `${e.hote} : ${e.port}${e.securise ? ' (SSL)' : ''}` : '—'}</dd>
          <dt>Identifiant</dt><dd>{e.utilisateur ?? '—'}</dd>
          <dt>Expéditeur</dt><dd>{e.expediteur ?? '—'}</dd>
          <dt>Adresse du site</dt><dd>{e.adresseApp ?? '— (APP_URL, pour les liens des courriels)'}</dd>
        </dl>
        <p className="small muted">Utilisé pour les newsletters, les factures et relances, les rappels d’événements, les messages aux membres et le lien du questionnaire de maillage.</p>
        <button className="btn cta" style={{ alignSelf: 'flex-start' }} disabled={!e.configure || busy} onClick={tester}>
          <Icon name="send" size={15} /> {busy ? 'Envoi…' : `M’envoyer un courriel de test`}</button>
        <span className="small muted">Le test part uniquement à votre adresse ({e.vous}), jamais aux membres.</span>
      </section>
      <section className="card">
        <h2>Configurer avec Brevo</h2>
        <ol className="small es-etapes">
          <li>Dans Brevo : <b>Paramètres › SMTP &amp; API › SMTP</b>, créez une <b>clé SMTP</b>. Notez l’<b>identifiant</b> (une adresse …@smtp-brevo.com) et la clé.</li>
          <li>Dans Brevo : <b>Expéditeurs, domaines et IP</b>, ajoutez l’adresse d’envoi (ex. info@cancham.mg) et <b>authentifiez le domaine</b> cancham.mg (lignes DKIM et SPF à ajouter chez l’hébergeur du domaine), pour ne pas finir en indésirables.</li>
          <li>Chez l’hébergeur de l’application (variables d’environnement) :
            <pre>{`SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<identifiant SMTP Brevo>
SMTP_PASS=<clé SMTP Brevo>
MAIL_FROM="CanCham Madagascar <info@cancham.mg>"
APP_URL=https://<adresse du site>`}</pre></li>
          <li>Redéployez, revenez ici et cliquez sur <b>« M’envoyer un courriel de test »</b>.</li>
        </ol>
        <p className="small muted">La clé SMTP est un mot de passe : ne la mettez jamais dans le code ni dans un message.</p>
      </section>
    </div>
  );
}
