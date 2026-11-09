// Invitation de calendrier (.ics) : s'ajoute à Google Agenda, Outlook, Apple Calendrier…
// Sans dépendance au serveur.

const echapper = (v: string) => v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);
const horodatage = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// Les lignes de plus de 75 octets se replient (RFC 5545)
function plier(ligne: string): string {
  const morceaux: string[] = [];
  let reste = ligne;
  while (Buffer.byteLength(reste) > 75) {
    let n = 75;
    while (Buffer.byteLength(reste.slice(0, n)) > 75) n--;
    morceaux.push(reste.slice(0, n));
    reste = ` ${reste.slice(n)}`;
  }
  morceaux.push(reste);
  return morceaux.join("\r\n");
}

export function invitationIcs(e: {
  uid: string;
  debut: Date;
  fin: Date;
  titre: string;
  description?: string | null;
  lieu?: string | null;
  url?: string | null;
  annule?: boolean;
  maintenant?: Date;
}): string {
  const lignes = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CanCham Madagascar//Rendez-vous//FR",
    "CALSCALE:GREGORIAN",
    `METHOD:${e.annule ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${e.uid}@cancham`,
    `DTSTAMP:${horodatage(e.maintenant ?? new Date())}`,
    `DTSTART:${horodatage(e.debut)}`,
    `DTEND:${horodatage(e.fin)}`,
    `SUMMARY:${echapper(e.titre)}`,
    ...(e.description ? [`DESCRIPTION:${echapper(e.description)}`] : []),
    ...(e.lieu ? [`LOCATION:${echapper(e.lieu)}`] : []),
    ...(e.url ? [`URL:${e.url}`] : []),
    `STATUS:${e.annule ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lignes.map(plier).join("\r\n") + "\r\n";
}
