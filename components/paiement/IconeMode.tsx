import Image from "next/image";
import {
  ArrowRightLeft,
  CreditCard,
  HandCoins,
  Landmark,
  Smartphone,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ModeReglement } from "@/lib/modes-reglement";

const LOGOS: Partial<
  Record<ModeReglement, { src: string; largeur: number; hauteur: number }>
> = {
  mvola: { src: "/paiement/mvola.png", largeur: 811, hauteur: 378 },
  orange_money: {
    src: "/paiement/orange-money.png",
    largeur: 738,
    hauteur: 366,
  },
  airtel_money: {
    src: "/paiement/airtel-money.png",
    largeur: 520,
    hauteur: 229,
  },
  virement: { src: "/paiement/virement.jpg", largeur: 246, hauteur: 209 },
  depot: { src: "/paiement/depot.png", largeur: 225, hauteur: 225 },
  especes: { src: "/paiement/especes.jpeg", largeur: 424, hauteur: 391 },
  carte: { src: "/paiement/carte.jpeg", largeur: 738, hauteur: 363 },
};

const ICONES: Record<ModeReglement, LucideIcon> = {
  mvola: Smartphone,
  orange_money: Smartphone,
  airtel_money: Smartphone,
  virement: ArrowRightLeft,
  depot: Landmark,
  especes: HandCoins,
  carte: CreditCard,
  plateforme: Wallet,
  paypal: Wallet,
};

export function IconeMode({
  mode,
  size = 16,
  className = "text-accent",
}: {
  mode: ModeReglement;
  size?: number;
  className?: string;
}) {
  const Icone = ICONES[mode];
  return <Icone size={size} className={`shrink-0 ${className}`} aria-hidden />;
}

export function VisuelMode({ mode }: { mode: ModeReglement }) {
  const logo = LOGOS[mode];
  return (
    <span className="flex h-12 items-center justify-center">
      {mode === "paypal" ? (
        <span className="text-[26px] font-extrabold italic tracking-[-0.02em]" aria-hidden>
          <span style={{ color: "#003087" }}>Pay</span>
          <span style={{ color: "#009cde" }}>Pal</span>
        </span>
      ) : logo ? (
        <Image
          src={logo.src}
          alt=""
          width={logo.largeur}
          height={logo.hauteur}
          className="h-12 w-auto max-w-[140px] object-contain"
        />
      ) : (
        <IconeMode mode={mode} size={28} />
      )}
    </span>
  );
}
