import { CalendarDays, CheckCircle2, CreditCard, UserPlus, Users } from "lucide-react";

// Illustration du site : l'espace de gestion d'une Chambre, dessiné (pas une capture : aucune donnée réelle)
export function ApercuEspace() {
  const tuiles = [
    { icone: Users, libelle: "Membres", valeur: "128", teinte: "bg-marque-nuit" },
    { icone: CreditCard, libelle: "Cotisations", valeur: "18 400 $", teinte: "bg-marque-vert" },
    { icone: CalendarDays, libelle: "Événements", valeur: "4", teinte: "bg-marque-rouge" },
  ];
  const evenements = [
    { nom: "Petit-déjeuner d’affaires", taux: 78 },
    { nom: "Atelier export", taux: 46 },
  ];

  return (
    <div role="img" aria-label="Aperçu de l’espace de gestion d’une Chambre : membres, cotisations et événements" className="relative select-none">
      <div className="rounded-2xl border border-line bg-white shadow-[0_40px_80px_-36px_rgba(15,29,44,0.45)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 h-10 border-b border-line bg-surface-2">
          <span className="size-2.5 rounded-full bg-[#e5e9ef]" />
          <span className="size-2.5 rounded-full bg-[#e5e9ef]" />
          <span className="size-2.5 rounded-full bg-[#e5e9ef]" />
          <span className="ml-3 h-5 flex-1 max-w-[260px] rounded-full bg-white border border-line" />
        </div>
        <div className="flex">
          <div className="hidden sm:flex w-[128px] shrink-0 flex-col gap-2 p-3" style={{ background: "linear-gradient(180deg, #8c0a0a 0%, #1d2a36 55%, #006b3c 100%)" }}>
            <span className="h-2.5 w-16 rounded bg-white/70 mb-3" />
            <span className="h-7 rounded-md bg-white/20" />
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="h-2.5 rounded bg-white/25 mx-1 my-1.5" style={{ width: `${70 - i * 8}%` }} />
            ))}
          </div>
          <div className="flex-1 min-w-0 p-4 sm:p-5 bg-[#f5f7fa]">
            <span className="block h-2 w-20 rounded bg-[#d5dce5]" />
            <span className="block mt-2 text-[15px] font-bold text-ink">Tableau de bord</span>
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              {tuiles.map(({ icone: Icone, libelle, valeur, teinte }) => (
                <div key={libelle} className="rounded-xl bg-white border border-line p-2.5 sm:p-3">
                  <span className={`grid place-items-center size-7 rounded-lg text-white ${teinte}`}>
                    <Icone size={14} />
                  </span>
                  <span className="block mt-2 text-[10.5px] sm:text-[11px] text-muted truncate">{libelle}</span>
                  <span className="block text-[14px] sm:text-[17px] font-extrabold text-ink tabular-nums truncate">{valeur}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-white border border-line p-3 sm:p-4">
              <span className="block text-[12px] font-bold text-ink mb-2.5">Prochains événements</span>
              {evenements.map((e) => (
                <div key={e.nom} className="mb-2.5 last:mb-0">
                  <div className="flex justify-between text-[11px] text-muted mb-1">
                    <span className="truncate">{e.nom}</span>
                    <span className="tabular-nums">{e.taux} %</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#e8edf2]">
                    <div className="h-full rounded-full bg-marque-vert" style={{ width: `${e.taux}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden sm:flex absolute -left-8 bottom-10 items-center gap-3 rounded-xl bg-white border border-line shadow-[0_18px_40px_-18px_rgba(15,29,44,0.45)] px-4 py-3 flottant">
        <CheckCircle2 size={22} className="text-marque-vert shrink-0" />
        <span>
          <span className="block text-[13px] font-bold text-ink">Cotisation réglée</span>
          <span className="block text-[12px] text-muted">Paiement par carte · 150,00 $</span>
        </span>
      </div>
      <div className="hidden sm:flex absolute -right-6 top-16 items-center gap-3 rounded-xl bg-white border border-line shadow-[0_18px_40px_-18px_rgba(15,29,44,0.45)] px-4 py-3 flottant flottant-2">
        <span className="grid place-items-center size-8 rounded-full bg-accent-soft text-marque-rouge shrink-0">
          <UserPlus size={16} />
        </span>
        <span className="block text-[13px] font-bold text-ink">Nouvelle demande d’adhésion</span>
      </div>
    </div>
  );
}
