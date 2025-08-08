// Fichier: ui/src/components/BankAvatar.tsx
import * as React from "react";
import { BANK_CONFIG } from "@/config/banks";

type Props = {
  bankId?: string | null;
  name?: string | null;
  size?: number; // px
  className?: string;
};

export default function BankAvatar({ bankId, name, size = 30, className }: Props) {
  const bank = bankId ? (BANK_CONFIG as any)[bankId] : null;
  const initials =
    (name?.trim()?.match(/\b[A-ZÀ-Ý]/gi)?.slice(0, 2)?.join("") ||
      name?.trim()?.charAt(0) ||
      (bankId ? bankId.charAt(0) : "?")).toUpperCase();

  const style: React.CSSProperties = bank?.gradient
    ? {
        backgroundImage: `linear-gradient(135deg, ${bank.gradient[0]}, ${bank.gradient[1]})`,
      }
    : {
        background: bank?.color || "var(--color-surface-muted)",
      };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full avatar-ring ${className || ""}`}
      style={{ width: size, height: size, ...style }}
      aria-hidden="true"
      title={name || bankId || "Banque"}
    >
      <span className="text-[0.75rem] font-semibold" style={{ color: "#0b0e14" }}>
        {initials}
      </span>
    </span>
  );
}
