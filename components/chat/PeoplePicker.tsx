'use client';
import { useEffect, useState } from 'react';
import { chat, type Person } from '@/lib/chat';
import Avatar from '../Avatar';
import Icon from '../Icon';

// Recherche de destinataires (collègues et membres), avec les personnes choisies en pastilles
export default function PeoplePicker({ value, onChange, exclude = [], autoFocus }: { value: Person[]; onChange: (p: Person[]) => void; exclude?: Person[]; autoFocus?: boolean }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  useEffect(() => {
    const t = setTimeout(() => chat.people(term).then(setResults).catch(() => setResults([])), 200);
    return () => clearTimeout(t);
  }, [term]);
  const taken = (p: Person) => [...value, ...exclude].some(x => x.kind === p.kind && x.id === p.id);

  return (
    <div className="picker">
      <div className="picker-field">
        {value.map(p => (
          <span key={p.kind + p.id} className="picker-chip">
            {p.nom}
            <button type="button" aria-label={`Retirer ${p.nom}`} onClick={() => onChange(value.filter(x => !(x.kind === p.kind && x.id === p.id)))}><Icon name="close" size={12} /></button>
          </span>
        ))}
        <input autoFocus={autoFocus} value={term} onChange={e => setTerm(e.target.value)} placeholder={value.length ? 'Ajouter une personne…' : 'Tapez un nom de collègue ou de membre…'} aria-label="Rechercher une personne" />
      </div>
      <ul className="picker-list">
        {results.filter(p => !taken(p)).map(p => (
          <li key={p.kind + p.id}>
            <button type="button" onClick={() => { onChange([...value, p]); setTerm(''); }}>
              <Avatar kind={p.kind} id={p.id} size={32} />
              <span className="grow"><b>{p.nom}</b><span className="small muted">{p.kind === 'user' ? 'Équipe' : 'Membre'}{p.detail ? ' · ' + p.detail : ''}</span></span>
            </button>
          </li>
        ))}
        {!results.filter(p => !taken(p)).length && <li className="small muted" style={{ padding: '8px 12px' }}>Aucune personne trouvée.</li>}
      </ul>
    </div>
  );
}
