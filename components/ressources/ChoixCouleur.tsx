'use client';
import { PALETTE_TEXTE } from '@/lib/blocs';
import Icon from '../Icon';

// Pastilles de la palette CanCham, une couleur libre et « Par défaut »
export default function ChoixCouleur({ libelle, actuelle, onChoisir }: { libelle: string; actuelle?: string | null; onChoisir: (c: string | null) => void }) {
  return (
    <div role="group" aria-label={libelle} className="cc-row">
      <span className="cc-lab"><Icon name="palette" size={14} /> Couleur</span>
      {PALETTE_TEXTE.map(c => (
        <button key={c.valeur} type="button" title={c.nom} aria-label={c.nom} aria-pressed={actuelle === undefined ? undefined : actuelle === c.valeur}
          className={`cc-dot${actuelle === c.valeur ? ' on' : ''}`} style={{ background: c.valeur }}
          onMouseDown={e => e.preventDefault()} onClick={() => onChoisir(c.valeur)} />
      ))}
      <label className="cc-free" title="Choisir une autre couleur">
        <input type="color" aria-label="Autre couleur" defaultValue={actuelle ?? '#ad0707'} ref={el => { if (el) el.onchange = () => onChoisir(el.value); }} />
        Personnalisée
      </label>
      <button type="button" className="cc-reset" onMouseDown={e => e.preventDefault()} onClick={() => onChoisir(null)}>Par défaut</button>
    </div>
  );
}
