'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { TAILLES, lienSur, type Ligne, type Taille } from '@/lib/blocs';
import Icon from '../Icon';
import ChoixCouleur from './ChoixCouleur';
import { TAILLE_NAVIGATEUR, enHex, garderSelection, lignesDepuis, poserLignes, rendreSelection } from './texte-riche-dom';

function Outil({ libelle, enfonce = false, onClick, children }: { libelle: string; enfonce?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" title={libelle} aria-label={libelle} aria-pressed={enfonce} className={`tr-btn${enfonce ? ' on' : ''}`}
      onMouseDown={e => e.preventDefault()} onClick={onClick}>{children}</button>
  );
}

type Etat = { g: boolean; i: boolean; s: boolean; ul: boolean; ol: boolean };
const NEUTRE: Etat = { g: false, i: false, s: false, ul: false, ol: false };

// Texte riche d'un bloc : gras, italique, souligné, 4 tailles, liens, listes, alignement, couleurs de la palette.
// La barre d'outils n'apparaît que sur le bloc actif ; le contenu est relu en lignes et passages à chaque frappe.
export default function TexteRiche({ lignes, onChange, actif }: { lignes: Ligne[]; onChange: (l: Ligne[]) => void; actif: boolean }) {
  const zone = useRef<HTMLDivElement>(null);
  const depart = useRef(lignes);
  const memoire = useRef<Range | null>(null);
  const [etat, setEtat] = useState(NEUTRE);
  const [vide, setVide] = useState(() => !lignes.length);
  const [volet, setVolet] = useState(false);
  const [adresse, setAdresse] = useState('');
  const [refus, setRefus] = useState('');

  useEffect(() => { if (zone.current) poserLignes(zone.current, depart.current); }, []);

  useEffect(() => {
    const suivre = () => {
      const sel = document.getSelection(), z = zone.current;
      if (!z || !sel?.rangeCount || !z.contains(sel.anchorNode)) return;
      memoire.current = sel.getRangeAt(0).cloneRange();
      const suite: Etat = {
        g: document.queryCommandState('bold'), i: document.queryCommandState('italic'), s: document.queryCommandState('underline'),
        ul: document.queryCommandState('insertUnorderedList'), ol: document.queryCommandState('insertOrderedList'),
      };
      setEtat(avant => ((Object.keys(suite) as (keyof Etat)[]).every(k => avant[k] === suite[k]) ? avant : suite));
    };
    document.addEventListener('selectionchange', suivre);
    return () => document.removeEventListener('selectionchange', suivre);
  }, []);

  const relire = () => {
    const z = zone.current;
    if (!z) return;
    setVide(!z.textContent?.trim() && !z.querySelector('li'));
    onChange(lignesDepuis(z));
  };
  const retrouver = () => {
    const z = zone.current, sel = document.getSelection();
    if (!z) return;
    z.focus();
    if (memoire.current && sel) { sel.removeAllRanges(); sel.addRange(memoire.current); }
  };
  const commande = (nom: string, valeur?: string) => {
    const z = zone.current;
    if (!z) return;
    retrouver();
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand('defaultParagraphSeparator', false, 'div');
    const gardee = nom.startsWith('insert') ? garderSelection(z) : null;
    document.execCommand(nom, false, valeur);
    if (gardee) rendreSelection(z, gardee);
    relire();
  };
  const lier = () => {
    const lien = lienSur(adresse);
    if (!lien) return setRefus('Adresse non reconnue. Exemple : https://cancham.mg');
    if (memoire.current?.collapsed ?? true) return setRefus('Sélectionnez d’abord le texte à transformer en lien.');
    commande('createLink', lien);
    setVolet(false); setAdresse(''); setRefus('');
  };

  return (
    <div>
      {actif && (
        <div className="tr-bar">
          <div role="toolbar" aria-label="Mise en forme du texte" className="tr-tools">
            <Outil libelle="Gras" enfonce={etat.g} onClick={() => commande('bold')}><Icon name="bold" size={16} /></Outil>
            <Outil libelle="Italique" enfonce={etat.i} onClick={() => commande('italic')}><Icon name="italic" size={16} /></Outil>
            <Outil libelle="Souligné" enfonce={etat.s} onClick={() => commande('underline')}><Icon name="underline" size={16} /></Outil>
            <span className="tr-sep" aria-hidden="true" />
            <select className="tr-size" aria-label="Taille du texte" title="Taille du texte" value=""
              onChange={e => commande('fontSize', TAILLE_NAVIGATEUR[(e.target.value === 'normal' ? '' : e.target.value) as Taille | ''])}>
              <option value="" disabled>Taille</option>
              {TAILLES.map(t => <option key={t.nom} value={t.valeur || 'normal'}>{t.nom}</option>)}
            </select>
            <Outil libelle="Lien" enfonce={volet} onClick={() => { setRefus(''); setVolet(!volet); }}><Icon name="link" size={16} /></Outil>
            <span className="tr-sep" aria-hidden="true" />
            <Outil libelle="Liste à puces" enfonce={etat.ul} onClick={() => commande('insertUnorderedList')}><Icon name="ul" size={16} /></Outil>
            <Outil libelle="Liste numérotée" enfonce={etat.ol} onClick={() => commande('insertOrderedList')}><Icon name="ol" size={16} /></Outil>
            <span className="tr-sep" aria-hidden="true" />
            <Outil libelle="Aligner à gauche" onClick={() => commande('justifyLeft')}><Icon name="alignleft" size={16} /></Outil>
            <Outil libelle="Centrer" onClick={() => commande('justifyCenter')}><Icon name="aligncenter" size={16} /></Outil>
            <Outil libelle="Aligner à droite" onClick={() => commande('justifyRight')}><Icon name="alignright" size={16} /></Outil>
          </div>
          <div className="tr-sub">
            <ChoixCouleur libelle="Couleur du texte" onChoisir={c => commande('foreColor', c ?? (zone.current ? enHex(getComputedStyle(zone.current).color) : null) ?? '#0f1d2c')} />
          </div>
          {volet && (
            <div className="tr-sub">
              <div className="row">
                <input type="url" inputMode="url" className="inp grow" aria-label="Adresse du lien" placeholder="https://…" value={adresse} autoFocus
                  onChange={e => setAdresse(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lier(); } }} />
                <button type="button" className="btn sm cta" onClick={lier}>Appliquer</button>
                <button type="button" className="btn sm" onClick={() => { commande('unlink'); setVolet(false); }}>Retirer le lien</button>
              </div>
              {refus && <p className="tr-refus">{refus}</p>}
            </div>
          )}
        </div>
      )}
      <div ref={zone} contentEditable suppressContentEditableWarning role="textbox" aria-multiline aria-label="Texte"
        data-vide={vide ? 'oui' : 'non'} data-invite="Écrivez votre texte…" className="texte-riche tr-zone"
        onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'div')} onInput={relire} onBlur={relire}
        onPaste={e => { e.preventDefault(); const t = e.clipboardData.getData('text/plain'); if (t) document.execCommand('insertText', false, t); }}
        onDrop={e => e.preventDefault()} />
    </div>
  );
}
