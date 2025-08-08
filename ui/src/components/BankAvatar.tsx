"use client";

import * as React from "react";
import Image from "next/image";
import { BANK_CONFIG } from "@/config/banks";
import { BANK_LOGO_DOMAINS } from "@/config/bankLogos";

type Props = {
  bankId?: string | null;
  name?: string | null;
  size?: number; // px
  className?: string;
};

// slugify robuste: retire accents, remplace & par "and", espaces -> _
function slugify(s?: string | null): string | undefined {
  if (!s) return undefined;
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export default function BankAvatar({ bankId, name, size = 30, className }: Props) {
  const bank = bankId ? (BANK_CONFIG as any)[bankId] : null;
  const initials =
    (name?.trim()?.match(/\b[A-ZÀ-Ý]/gi)?.slice(0, 2)?.join("") ||
      name?.trim()?.charAt(0) ||
      (bankId ? bankId.charAt(0) : "?")).toUpperCase();

  // candidates de lookup: id brut, id slugifié, nom brut, nom slugifié
  const candidates = Array.from(
    new Set([bankId, slugify(bankId), name, slugify(name)].filter(Boolean) as string[])
  );

  // domaine Clearbit
  let domain: string | undefined;
  for (const key of candidates) {
    if (BANK_LOGO_DOMAINS[key]) {
      domain = BANK_LOGO_DOMAINS[key];
      break;
    }
  }

  const remoteSrc = domain ? `https://logo.clearbit.com/${domain}?size=${Math.round(size * 2)}` : undefined;

  // fallback local: /public/logos/<slug>.png si dispo
  const localSlug = slugify(bankId) || slugify(name);
  const localSrc = localSlug ? `/logos/${localSlug}.png` : undefined;

  const [brokenRemote, setBrokenRemote] = React.useState(false);
  const [brokenLocal, setBrokenLocal] = React.useState(false);

  const gradientStyle: React.CSSProperties = bank?.gradient
    ? { backgroundImage: `linear-gradient(135deg, ${bank.gradient[0]}, ${bank.gradient[1]})` }
    : { background: bank?.color || "var(--color-surface-muted)" };

  const showRemote = remoteSrc && !brokenRemote;
  const showLocal = !showRemote && localSrc && !brokenLocal;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full avatar-ring overflow-hidden ${className || ""}`}
      style={{ width: size, height: size }}
      title={name || bankId || "Banque"}
      aria-label={name || bankId || "Banque"}
    >
      {showRemote ? (
        <Image
          src={remoteSrc!}
          alt={name || bankId || "Bank"}
          width={size}
          height={size}
          onError={() => setBrokenRemote(true)}
          className="object-contain"
          priority={false}
        />
      ) : showLocal ? (
        <Image
          src={localSrc!}
          alt={name || bankId || "Bank"}
          width={size}
          height={size}
          onError={() => setBrokenLocal(true)}
          className="object-contain"
          priority={false}
        />
      ) : (
        <span className="w-full h-full grid place-items-center" style={gradientStyle}>
          <span className="text-[0.75rem] font-semibold" style={{ color: "#0b0e14" }}>
            {initials}
          </span>
        </span>
      )}
    </span>
  );
}
