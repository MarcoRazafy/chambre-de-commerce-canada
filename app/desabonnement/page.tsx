import { prisma } from "@/lib/db";
import { signatureValide } from "@/lib/newsletter";

// Lien en bas de la lettre d'information : désabonne l'adresse si la signature est bonne
export default async function Desabonnement({ searchParams }: { searchParams: Promise<{ e?: string; s?: string }> }) {
  const { e = "", s = "" } = await searchParams;
  const ok = !!e && !!s && signatureValide(e, s);
  if (ok) await prisma.abonne.updateMany({ where: { email: e.toLowerCase(), desabonneLe: null }, data: { desabonneLe: new Date() } });
  return (
    <main className="min-h-screen grid place-items-center p-6 bg-surface-2">
      <div className="max-w-[440px] rounded-[var(--radius-l)] border border-line bg-surface p-8 text-center">
        <h1 className="text-[22px] m-0 mb-2">{ok ? "Vous êtes désabonné(e)" : "Lien invalide"}</h1>
        <p className="m-0 text-[14px] text-muted">
          {ok ? `${e} ne recevra plus la lettre d’information de la CanCham.` : "Ce lien de désabonnement n’est pas valide. Écrivez-nous et nous vous retirerons de la liste."}
        </p>
      </div>
    </main>
  );
}
