/** Skeleton saat membuka detail project (Suspense fallback rute ini). */
export default function Loading() {
  return (
    <div className="min-h-full bg-haze">
      <div className="mx-auto max-w-4xl animate-pulse px-6 pb-24 pt-24 sm:px-8 sm:pt-28">
        <div className="h-3 w-24 rounded bg-white/[0.06]" />

        {/* Hero */}
        <div className="mt-8 flex items-start gap-5">
          <div className="h-16 w-16 shrink-0 rounded-2xl bg-white/[0.06]" />
          <div className="flex-1 space-y-3 pt-1">
            <div className="h-8 w-2/3 rounded bg-white/[0.06]" />
            <div className="h-3 w-32 rounded bg-white/[0.05]" />
          </div>
        </div>
        <div className="mt-6 h-4 w-3/4 rounded bg-white/[0.05]" />
        <div className="mt-5 flex gap-2">
          <div className="h-6 w-24 rounded-full bg-white/[0.05]" />
          <div className="h-6 w-28 rounded-full bg-white/[0.05]" />
        </div>
        <div className="mt-7 flex gap-3">
          <div className="h-10 w-48 rounded-full bg-white/[0.06]" />
          <div className="h-10 w-28 rounded-full bg-white/[0.05]" />
        </div>

        {/* Team strip */}
        <div className="mt-8 flex items-center gap-3 border-y border-white/10 py-5">
          <div className="h-9 w-9 rounded-full bg-white/[0.06]" />
          <div className="h-3 w-40 rounded bg-white/[0.05]" />
        </div>

        {/* Video */}
        <div className="mt-10 aspect-video w-full rounded-2xl bg-white/[0.05]" />
      </div>
    </div>
  );
}
