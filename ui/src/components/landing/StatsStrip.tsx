// ui/src/components/landing/StatsStrip.tsx
"use client";

import CountUp from "@/components/motion/CountUp";

const StatCard = ({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) => (
  <div className="flex-1 rounded-xl border border-border bg-surface p-6 text-center">
    <div className="text-4xl font-semibold">
      <CountUp to={value} suffix={suffix} />
    </div>
    <div className="text-sm text-muted-foreground mt-1">{label}</div>
  </div>
);

export default function StatsStrip() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard label="Offres actives" value={6500} />
      <StatCard label="Banques" value={40} />
      <StatCard label="Pays" value={55} />
    </div>
  );
}
