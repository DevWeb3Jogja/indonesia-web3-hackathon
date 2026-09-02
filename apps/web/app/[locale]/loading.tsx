/** Fallback loading untuk semua halaman [locale] (Suspense saat segmen memuat). */
export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-haze">
      <div
        role="status"
        className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-white/80"
        aria-label="Loading"
      />
    </div>
  );
}
