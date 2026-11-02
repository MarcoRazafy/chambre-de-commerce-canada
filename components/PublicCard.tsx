// Mise en page des pages publiques (connexion, inscription à la lettre, désabonnement)
export default function PublicCard({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, background: 'var(--surface-2)' }}>
      <div className="card" style={{ width: 'min(100%, 420px)', gap: 16 }}>
        <div className="brand" style={{ padding: 0 }}>
          <div className="brand-mark">CC</div>
          <div><b>CanCham Connect</b><span>Chambre de Commerce Canada–Madagascar</span></div>
        </div>
        <h1 style={{ fontSize: '1.4rem' }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}
