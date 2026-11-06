'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NAV } from '@/lib/resources';
import Icon from './Icon';
import ModalBackdrop from './ModalBackdrop';
import { CREER } from '@/lib/creer';

type Opt = { groupe: string; label: string; detail?: string; href: string; icon: string };
const plier = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const ICONE: Record<string, string> = { Membre: 'users', Contact: 'user', Événement: 'cal', Facture: 'file', Actualité: 'news', Abonné: 'mail', Conversation: 'chat' };
const PAGES: Opt[] = [
  ...NAV.flatMap(([, items]) => items).map(i => ({ groupe: 'Pages', label: i.label, href: '/' + i.slug, icon: i.icon })),
  { groupe: 'Pages', label: 'Messagerie', href: '/messagerie', icon: 'chat' },
  { groupe: 'Pages', label: 'Mon profil', href: '/profil', icon: 'user' },
];
const ACTIONS: Opt[] = CREER.map(([icon, l, href]) => ({ groupe: 'Actions', label: `Créer : ${l.toLowerCase()}`, href, icon: 'plus' }));

// Recherche universelle (Ctrl K) : pages, actions, puis membres, factures, événements… depuis le serveur
export default function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [trouves, setTrouves] = useState<Opt[]>([]);
  const [sel, setSel] = useState(0);
  const liste = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setTrouves([]); return; }
    let fini = false;
    const h = setTimeout(() => fetch('/api/recherche?q=' + encodeURIComponent(t)).then(r => (r.ok ? r.json() : []))
      .then((rows: { type: string; titre: string; detail: string; href: string }[]) => !fini && setTrouves(rows.map(r => ({ groupe: r.type + 's', label: r.titre, detail: r.detail, href: r.href, icon: ICONE[r.type] ?? 'search' }))))
      .catch(() => {}), 180);
    return () => { fini = true; clearTimeout(h); };
  }, [q]);

  const opts = useMemo(() => {
    const t = plier(q.trim());
    const locaux = [...PAGES, ...ACTIONS].filter(o => !t || plier(o.label).includes(t));
    return [...locaux.slice(0, t ? 8 : 14), ...trouves].slice(0, 40);
  }, [q, trouves]);
  useEffect(() => setSel(0), [q]);
  useEffect(() => { liste.current?.querySelector('.opt.sel')?.scrollIntoView({ block: 'nearest' }); }, [sel]);

  const aller = (o?: Opt) => { if (!o) return; onClose(); router.push(o.href); };
  let groupe = '';
  return (
    <ModalBackdrop onClose={onClose}>
      <div className="palette" role="dialog" aria-label="Recherche">
        <div className="palette-in"><Icon name="search" size={18} />
          <input autoFocus placeholder="Rechercher un membre, une facture, une page, une action…" aria-label="Rechercher" value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, opts.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
              else if (e.key === 'Enter') { e.preventDefault(); aller(opts[sel]); }
            }} />
          <kbd>Échap</kbd>
        </div>
        <div className="palette-res" ref={liste} role="listbox">
          {opts.length ? opts.map((o, i) => {
            const titre = o.groupe !== groupe ? <div className="palette-grp">{o.groupe}</div> : null;
            groupe = o.groupe;
            return (
              <div key={o.groupe + o.href + o.label}>
                {titre}
                <button type="button" role="option" aria-selected={i === sel} className={`opt${i === sel ? ' sel' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => aller(o)}>
                  <Icon name={o.icon} size={16} /><span className="grow"><b>{o.label}</b>{o.detail && <small>{o.detail}</small>}</span>
                </button>
              </div>
            );
          }) : <p className="palette-vide">{q.trim().length < 2 ? 'Tapez au moins deux lettres.' : 'Aucun résultat.'}</p>}
        </div>
      </div>
    </ModalBackdrop>
  );
}
