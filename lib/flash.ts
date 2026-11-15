import { redirect } from "next/navigation";

function rediriger(path: string, message: string, erreur: boolean): never {
  // Le message va avant l'ancre éventuelle (« /page#bloc »)
  const [chemin, ancre] = path.split("#");
  const sep = chemin.includes("?") ? "&" : "?";
  redirect(
    `${chemin}${sep}msg=${encodeURIComponent(message)}${erreur ? "&ton=erreur" : ""}${ancre ? `#${ancre}` : ""}`,
  );
}

export function redirectWithFlash(path: string, message: string): never {
  rediriger(path, message, false);
}

export function redirectWithErreur(path: string, message: string): never {
  rediriger(path, message, true);
}
