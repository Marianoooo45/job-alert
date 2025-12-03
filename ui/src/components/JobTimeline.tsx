import { SavedJob } from "@/lib/tracker";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react";

export default function JobTimeline({ job }: { job: SavedJob }) {
  const steps = [
    { key: "applied", label: "Candidature envoyée", date: job.appliedAt, done: true },
    { key: "responded", label: "Réponse reçue", date: job.respondedAt, done: !!job.respondedAt },
    { key: "interview", label: "Premier entretien", done: (job.interviews ?? 0) > 0 },
    { key: "offer", label: "Offre reçue", done: job.stage === "offer" },
  ];

  if (job.stage === "rejected") {
    steps.push({ key: "rejected", label: "Candidature refusée", done: true, date: undefined });
  }

  return (
    <div className="pl-2 py-2">
      <div className="space-y-0">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const isRejected = step.key === "rejected";
          
          return (
            <div key={step.key} className="relative flex gap-4">
              {/* Ligne verticale : bg-white/10 -> bg-border */}
              {!isLast && (
                <div className="absolute left-[9px] top-6 bottom-[-8px] w-px bg-border" />
              )}

              {/* Icone Noeud : bg-[#0A0A0A] -> bg-card */}
              <div className="relative z-10 pt-1">
                {isRejected ? (
                  <div className="bg-card rounded-full ring-2 ring-card">
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                ) : step.done ? (
                  <div className="bg-card rounded-full ring-2 ring-card">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                ) : (
                  <div className="bg-card rounded-full ring-2 ring-card">
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="pb-6">
                <p className={`text-sm font-medium ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {format(new Date(Number(step.date)), "dd MMM HH:mm", { locale: fr })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}