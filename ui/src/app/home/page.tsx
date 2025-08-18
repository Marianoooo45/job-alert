// ui/src/app/home/page.tsx
import { headers } from "next/headers";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import LogosMarquee from "@/components/landing/LogosMarquee";
import StatsStrip from "@/components/landing/StatsStrip";
import ForSchools from "@/components/landing/ForSchools";

export const dynamic = "force-dynamic";

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
    <main className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
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
