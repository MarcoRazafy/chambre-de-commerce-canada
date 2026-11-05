// Libellés de la bibliothèque, partagés entre le serveur et l'écran
export const CATS: Record<string, string> = { guide: 'Guide', modele: 'Modèle', formation: 'Formation', rapport: 'Rapport' };
export const FMTS: Record<string, string> = { pdf: 'PDF', docx: 'DOCX', video: 'Vidéo', image: 'Photo', page: 'Page' };
export const FMT_ICON: Record<string, string> = { pdf: 'pdf', docx: 'docx', video: 'filevideo', image: 'fileimage', page: 'article' };
export const PROFONDEUR_MAX = 5;
export const MAX_FICHIER_MO = 100;
export const mediaUrl = (id: number | null | undefined) => (id ? `/api/ressources/medias/${id}` : null);
import { relative } from './format';

// « il y a 3 h », « hier » ; au-delà d'une semaine : « le 22 sept. 2026 »
export const quand = (v: string) => relative(v) ?? `le ${new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
export const ariary = (n: number) => `${Number(n).toLocaleString('fr-FR')} Ar`;
