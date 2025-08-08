// ui/src/components/JobTimeline.tsx
"use client";

import { motion } from "framer-motion";
import {
  Star,
  FileText,
  Phone,
  Users,
  Trophy,
  XCircle,
  Clock3,
  MessageSquare,
} from "lucide-react";
import type { SavedJob } from "@/lib/tracker";

function fmt(ts?: number | string) {
  if (!ts) return undefined;
  const d = new Date(Number(ts));
  if (isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

type TimelineItem = {
  icon: React.ReactNode;
  label: string;
  date?: string;
  active?: boolean;
  accent?: "primary" | "secondary" | "danger" | "muted";
};

export default function JobTimeline({ job }: { job: SavedJob }) {
  const items: TimelineItem[] = [];

  // Favori
  if (job.status === "shortlist") {
    items.push({
      icon: <Star className="w-4 h-4" />,
      label: "Ajouté aux favoris",
      // pas de date dans le modèle: on ne l'affiche pas
      accent: "secondary",
      active: true,
    });
  }

  // Candidature
  if (job.status === "applied" || job.appliedAt) {
    items.push({
      icon: <FileText className="w-4 h-4" />,
      label: "Candidature envoyée",
      date: fmt(job.appliedAt),
      accent: "primary",
      active: true,
    });
  }

  // Étapes (stage)
  const stage = job.stage;
  const stageOrder = ["applied", "phone", "interview", "final", "offer", "rejected"] as const;

  const stageToItem: Record<string, Omit<TimelineItem, "active">> = {
    phone: { icon: <Phone className="w-4 h-4" />, label: "Entretien téléphonique", accent: "primary" },
    interview: { icon: <Users className="w-4 h-4" />, label: "Entretien(s)", accent: "primary" },
    final: { icon: <Trophy className="w-4 h-4" />, label: "Final round", accent: "primary" },
    offer: { icon: <Trophy className="w-4 h-4" />, label: "Offre reçue", accent: "secondary" },
    rejected: { icon: <XCircle className="w-4 h-4" />, label: "Refus", accent: "danger" },
  };

  for (const s of stageOrder) {
    if (s === "applied") continue; // déjà ajouté
    if (!stage || !stageToItem[s]) continue;
    // Actif si on a atteint ou dépassé ce stage
    const active =
      stage === s ||
      (s !== "rejected" && stageOrder.indexOf(stage as any) > stageOrder.indexOf(s as any));

    if (active) {
      items.push({ ...stageToItem[s], active: true });
    }
  }

  // Réponse / feedback (respondedAt)
  if (job.respondedAt) {
    items.push({
      icon: <MessageSquare className="w-4 h-4" />,
      label: "Réponse reçue",
      date: fmt(job.respondedAt),
      accent: "secondary",
      active: true,
    });
  }

  // Entretiens (compteur)
  if (job.interviews && job.interviews > 0) {
    items.push({
      icon: <Clock3 className="w-4 h-4" />,
      label: `${job.interviews} entretien(s) complété(s)`,
      accent: "primary",
      active: true,
    });
  }

  // Style helpers
  const dotClass = (accent?: TimelineItem["accent"]) =>
    `relative z-10 grid place-items-center w-6 h-6 rounded-full border ${
      accent === "secondary"
        ? "bg-secondary border-secondary text-background shadow-[var(--glow-strong)]"
        : accent === "danger"
        ? "bg-destructive border-destructive text-background"
        : accent === "muted"
        ? "bg-card border-border text-foreground/70"
        : "bg-primary border-primary text-background shadow-[var(--glow-weak)]"
    }`;

  return (
    <div className="relative pl-6">
      {/* vertical line */}
      <div className="absolute left-3 top-0 bottom-0 w-px bg-[color-mix(in_oklab,var(--color-primary)_35%,transparent)] opacity-60" />
      <ul className="space-y-3">
        {items.length === 0 ? (
          <li className="text-sm text-muted-foreground">Aucune activité enregistrée pour l’instant.</li>
        ) : (
          items.map((it, i) => (
            <motion.li
              key={i}
              className="relative flex items-start gap-3"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.25 }}
            >
              <div className={dotClass(it.accent)}>{it.icon}</div>
              <div className="pt-0.5">
                <div className="text-sm">
                  {it.label}{" "}
                  {it.date && <span className="text-muted-foreground">— {it.date}</span>}
                </div>
              </div>
            </motion.li>
          ))
        )}
      </ul>
    </div>
  );
}
