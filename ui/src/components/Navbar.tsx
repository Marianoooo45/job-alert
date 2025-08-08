// ui/src/components/Navbar.tsx
export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/70 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <a href="/" className="font-semibold tracking-tight text-foreground">
          Job <span className="text-primary">Alert</span>
        </a>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <a href="/dashboard" className="hover:text-foreground">Dashboard</a>
        </nav>
      </div>
    </header>
  );
}
