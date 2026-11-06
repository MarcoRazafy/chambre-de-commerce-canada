// Mise en page des pages publiques (connexion, inscription à la lettre, désabonnement)
export default function PublicCard({ title, sous = 'Back-office de la CanCham', children }: { title: React.ReactNode; sous?: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, background: 'var(--surface-2)' }}>
      <div className="card" style={{ width: 'min(100%, 420px)', gap: 16 }}>
        <div className="brand" style={{ padding: 0 }}>
          <img className="logo" src="/logo-app.png" alt="" width={36} height={36} />
          <div><b>L’Alliée Virtuelle</b><span>{sous}</span></div>
        </div>
        <h1 style={{ fontSize: '1.4rem' }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}
