/** Loading saat wallet sedang reconnect — dipakai komponen ber-gate agar tak
 *  keburu menampilkan "sign first" sebelum status wallet pasti. */
export function WalletLoading({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-ink/60">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
      {label ?? "Connecting wallet…"}
    </div>
  );
}
