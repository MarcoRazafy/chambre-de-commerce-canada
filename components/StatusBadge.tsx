import { tone, toneIcon } from '@/lib/format';
import Icon from './Icon';

// Statut affiché comme une pastille pâle avec une icône colorée (la couleur n'est jamais la seule information)
export default function StatusBadge({ value, label }: { value: unknown; label: string }) {
  return <span className={`chip ${tone(value)}`}><Icon name={toneIcon(value)} size={14} />{label}</span>;
}
