// ui/src/components/BankAvatar.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { BANK_CONFIG } from "@/config/banks";

type Props = {
  bankId?: string | null;
  name?: string | null;
  size?: number; // px
  className?: string;
};

const DOMAIN_MAP: Record<string, string> = {
  // 🔧 ADAPTE LES CLÉS À TES IDS (job.source / BANK_CONFIG)
  bnp_paribas: "bnpparibas.com",
  societe_generale: "societegenerale.com",
  credit_agricole: "credit-agricole.com",
  ca_cib: "ca-cib.com",
  natixis: "natixis.com",
  bpce: "groupebpce.com",
  hsbc: "hsbc.com",
  barclays: "barclays.com",
  ubs: "ubs.com",
  jpmorgan: "jpmorganchase.com",
  goldman_sachs: "goldmansachs.com",
  morgan_stanley: "morganstanley.com",
  santander: "santander.com",
  bbva: "bbva.com",
  boursorama: "boursorama.com",
  la_banque_postale: "labanquepostale.fr",
  // …ajoute ceux que tu utilises
};

export default function BankAvatar({ bankId, name, size = 30, className }: Props) {
  const bank = bankId ? (BANK_CONFIG as any)[bankId] : null;
  const initials =
    (name?.trim()?.match(/\b[A-ZÀ-Ý]/gi)?.slice(0, 2)?.join("") ||
      name?.trim()?.charAt(0) ||
      (bankId ? bankId.charAt(0) : "?")).toUpperCase();

  const [broken, setBroken] = React.useState(false);
  const domain = bankId ? DOMAIN_MAP[bankId] : undefined;
  const src = domain ? `https://logo.clearbit.com/${domain}?size=${Math.round(size * 2)}` : undefined;

  const gradientStyle: React.CSSProperties = bank?.gradient
    ? { backgroundImage: `linear-gradient(135deg, ${bank.gradient[0]}, ${bank.gradient[1]})` }
    : { background: bank?.color || "var(--color-surface-muted)" };

  const showFallback = broken || !src;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full avatar-ring overflow-hidden ${className || ""}`}
      style={{ width: size, height: size }}
      title={name || bankId || "Banque"}
      aria-label={name || bankId || "Banque"}
    >
      {showFallback ? (
        <span className="w-full h-full grid place-items-center" style={gradientStyle}>
          <span className="text-[0.75rem] font-semibold" style={{ color: "#0b0e14" }}>
            {initials}
          </span>
        </span>
      ) : (
        <Image
          src={src}
          alt={name || bankId || "Bank"}
          width={size}
          height={size}
          onError={() => setBroken(true)}
          className="object-contain"
          priority={false}
        />
      )}
    </span>
  );
}
