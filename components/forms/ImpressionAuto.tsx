"use client";

import { useEffect } from "react";

// Ouvre la fenêtre d'impression (enregistrer en PDF) dès l'affichage de la page
export function ImpressionAuto() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return null;
}
