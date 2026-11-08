'use client';
import { useEffect, useState } from 'react';

type Profil = { entreprise: { nom: string; formule: string | null; statut: string; renouvellement: string | null } };
const SIGNATAIRE = { nom: 'Ando Lalaina RATOVOMANANA', titre: 'Présidente du Conseil d’Administration' };
const date = (v: string) => new Date(v.slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

// Sceau rond « Membre officiel » : texte sur un cercle, étoile au centre
function Sceau() {
  return (
    <svg viewBox="0 0 100 100" className="cert-sceau" role="img" aria-label="Sceau : membre officiel de la CanCham Madagascar">
      <defs><path id="cert-cercle" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" /></defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="#ad0707" strokeWidth="2" />
      <circle cx="50" cy="50" r="27" fill="none" stroke="#007140" strokeWidth="1.2" />
      <text fontSize="8.4" fontWeight="700" letterSpacing="1.6" fill="#0f1d2c"><textPath href="#cert-cercle">MEMBRE OFFICIEL · CANCHAM MADAGASCAR ·</textPath></text>
      <path d="M50 34 l4.7 9.6 10.6 1.5 -7.7 7.5 1.8 10.5 -9.4-5 -9.4 5 1.8-10.5 -7.7-7.5 10.6-1.5z" fill="#ad0707" />
    </svg>
  );
}

// Certificat d'adhésion à imprimer ou enregistrer en PDF (A4 paysage). Seulement quand la cotisation est à jour.
export default function Certificat() {
  const [p, setP] = useState<Profil | null>(null);
  const [erreur, setErreur] = useState('');
  useEffect(() => {
    fetch('/api/espace/profil').then(r => { if (r.status === 401) { window.location.href = '/connexion'; return null; } return r.json(); })
      .then(d => d && setP(d)).catch(() => setErreur('Certificat indisponible.'));
  }, []);
  if (erreur) return <p style={{ padding: 40 }}>{erreur}</p>;
  if (!p) return <p style={{ padding: 40 }}>Préparation du certificat…</p>;
  const m = p.entreprise;
  if (m.statut !== 'a_jour') return <p style={{ padding: 40 }}>Le certificat est disponible dès que la cotisation est réglée. <a href="/espace/factures">Voir mes factures</a></p>;

  return (
    <main className="cert-page">
      <style>{`
        @page { size: A4 landscape; margin: 0 }
        body { background: #e9e4dc !important }
        .cert-page { min-height: 100vh; padding: 28px 16px; display: flex; flex-direction: column; align-items: center; gap: 18px; font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif); color: #0f1d2c }
        .cert-outils { display: flex; gap: 10px }
        .cert-outils button, .cert-outils a { border: 0; border-radius: 999px; padding: 10px 18px; font: inherit; font-weight: 700; cursor: pointer; text-decoration: none }
        .cert-outils .imp { background: linear-gradient(120deg,#FFB53D,#F4960B 50%,#F26A21); color: #fff }
        .cert-outils a { background: #fff; color: #0f1d2c }
        .cert { container-type: inline-size; width: min(100%, 1000px); aspect-ratio: 297 / 210; background: linear-gradient(100deg,#ad0707 0%,#7a4a1f 52%,#007140 100%); padding: 1.1cqw; box-shadow: 0 20px 50px rgba(0,0,0,.18) }
        .cert-in { height: 100%; background: #fff; padding: 1.2cqw }
        .cert-cadre { height: 100%; border: 1px solid rgba(15,29,44,.2); display: flex; flex-direction: column; align-items: center; text-align: center; padding: 2.6cqw 5cqw }
        .cert-sigle { width: 13.5cqw; height: auto }
        .cert h1 { margin: 1.9cqw 0 0; font-size: 5.4cqw; line-height: 1; color: #ad0707; letter-spacing: -.015em }
        .cert p { margin: 2.1cqw 0 0; max-width: 68cqw; font-size: 1.7cqw; line-height: 1.6; color: #243447 }
        .cert-nom { margin-top: 1.7cqw; width: 64cqw; font-size: 3.8cqw; font-weight: 800; line-height: 1.15; overflow-wrap: anywhere }
        .cert-nom i { display: block; margin-top: .9cqw; height: .25cqw; border-radius: 9px; background: linear-gradient(90deg,#ad0707,#007140) }
        .cert-pied { margin-top: auto; width: 100%; display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 2cqw }
        .cert-k { font-size: 1.05cqw; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: #4a5a6b; text-align: left }
        .cert-v { margin-top: .5cqw; font-size: 2.1cqw; font-weight: 800; color: #ad0707; text-align: left }
        .cert-sceau { width: 9.5cqw; height: auto }
        .cert-sign { text-align: right }
        .cert-sign img { width: 13cqw; height: auto; margin-bottom: -1cqw }
        .cert-sign i { display: block; margin-left: auto; height: 1px; width: 21cqw; max-width: 100%; background: rgba(15,29,44,.6) }
        .cert-sign b { display: block; margin-top: .7cqw; font-size: 1.5cqw }
        .cert-sign span { font-size: 1.25cqw; color: #4a5a6b }
        .cert-mention { margin-top: 1.5cqw; font-size: 1.15cqw; color: #4a5a6b }
        @media print {
          body { background: #fff !important }
          .cert-outils { display: none }
          .cert-page { padding: 0; min-height: 0 }
          .cert { width: 297mm; height: 210mm; box-shadow: none; print-color-adjust: exact; -webkit-print-color-adjust: exact }
        }
      `}</style>
      <div className="cert-outils">
        <button type="button" className="imp" onClick={() => window.print()}>Imprimer / enregistrer en PDF</button>
        <a href="/espace/profil">Retour à mon entreprise</a>
      </div>
      <div className="cert">
        <div className="cert-in"><div className="cert-cadre">
          <img className="cert-sigle" src="/marque/sigle.png" alt="CanCham — Chambre de Commerce et de Coopération Canada-Madagascar" draggable={false} />
          <h1>Certificat d’adhésion</h1>
          <p>La Chambre de Commerce et de Coopération Canada-Madagascar atteste que</p>
          <div className="cert-nom">{m.nom}<i aria-hidden /></div>
          <p>est membre de la CanCham Madagascar{m.formule ? <> au titre de la formule <b>{m.formule}</b></> : null}, et bénéficie à ce titre de l’ensemble des avantages réservés aux membres.</p>
          <div className="cert-pied">
            <div>{m.renouvellement && <><div className="cert-k">Valable jusqu’au</div><div className="cert-v">{date(m.renouvellement)}</div></>}</div>
            <Sceau />
            <div className="cert-sign">
              <img src="/marque/signature-presidente.png" alt="Signature de la présidente du Conseil d’Administration" draggable={false} />
              <i aria-hidden /><b>{SIGNATAIRE.nom}</b><span>{SIGNATAIRE.titre}</span>
            </div>
          </div>
          <div className="cert-mention">Le présent certificat est délivré pour servir et valoir ce que de droit.</div>
        </div></div>
      </div>
    </main>
  );
}
