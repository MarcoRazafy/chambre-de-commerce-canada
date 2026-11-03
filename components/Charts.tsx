// Petits graphiques en HTML/CSS (sans bibliothèque), rendus côté serveur.
// Barres fines arrondies sur la ligne de base, quadrillage discret, infobulle au survol et au clavier,
// valeurs affichées seulement sur la plus haute et la dernière barre, tableau caché pour les lecteurs d'écran.

export type Point = { key: string; label: string; value: number; tip: string };

// Arrondi « propre » du maximum de l'axe (1, 2, 5 × 10ⁿ)
function niceMax(max: number) {
  if (max <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(max)), m = max / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

export function ColumnChart({ data, format, title, height = 180, integer }: { data: Point[]; format: (v: number) => string; title: string; height?: number; integer?: boolean }) {
  // Pour des nombres entiers, un maximum pair garde une graduation du milieu entière (pas de « 0,5 adhérent »)
  const max = Math.max(...data.map(d => d.value));
  const top = integer ? Math.max(2, Math.ceil(niceMax(max) / 2) * 2) : niceMax(max);
  const maxIdx = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  return (
    <figure className="colchart" style={{ ['--h' as string]: `${height}px` }}>
      <div className="cc-plot">
        {[1, 0.5, 0].map(f => <div key={f} className={`cc-grid${f === 0 ? ' cc-base' : ''}`} style={{ bottom: `${f * 100}%` }}><span>{format(top * f)}</span></div>)}
        <div className="cc-bars">
          {data.map((d, i) => (
            <div key={d.key} className="cc-col" tabIndex={0} aria-label={`${d.label} : ${d.tip}`}>
              <div className={`cc-bar${d.value === 0 ? ' zero' : ''}`} style={{ height: `${(d.value / top) * 100}%` }}>
                {d.value > 0 && (i === maxIdx || i === data.length - 1) && <span className="cc-val">{format(d.value)}</span>}
              </div>
              <span className="cc-tip" role="tooltip"><b>{d.label}</b>{d.tip}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="cc-x" aria-hidden="true">{data.map(d => <span key={d.key}>{d.label.split(' ')[0]}</span>)}</div>
      <table className="sr-only"><caption>{title}</caption><tbody>{data.map(d => <tr key={d.key}><th>{d.label}</th><td>{d.tip}</td></tr>)}</tbody></table>
    </figure>
  );
}

// Classement horizontal (une seule couleur), valeur écrite à droite
export function HBarList({ items, total }: { items: { label: string; value: number }[]; total: number }) {
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <ul className="hbars">
      {items.map(i => (
        <li key={i.label}>
          <span className="hb-l">{i.label}</span>
          <span className="hb-track"><i style={{ width: `${(i.value / max) * 100}%` }} /></span>
          <span className="hb-v num">{i.value}<span className="muted"> · {Math.round((i.value / Math.max(1, total)) * 100)} %</span></span>
        </li>
      ))}
    </ul>
  );
}

// Barre segmentée (une part par statut) + légende avec nombre et pourcentage : la couleur n'est jamais seule
export function SegmentBar({ segments }: { segments: { label: string; value: number; tone: string }[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const shown = segments.filter(s => s.value > 0);
  return (
    <div className="segbar">
      <div className="sb-track" role="img" aria-label={shown.map(s => `${s.label} : ${s.value}`).join(', ')}>
        {shown.map(s => <i key={s.label} className={s.tone} style={{ flexGrow: s.value }} title={`${s.label} : ${s.value}`} />)}
      </div>
      <ul className="sb-legend">
        {segments.map(s => (
          <li key={s.label}><span className={`sb-dot ${s.tone}`} aria-hidden="true" /><span className="grow">{s.label}</span>
            <b className="num">{s.value}</b><span className="muted num">{Math.round((s.value / total) * 100)} %</span></li>
        ))}
      </ul>
    </div>
  );
}

// Jauge circulaire (taux)
export function Ring({ value, label }: { value: number; label: string }) {
  const r = 42, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  return (
    <div className="ring" role="img" aria-label={`${label} : ${Math.round(v)} %`}>
      <svg viewBox="0 0 100 100" width="112" height="112" aria-hidden="true">
        <circle cx="50" cy="50" r={r} className="ring-bg" />
        <circle cx="50" cy="50" r={r} className="ring-fg" strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 50 50)" />
      </svg>
      <div className="ring-t"><b className="num">{Math.round(v)} %</b><span>{label}</span></div>
    </div>
  );
}
