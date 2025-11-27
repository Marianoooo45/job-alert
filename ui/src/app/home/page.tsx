// ui/src/app/home/page.tsx
import { headers } from "next/headers";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import LogosMarquee from "@/components/landing/LogosMarquee";
import StatsStrip from "@/components/landing/StatsStrip";
import ForSchools from "@/components/landing/ForSchools";

export const dynamic = "force-dynamic";

/** Fond statique nuit : sobrio-corporate (pas d’aurora flashy) */
function NightBackdrop() {
  return (
    <>
      <div className="night-backdrop" aria-hidden="true" />
      <style>{`
        .night-backdrop {
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background:
            radial-gradient(120% 80% at 80% 6%, rgba(40,64,118,.34), transparent 58%),
            radial-gradient(110% 70% at 16% 14%, rgba(71,55,124,.28), transparent 52%),
            linear-gradient(180deg, rgba(4,8,16,.94) 0%, rgba(6,10,18,.96) 28%, rgba(8,12,22,.98) 100%);
          mix-blend-mode: normal;
        }
      `}</style>
    </>
  );
}



async function fetchTotal() {
  const hdrs = await headers();
  const host = hdrs.get("host")!;
  const isLocal = host.startsWith("localhost") || host.startsWith("127.");
  const proto = isLocal ? "http" : "https";
  const res = await fetch(`${proto}://${host}/api/jobs?limit=1&offset=0`, { cache: "no-store" });
  return Number(res.headers.get("X-Total-Count") ?? 0);
}

export default async function HomePage() {
  const total = await fetchTotal();

  return (
    <main className="relative z-[1] container mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* le fond est sous le contenu (z-0 vs z-[1]) */}
      <NightBackdrop />

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
