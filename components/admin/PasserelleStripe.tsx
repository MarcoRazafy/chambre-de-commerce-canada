import { CheckCircle2, LogIn } from "lucide-react";
import { Pill } from "@/components/ui";
import { connecterStripe } from "@/lib/actions/parametres";

function LogoStripe() {
  return (
    <span className="grid place-items-center size-12 shrink-0 rounded-[12px] bg-[#635BFF]" aria-hidden>
      <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff">
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
      </svg>
    </span>
  );
}

export function PasserelleStripe({
  disponible,
  compte,
  gere,
}: {
  disponible: boolean;
  compte: { stripeCompteId: string | null; stripeCompteActif: boolean; stripeComptePays: string | null } | null;
  gere: boolean;
}) {
  const connecte = disponible && !!compte?.stripeCompteActif;
  const enCours = disponible && !connecte && !!compte?.stripeCompteId;

  return (
    <div className={`flex flex-col gap-4 rounded-[var(--radius-m)] border bg-surface p-5 ${connecte ? "border-success/40" : "border-line"}`}>
      <div className="flex items-start gap-3.5">
        <LogoStripe />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="m-0 text-[16px]">Stripe</h3>
            {connecte ? (
              <Pill tone="ok" icon={<CheckCircle2 size={13} aria-hidden />}>Connecté</Pill>
            ) : enCours ? (
              <Pill tone="warn">Inscription à terminer</Pill>
            ) : !disponible ? (
              <Pill tone="muted">Indisponible</Pill>
            ) : null}
          </div>
          <p className="m-0 mt-1 text-[13px] text-muted">Carte bancaire</p>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        {connecte ? (
          <a href="https://dashboard.stripe.com/login" target="_blank" rel="noopener noreferrer" className="btn-contour btn-contour-sm text-ink hover:bg-surface-2 no-underline">
            <LogIn size={14} aria-hidden /> Se connecter
          </a>
        ) : gere && disponible ? (
          <form action={connecterStripe}>
            <button type="submit" className="btn-action btn-action-sm">{enCours ? "Terminer l’inscription" : "Connecter"}</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
