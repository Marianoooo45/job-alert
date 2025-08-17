// ui/src/app/home/page.tsx
import HeroHome from "@/components/landing/HeroHome";
import LogoMarquee from "@/components/landing/LogoMarquee";
import StatsStrip from "@/components/landing/StatsStrip";
import FeatureCards from "@/components/landing/FeatureCards";
import SchoolsROI from "@/components/landing/SchoolsROI";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <HeroHome />

      <section className="mt-10">
        <LogoMarquee />
      </section>

      <section className="mt-8">
        <StatsStrip />
      </section>

      <section className="mt-8">
        <FeatureCards />
      </section>

      <section className="mt-10">
        <SchoolsROI />
      </section>
    </main>
  );
}
