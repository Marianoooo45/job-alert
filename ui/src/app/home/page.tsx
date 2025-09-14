// ui/src/app/home/page.tsx
import { headers } from "next/headers";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import LogosMarquee from "@/components/landing/LogosMarquee";
import StatsStrip from "@/components/landing/StatsStrip";
import ForSchools from "@/components/landing/ForSchools";

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
  const hdrs = headers();
  const host = hdrs.get("host")!;
  const proto = host.startsWith("localhost") ? "http" : "https";
  const res = await fetch(`${proto}://${host}/api/jobs?limit=1&offset=0`, { cache: "no-store" });
  return Number(res.headers.get("X-Total-Count") ?? 0);
}

export default async function HomePage() {
  const total = await fetchTotal();

  return (
    <main className="relative z-[1] container mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* le fond est sous le contenu (z-0 vs z-[1]) */}
      <AuroraBackdrop />

      <Hero />

      <section className="mt-12 sm:mt-16">
        <HowItWorks />
      </section>

      <section className="mt-12 sm:mt-16">
        <LogosMarquee />
      </section>

      <section className="mt-12 sm:mt-16">
        <StatsStrip total={total} />
      </section>

      <section className="mt-12 sm:mt-16">
        <ForSchools />
      </section>
    </main>
  );
}
