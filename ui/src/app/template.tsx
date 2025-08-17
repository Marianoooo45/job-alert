// ui/src/app/template.tsx
// -------------------------------------------------------------
// Template wraps each route segment. Keep this file very small.

import MotionProvider from "@/components/motion/MotionProvider";
import PageTransition from "@/components/motion/PageTransition";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <PageTransition>{children}</PageTransition>
    </MotionProvider>
  );
}
