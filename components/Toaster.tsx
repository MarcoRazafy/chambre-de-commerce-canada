'use client';
import { useEffect, useState } from 'react';
import type { Toast } from '@/lib/toast';
import Icon from './Icon';

// Pile de notifications en bas à droite ; chacune disparaît seule après quelques secondes
export default function Toaster() {
  const [list, setList] = useState<Toast[]>([]);
  useEffect(() => {
    const add = (e: Event) => {
      const t = (e as CustomEvent<Toast>).detail;
      setList(l => [...l.slice(-3), t]);
      setTimeout(() => setList(l => l.filter(x => x.id !== t.id)), t.kind === 'error' ? 8000 : 5000);
    };
    window.addEventListener('cc:toast', add);
    return () => window.removeEventListener('cc:toast', add);
  }, []);

  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map(t => (
        <div key={t.id} className={`toast ${t.kind}`}>
          <Icon name={t.kind === 'ok' ? 'ok' : 'alert'} size={18} />
          <div className="grow"><b>{t.title}</b>{t.detail && <span>{t.detail}</span>}</div>
          <button className="toast-x" aria-label="Fermer" onClick={() => setList(l => l.filter(x => x.id !== t.id))}><Icon name="close" size={14} /></button>
        </div>
      ))}
    </div>
  );
}
