import type { Metadata } from 'next';
import { JetBrains_Mono, Montserrat } from 'next/font/google';
import './globals.css';

// Police de la charte L’Alliée Virtuelle
const brand = Montserrat({ variable: '--font-brand', subsets: ['latin'] });
const mono = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'L’Alliée Virtuelle',
  description: 'Back-office de la Chambre de Commerce et de Coopération Canada–Madagascar',
};

// Thème appliqué avant l'affichage (pas d'éclair de fond clair) : le choix fait avec le bouton lune,
// sinon celui de l'ordinateur (mode sombre du système), comme Facebook
const THEME = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.dataset.theme='dark'}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="fr" className={`${brand.variable} ${mono.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME }} /></head>
      <body>{children}</body>
    </html>
  );
}
