'use client';
import { createContext, useContext } from 'react';
import { mediaMembre, mediaUrl, news, newsMembre } from '@/lib/news-client';

// Les composants d'actualité (publication, commentaires, réactions) servent à l'équipe et à l'espace membre :
// le contexte dit à quelles adresses parler et quels liens ouvrir.
type Contexte = {
  api: Pick<typeof news, 'publish' | 'remove' | 'react' | 'comment' | 'editComment' | 'deleteComment' | 'reactComment'>;
  media: (id: number) => string;
  espace: boolean;
  ficheMembre: (id: number) => string;
  sansAuteur: string;   // nom affiché pour une actualité sans auteur
};
const EQUIPE: Contexte = { api: news, media: mediaUrl, espace: false, ficheMembre: id => `/membres/${id}`, sansAuteur: 'L’Alliée Virtuelle' };
export const ESPACE: Contexte = { api: newsMembre, media: mediaMembre, espace: true, ficheMembre: id => `/espace/annuaire/${id}`, sansAuteur: 'CanCham Madagascar' };
const Ctx = createContext<Contexte>(EQUIPE);
export const NewsContexte = Ctx.Provider;
export const useNewsCtx = () => useContext(Ctx);
