import { Loader2 } from "lucide-react";

/** Fallback loading untuk semua halaman dashboard (Suspense saat segmen memuat). */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="text-muted-foreground size-6 animate-spin" aria-label="Loading" />
    </div>
  );
}
