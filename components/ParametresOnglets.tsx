'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type Row } from '@/lib/format';
import Icon from './Icon';
import Onglets from './Onglets';
import FacturationSettings from './FacturationSettings';
import ResourcePage from './ResourcePage';
import Journal from './Journal';
import CourrielsReglages from './CourrielsReglages';

// Paramètres : Chambre & facturation, Formules d'adhésion, Secteurs d'activité, Journal d'activité.
// L'équipe est gérée dans « Abonnement & utilisateurs » (mêmes comptes, même page).
export default function ParametresOnglets() {
  const [n, setN] = useState<{ formules?: number; secteurs?: number }>({});
  useEffect(() => {
    Promise.all([api<Row[]>('/api/formules'), api<Row[]>('/api/secteurs')])
      .then(([f, s]) => setN({ formules: f.length, secteurs: s.length })).catch(() => {});
  }, []);
  return (
    <Onglets titre="Paramètres" description="Tout ce qui se règle une fois, réuni ici." onglets={[
      { cle: 'chambre', label: 'Chambre & facturation', contenu: () => <FacturationSettings /> },
      { cle: 'formules', label: 'Formules d’adhésion', n: n.formules, contenu: () => <ResourcePage table="formules" bare /> },
      { cle: 'secteurs', label: 'Secteurs d’activité', n: n.secteurs, contenu: () => <ResourcePage table="secteurs" bare /> },
      { cle: 'courriels', label: 'Courriels', contenu: () => <CourrielsReglages /> },
      { cle: 'journal', label: 'Journal d’activité', contenu: () => <Journal /> },
    ]} actions={<>
      <Link className="btn" href="/abonnement"><Icon name="team" size={16} /> Équipe & abonnement</Link>
      <Link className="btn" href="/profil"><Icon name="user" size={16} /> Mon profil</Link>
    </>} />
  );
}
