import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { fileFor } from '@/lib/messaging';

// Pièce jointe : affichée dans la page pour les images, vidéos, sons et PDF, téléchargée sinon (?dl=1 force le téléchargement).
// Gère les requêtes partielles (Range) pour pouvoir avancer dans une vidéo.
const INLINE = /^(image\/(png|jpe?g|gif|webp|avif)|video\/|audio\/|application\/pdf)/;

export async function GET(req: Request, { params }: { params: Promise<{ fid: string }> }) {
  const fid = num((await params).fid);
  if (Number.isNaN(fid)) return notFound();
  return withUser(async u => {
    const f = await fileFor(u, fid);
    const buf = f.contenu as Buffer, total = buf.length;
    const inline = INLINE.test(f.type) && !new URL(req.url).searchParams.has('dl');
    const headers: Record<string, string> = {
      'Content-Type': inline ? f.type : 'application/octet-stream',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(f.nom)}`,
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    };
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') ?? '');
    if (range && (range[1] || range[2])) {
      const start = range[1] ? Number(range[1]) : Math.max(0, total - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), total - 1) : total - 1;
      if (start >= total || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
      return new Response(new Uint8Array(buf.subarray(start, end + 1)), { status: 206, headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': String(end - start + 1) } });
    }
    return new Response(new Uint8Array(buf), { headers: { ...headers, 'Content-Length': String(total) } });
  });
}
