import { CheckCircle2, LogIn } from "lucide-react";
import { Pill } from "@/components/ui";
import { ConnexionPaypal } from "@/components/admin/ConnexionPasserelles";
import { retirerPaypal } from "@/lib/actions/parametres";

function LogoPaypal() {
  return (
    <span className="grid place-items-center size-12 shrink-0 rounded-[12px] bg-[#003087]" aria-hidden>
      <span className="text-[26px] font-extrabold italic leading-none text-white">
        P<span className="text-[#009cde] -ml-1.5">P</span>
      </span>
    </span>
  );
}

export function PasserellePaypal({ adresse, gere }: { adresse: string; gere: boolean }) {
  const connecte = Boolean(adresse);

  return (
    <div className={`flex flex-col gap-4 rounded-[var(--radius-m)] border bg-surface p-5 ${connecte ? "border-success/40" : "border-line"}`}>
      <div className="flex items-start gap-3.5">
        <LogoPaypal />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="m-0 text-[16px]">PayPal</h3>
            {connecte ? <Pill tone="ok" icon={<CheckCircle2 size={13} aria-hidden />}>Connecté</Pill> : null}
          </div>
          <p className="m-0 mt-1 text-[13px] text-muted truncate">{connecte ? adresse : "Compte PayPal"}</p>
        </div>
      </div>

      {connecte ? (
        <div className="mt-auto flex flex-wrap gap-2">
          <a href="https://www.paypal.com/signin" target="_blank" rel="noopener noreferrer" className="btn-contour btn-contour-sm text-ink hover:bg-surface-2 no-underline">
            <LogIn size={14} aria-hidden /> Se connecter
          </a>
          {gere ? (
            <form action={retirerPaypal}>
              <button type="submit" className="btn-contour btn-contour-sm text-bad hover:bg-surface-2">Retirer</button>
            </form>
          ) : null}
        </div>
      ) : gere ? (
        <div className="mt-auto">
          <ConnexionPaypal />
        </div>
      ) : null}
    </div>
  );
}
