// ui/src/app/home/page.tsx
// -------------------------------------------------------------

import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import LogosMarquee from "@/components/landing/LogosMarquee";
import StatsStrip from "@/components/landing/StatsStrip";
import ForSchools from "@/components/landing/ForSchools";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <Hero />

      <section className="mt-12 sm:mt-16">
        <HowItWorks />
      </section>

      <section className="mt-12 sm:mt-16">
        <LogosMarquee />
      </section>

      <section className="mt-12 sm:mt-16">
        <StatsStrip />
      </section>

      <section className="mt-12 sm:mt-16">
        <ForSchools />
      </section>
    </main>
  );
}
