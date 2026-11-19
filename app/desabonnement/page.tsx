import { confirmerDesabonnement } from "@/lib/actions/desabonnement";
import { signatureValide } from "@/lib/newsletter";

export default async function Desabonnement({ searchParams }: { searchParams: Promise<{ e?: string; s?: string; c?: string; fait?: string }> }) {
  const { e = "", s = "", c = "", fait } = await searchParams;
  const ok = !!e && !!s && c.length <= 64 && signatureValide(e, s, c);
  const titre = !ok ? "Lien invalide" : fait ? "Vous êtes désabonné(e)" : "Se désabonner de la lettre ?";
  return (
    <main className="min-h-screen grid place-items-center p-6 bg-surface-2">
      <div className="max-w-[440px] w-full rounded-[var(--radius-l)] border border-line bg-surface p-8 text-center">
        <h1 className="text-[22px] m-0 mb-2">{titre}</h1>
        <p className="m-0 text-[14px] text-muted">
          {ok ? `${e} ne recevra plus la lettre d’information.` : "Ce lien de désabonnement n’est pas valide. Écrivez-nous et nous vous retirerons de la liste."}
        </p>
        {ok && !fait ? (
          <form action={confirmerDesabonnement} className="mt-6">
            <input type="hidden" name="e" value={e} />
            <input type="hidden" name="s" value={s} />
            <input type="hidden" name="c" value={c} />
            <button type="submit" className="btn-action w-full">Confirmer le désabonnement</button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
