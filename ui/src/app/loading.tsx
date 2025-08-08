// Skeleton global de la page d'accueil (Next.js app router)
export default function Loading() {
  return (
    <main className="container mx-auto px-4 py-10 sm:px-6 lg:px-8 animate-pulse">
      {/* HERO skeleton */}
      <section className="relative rounded-2xl overflow-hidden border border-border mb-10">
        <div className="h-40 sm:h-52 bg-surface" />
        <div className="p-6 sm:p-8">
          <div className="h-8 w-56 bg-muted rounded mb-3" />
          <div className="h-5 w-[70%] bg-muted rounded mb-2" />
          <div className="h-4 w-40 bg-muted rounded" />
          <div className="mt-5 flex gap-3">
            <div className="h-10 w-40 bg-muted rounded-lg" />
            <div className="h-10 w-28 bg-muted rounded-lg" />
          </div>
        </div>
      </section>

      {/* SEARCH skeleton */}
      <section className="panel rounded-2xl p-3 sm:p-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="h-11 bg-muted/60 rounded w-full" />
          <div className="h-11 bg-muted/60 rounded w-[180px]" />
          <div className="h-11 bg-muted/60 rounded w-[220px]" />
          <div className="h-11 bg-muted/60 rounded w-[180px]" />
          <div className="h-10 bg-muted/60 rounded w-[120px]" />
        </div>
      </section>

      {/* TABLE skeleton */}
      <section className="panel rounded-2xl p-2 sm:p-3 overflow-x-auto">
        <div className="min-w-[1100px]">
          {/* header */}
          <div className="grid grid-cols-12 gap-3 border-b border-border px-3 py-2">
            <div className="col-span-6 h-5 bg-muted/60 rounded" />
            <div className="col-span-3 h-5 bg-muted/60 rounded" />
            <div className="col-span-2 h-5 bg-muted/60 rounded" />
            <div className="col-span-1 h-5 bg-muted/60 rounded" />
          </div>
          {/* rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 px-3 py-3 border-b border-border">
              <div className="col-span-6">
                <div className="h-4 w-[85%] bg-muted/60 rounded mb-2" />
                <div className="h-3 w-[55%] bg-muted/40 rounded" />
              </div>
              <div className="col-span-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted/60" />
                <div className="h-4 w-32 bg-muted/60 rounded" />
              </div>
              <div className="col-span-2">
                <div className="h-4 w-24 bg-muted/60 rounded" />
              </div>
              <div className="col-span-1">
                <div className="h-4 w-16 bg-muted/60 rounded ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PAGINATION skeleton */}
      <div className="mt-6 flex justify-center items-center gap-3">
        <div className="h-10 w-24 bg-muted/60 rounded-lg" />
        <div className="h-10 w-24 bg-muted/60 rounded-lg" />
      </div>
    </main>
  );
}
