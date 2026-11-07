import type { Metadata } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

// Police de la charte L’Alliée Virtuelle
const brand = Plus_Jakarta_Sans({ variable: '--font-brand', subsets: ['latin'] });
const mono = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'L’Alliée Virtuelle',
  description: 'Back-office de la Chambre de Commerce et de Coopération Canada–Madagascar',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // Charte L’Alliée Virtuelle : fond crème, menu marine, dégradé orange ; suit le mode clair ou sombre de l’ordinateur (app/globals.css)
    <html lang="fr" className={`${brand.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
