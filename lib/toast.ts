// Notification flottante en bas à droite (affichée par components/Toaster.tsx)
export type Toast = { id: number; kind: 'ok' | 'error'; title: string; detail?: string };

export function toast(message: string, kind: Toast['kind'] = 'ok') {
  // « Demande acceptée. Facture CC-2026-0039 émise. » → titre + détail
  const i = message.indexOf('. ');
  const [title, detail] = i > 0 ? [message.slice(0, i), message.slice(i + 2)] : [message.replace(/\.$/, ''), undefined];
  window.dispatchEvent(new CustomEvent<Toast>('cc:toast', { detail: { id: Date.now() + Math.random(), kind, title, detail } }));
}
