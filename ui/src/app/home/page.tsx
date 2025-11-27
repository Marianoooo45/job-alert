// ui/src/app/home/page.tsx
import { headers } from "next/headers";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import LogosMarquee from "@/components/landing/LogosMarquee";
import StatsStrip from "@/components/landing/StatsStrip";
import ForSchools from "@/components/landing/ForSchools";
import { Lightbulb, Radar, Sparkles, Workflow } from "lucide-react";

export const dynamic = "force-dynamic";

/** Fond Aurora — visible uniquement quand html n’a PAS .dark */
function AuroraBackdrop() {
  return (
    <>
      <div className="aurora-dyn" aria-hidden="true" />
      <style>{`
        /* ----- Light only ----- */
        html.dark .aurora-dyn { display: none; }

        html:not(.dark) .aurora-dyn {
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          overflow: hidden;
          background: transparent;
        }

        /* ===== LAYER 1: base halos (coins + centre) ===== */
        html:not(.dark) .aurora-dyn::before {
          content: "";
          position: absolute; inset: -10% -10% -10% -10%;
          will-change: transform, filter, opacity, background-position;
          background:
            /* halo central rose */
            radial-gradient(1100px 720px at 50% 68%, rgba(244,114,182,.22), transparent 65%),
            /* bleu clair horizontal + coins boostés */
            radial-gradient(1400px 900px at 50% 52%, rgba(59,130,246,.22), transparent 75%),
            radial-gradient(900px 900px at 0% 0%, rgba(59,130,246,.38), transparent 70%),
            radial-gradient(900px 900px at 100% 0%, rgba(59,130,246,.36), transparent 70%),
            radial-gradient(900px 900px at 0% 100%, rgba(34,211,238,.38), transparent 70%),
            radial-gradient(900px 900px at 100% 100%, rgba(34,211,238,.36), transparent 70%),
            /* rose haut + violet bas */
            radial-gradient(1200px 760px at 50% -10%, rgba(236,72,153,.16), transparent 65%),
            radial-gradient(1200px 760px at 50% 110%, rgba(99,102,241,.16), transparent 65%);
          background-repeat: no-repeat;
          background-attachment: fixed;
          background-blend-mode: screen;
          opacity: .95;
          filter: saturate(1.25) brightness(1.05);
          animation: auroraDrift 14s ease-in-out infinite alternate,
                     auroraPulse 6s ease-in-out infinite;
        }

        /* ===== LAYER 2: filets coniques qui glissent (northern lights) ===== */
        html:not(.dark) .aurora-dyn::after {
          content: "";
          position: absolute; inset: -15% -15% -15% -15%;
          will-change: transform, filter, opacity, background-position;
          background:
            conic-gradient(from 210deg at 30% 40%, rgba(56,189,248,.14), rgba(216,180,254,.10), transparent 60%),
            conic-gradient(from 60deg at 70% 60%, rgba(147,197,253,.12), rgba(244,114,182,.10), transparent 62%),
            conic-gradient(from 130deg at 50% 20%, rgba(59,130,246,.12), transparent 55%);
          mix-blend-mode: screen;
          animation: auroraSweep 10s ease-in-out infinite alternate,
                     auroraTilt 16s ease-in-out infinite;
        }

        /* ===== LAYER 3: nappe douce supplémentaire en dessous ===== */
        html:not(.dark) .aurora-dyn .layer3 { display:none; } /* hook si tu veux un vrai 3e DOM element */
        @supports (backdrop-filter: blur(1px)) {
          html:not(.dark) .aurora-dyn { backdrop-filter: none; }
        }

        /* ---- Animations ---- */
        @keyframes auroraDrift {
          50% {
            background-position:
              52% 70%,
              50% 54%, 0% 2%, 98% 0%, 2% 98%, 98% 98%,
              50% -6%, 50% 106%;
            filter: hue-rotate(12deg) saturate(1.22) brightness(1.08);
            transform: translateY(-1.2%) scale(1.015);
          }
        }

        @keyframes auroraPulse {
          0%, 100% { opacity: .92; transform: scale(1); }
          50%      { opacity: .99; transform: scale(1.02); }
        }

        @keyframes auroraSweep {
          0%   { background-position: 0% 0%, 100% 100%, 50% 0%; opacity:.55; }
          50%  { background-position: 20% 10%, 80% 85%, 46% 8%; opacity:.72; }
          100% { background-position: 0% 0%, 100% 100%, 50% 0%; opacity:.60; }
        }

        @keyframes auroraTilt {
          0%   { transform: rotate(-0.8deg) translateY(0%); }
          50%  { transform: rotate(0.9deg)  translateY(-1.2%); }
          100% { transform: rotate(-0.8deg) translateY(0%); }
        }

        /* Respecte les préférences d’accessibilité */
        @media (prefers-reduced-motion: reduce) {
          html:not(.dark) .aurora-dyn::before,
          html:not(.dark) .aurora-dyn::after {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </>
  );
}

async function fetchTotal() {
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0");
  const proto = isLocal ? "http" : "https";
  const res = await fetch(`${proto}://${host}/api/jobs?limit=1&offset=0`, { cache: "no-store" });
  return Number(res.headers.get("X-Total-Count") ?? 0);
}

function ExperienceGrid() {
  const tiles = [
    {
      icon: Lightbulb,
      title: "Vue consolidée",
      text: "Toutes vos offres, alertes et candidatures au même endroit, sans onglets multiples.",
    },
    {
      icon: Workflow,
      title: "Relances programmées",
      text: "Planifie les follow-up directement depuis l’alerte et synchronise avec ton agenda.",
    },
    {
      icon: Radar,
      title: "Veille pilotée",
      text: "Les filtres avancés et l’IA de classement réduisent le bruit et priorisent ce qui compte.",
    },
    {
      icon: Sparkles,
      title: "Expérience fluide",
      text: "Interface modernisée, lecture confortable et actions accessibles au clavier.",
    },
  ];

  return (
    <section className="rounded-3xl border border-border bg-card/70 p-6 shadow-[0_20px_100px_-70px_rgba(15,23,42,1)] sm:p-8">
      <div className="flex flex-col gap-2 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Nouveau parcours</p>
          <h2 className="text-2xl font-semibold sm:text-3xl">Pensé pour passer de l’idée à l’action</h2>
        </div>
        <p className="max-w-lg text-sm text-muted-foreground">
          Chaque bloc est conçu pour clarifier la prochaine étape : repérer, déclencher, relancer.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map(({ icon: Icon, title, text }) => (
          <div key={title} className="relative overflow-hidden rounded-2xl border border-border bg-muted/30 p-5">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-lg font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">{text}</p>
            <div className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.4),rgba(0,0,0,0.95))]">
              <div className="absolute right-[-15%] top-[-10%] h-24 w-24 rounded-full bg-primary/10 blur-3xl" aria-hidden />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-primary/10 to-secondary/15 p-6 text-center shadow-[0_20px_100px_-70px_rgba(15,23,42,1)] sm:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.2),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.18),transparent_40%)]" aria-hidden />
      <div className="relative space-y-4">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Prêt à tester ?</p>
        <h3 className="text-2xl font-semibold sm:text-3xl">Crée ton alerte et garde l’essentiel en vue</h3>
        <p className="text-sm text-muted-foreground">
          Lance une veille en moins de deux minutes et laisse le tableau de bord orchestrer les prochaines actions.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <a
            href="/inbox"
            className="inline-flex items-center justify-center rounded-xl bg-background px-4 py-2.5 text-sm font-semibold shadow-[0_20px_60px_-45px_rgba(15,23,42,0.6)] transition hover:translate-y-[-1px]"
          >
            Créer une alerte
          </a>
          <a
            href="/offers"
            className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground/90 backdrop-blur-sm transition hover:bg-background/70"
          >
            Parcourir les offres
          </a>
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const total = await fetchTotal();

  return (
    <main className="relative z-[1] container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* le fond est sous le contenu (z-0 vs z-[1]) */}
      <AuroraBackdrop />

      <div className="grid gap-12 sm:gap-16">
        <Hero />

        <ExperienceGrid />

        <HowItWorks />

        <LogosMarquee />

        <StatsStrip total={total} />

        <ForSchools />

        <CTASection />
      </div>
    </main>
  );
}
