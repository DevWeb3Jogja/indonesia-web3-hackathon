/**
 * Klien Cloudflare Turnstile (invisible/managed). Dipakai di flow SIWE: sebelum
 * ambil nonce, kita minta token lalu kirim sebagai header ke /api/auth/nonce.
 * Kalau NEXT_PUBLIC_TURNSTILE_SITE_KEY tak diset → return "" (proteksi nonaktif).
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  execute: (id: string) => void;
  reset: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("turnstile script gagal dimuat"));
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

let container: HTMLElement | null = null;
let widgetId: string | null = null;
let resolver: ((token: string) => void) | null = null;

/** Ambil token Turnstile sekali pakai. "" berarti proteksi nonaktif / gagal muat. */
export async function getTurnstileToken(): Promise<string> {
  if (!SITE_KEY || typeof window === "undefined") return "";
  try {
    await loadScript();
  } catch {
    return "";
  }
  const ts = window.turnstile;
  if (!ts) return "";

  if (!container) {
    container = document.createElement("div");
    container.style.display = "none";
    document.body.appendChild(container);
  }

  return new Promise<string>((resolve) => {
    resolver = resolve;
    if (widgetId === null) {
      widgetId = ts.render(container as HTMLElement, {
        sitekey: SITE_KEY,
        execution: "execute",
        callback: (token: string) => resolver?.(token),
        "error-callback": () => resolver?.(""),
        "timeout-callback": () => resolver?.(""),
      });
    } else {
      ts.reset(widgetId);
    }
    ts.execute(widgetId);
  });
}
