// Ce que propose le bouton « Créer » de la barre du haut (et la recherche Ctrl K), depuis n'importe quelle page
export const CREER: [icon: string, label: string, href: string][] = [
  ['users', 'Membre', '/membres?nouveau=1'], ['file', 'Facture', '/paiements?nouveau=1'], ['cal', 'Événement', '/evenements?nouveau=1'],
  ['mail', 'Newsletter', '/newsletter?nouveau=1'], ['chat', 'Message', '/messagerie'], ['clock', 'Rendez-vous', '/rendez-vous?nouveau=1'],
];
