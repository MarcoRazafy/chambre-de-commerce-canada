// Texte saisi par un membre (présentation, recherche…) : adresses web et courriels deviennent cliquables, paragraphes conservés
const MOTIF = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]|www\.[^\s<>()]+[^\s<>().,;:!?'"]|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

export default function TexteLie({ texte }: { texte: string }) {
  return (
    <>
      {texte.split(MOTIF).map((p, i) => {
        if (i % 2 === 0) return p;
        if (p.includes('@') && !p.startsWith('http')) return <a key={i} href={`mailto:${p}`}>{p}</a>;
        return <a key={i} href={p.startsWith('http') ? p : `https://${p}`} target="_blank" rel="noopener noreferrer">{p}</a>;
      })}
    </>
  );
}
