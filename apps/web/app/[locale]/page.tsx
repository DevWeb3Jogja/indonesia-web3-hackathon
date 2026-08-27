import Image from "next/image";
import Link from "next/link";
import EligibilityWarning from "@/components/EligibilityWarning";
import { ArrowUpRight, BrandMark, ChamferBorder } from "@/components/ui";
import { ASSETS } from "@/lib/assets";
import { REGISTER_URL } from "@/lib/content";
import { getDict, localePath } from "@/lib/i18n";

/** Bagian presentasi stat card yang bukan konten: gambar, bentuk, posisi teks. */
const STAT_STYLE = [
  { image: ASSETS.statPrize, clip: "clip-stat-a", offset: "", text: "left-6 right-6 bottom-6" },
  { image: ASSETS.statBuilders, clip: "clip-stat-b", offset: "lg:mt-24", text: "left-6 bottom-20" },
  { image: ASSETS.statSessions, clip: "clip-stat-c", offset: "", text: "left-6 right-28 bottom-6" },
];

function NominationCard({ title, sub, href }: { title: string; sub: string; href: string }) {
  return (
    <Link
      href={href}
      className="relative flex h-[5em] max-w-[20em] items-center justify-center text-center transition duration-200 hover:-translate-y-0.5"
    >
      <ChamferBorder />
      <span className="px-5">
        <span className="block text-[13px] font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs font-normal text-ink/80">{sub}</span>
      </span>
    </Link>
  );
}

function StatCard({
  value,
  desc,
  style,
}: {
  value: string;
  desc: string;
  style: (typeof STAT_STYLE)[number];
}) {
  return (
    <div className={`relative w-full ${style.offset}`}>
      <div
        className={`${style.clip} h-[280px] w-full sm:h-[340px]`}
        style={{ backgroundColor: "rgba(255, 255, 255, 0.8)", padding: "1.5px" }}
      >
        <div
          className={`${style.clip} h-full w-full overflow-hidden bg-cover bg-center`}
          style={{
            backgroundImage: `url("${style.image}")`,
            mixBlendMode: "plus-darker",
          }}
        />
      </div>
      <div className={`absolute ${style.text}`}>
        <p className="grad-text font-firs text-[36px] font-semibold uppercase leading-none sm:text-[52px]">
          {value}
        </p>
        <p className="mt-3 max-w-[66%] text-sm leading-[1.4] text-ink">{desc}</p>
      </div>
    </div>
  );
}

export default function HomePage({ params }: { params: { locale: string } }) {
  const dict = getDict(params.locale);
  const t = dict.home;
  const p = (path: string) => localePath(params.locale, path);

  return (
    <>
      {/* ============================ 1 · HERO ============================ */}
      <section className="relative flex min-h-[calc(100dvh-24px)] flex-col overflow-hidden sm:min-h-[calc(100dvh-40px)]">
        {/* bg-haze menahan sebelum frame pertama termuat, dan tetap jadi latar
            yang layak kalau video gagal dimuat sama sekali. */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full bg-haze object-cover"
          aria-hidden
        >
          <source src={ASSETS.heroVideo} type="video/mp4" />
        </video>
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20"
          aria-hidden
        />

        {/* Top bar — desktop saja. Pojok kanan atas milik switcher bahasa di ShellChrome. */}
        <div className="relative z-20 hidden px-4 pt-5 sm:px-10 sm:pt-8 md:block">
          <Link href={p("/")} className="inline-flex items-center gap-2 text-white">
            <BrandMark className="h-6 w-6 sm:h-7 sm:w-7" />
            <span className="leading-none">
              <span className="block text-sm font-semibold tracking-tight sm:text-[15px]">
                {dict.brand.line1}
              </span>
              <span className="-mt-0.5 block text-[10px] font-light opacity-90 sm:text-[11px]">
                {dict.brand.line2}
              </span>
            </span>
          </Link>
        </div>

        {/* Konten tengah */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-24 pt-32 text-center text-ink sm:pt-40">
          <p className="eyebrow rise mb-6 opacity-90">{t.eyebrow}</p>
          {/* Ukuran diturunkan dari 48/76/100/120: baris terpanjang kini
              "Indonesia Web3" (14 karakter), bukan lagi "hackathon" (9). */}
          <h1 className="rise rise-1 font-firs text-[34px] font-normal leading-[0.95] tracking-[-0.04em] sm:text-[56px] md:text-[76px] lg:text-[92px]">
            {t.title1}
            <br />
            {t.title2}
          </h1>
          <p className="rise rise-2 mt-8 max-w-md text-xs font-medium uppercase leading-[1.8] tracking-[0.22em] opacity-90 sm:text-sm">
            {t.subtitle}
          </p>
          <div className="rise rise-3 mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Link href={p("/submit")} className="btn-teal group">
              {t.cta}
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <a
              href={REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline group border border-ink/20"
            >
              {t.ctaRegister}
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </section>

      {/* ========================= 2 · SUBMISSIONS ========================= */}
      <section className="relative overflow-hidden bg-mist px-6 py-20 sm:px-10 sm:py-28">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-3 lg:gap-12">
          {/* kiri — track */}
          <div className="order-2 flex flex-col items-center gap-5 lg:order-1 lg:mt-36 lg:items-stretch">
            {t.tracks.map((c) => (
              <NominationCard key={c.title} title={c.title} sub={c.sub} href={p("/submit")} />
            ))}
          </div>

          {/* tengah — judul + video */}
          <div className="order-1 flex flex-col items-center text-center lg:order-2">
            <p className="text-xs uppercase tracking-[0.24em] text-ink">{t.submissions.bracket}</p>
            <h2 className="font-firs text-[44px] font-semibold uppercase tracking-tight text-ink sm:text-[54px]">
              {t.submissions.title}
            </h2>
            <video
              autoPlay
              loop
              muted
              playsInline
              className="mt-6 h-[220px] w-[220px] object-cover sm:mt-8 sm:h-[380px] sm:w-[380px] lg:h-[460px] lg:w-[460px]"
              aria-hidden
            >
              <source src={ASSETS.submissionsVideo} type="video/mp4" />
            </video>
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-ink/70">
              {t.submissions.note}
            </p>
            <EligibilityWarning
              compact
              className="mt-5 max-w-xs"
              label={t.submissions.warningLabel}
              message={t.submissions.warning}
              cta={t.submissions.warningCta}
            />
          </div>

          {/* kanan — hadiah */}
          <div className="order-3 flex flex-col items-center gap-5 lg:mt-36 lg:items-stretch">
            {t.prizeCards.map((c) => (
              <NominationCard key={c.title} title={c.title} sub={c.sub} href={p("/prizes")} />
            ))}
          </div>
        </div>

        <div
          className="fade-haze pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 sm:h-56"
          aria-hidden
        />
      </section>

      {/* ======================= 3 · PENYELENGGARA ======================= */}
      <section className="relative bg-haze px-6 py-20 sm:px-10 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-10 text-ink lg:flex-row lg:justify-between">
            <h2 className="page-title shrink-0">
              {t.about.title1}
              <br />
              {t.about.title2}
            </h2>

            <div className="max-w-xl">
              <p className="text-[17px] leading-[1.5] sm:text-lg">{t.about.p1}</p>
              <p className="mt-5 text-[17px] leading-[1.5] sm:text-lg">{t.about.p2}</p>

              <a
                href={REGISTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-6 inline-flex items-center gap-3 text-sm font-medium text-ink"
              >
                {t.about.link}
                <span className="chamfer-sm flex h-8 w-8 items-center justify-center border border-ink transition duration-200 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </a>
            </div>
          </div>

          {/* Nusantara: pita melintang antara narasi dan angka.
              Aset aslinya emas (hue 37°); hue-rotate(150deg) mendaratkannya di
              193,6° — meleset 3° dari teal brand #066377. Diukur, bukan dikira. */}
          <div className="mt-16 sm:mt-20">
            <Image
              src={ASSETS.nusantara}
              alt={t.about.mapAlt}
              width={1324}
              height={562}
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="mx-auto w-full max-w-5xl"
              style={{ filter: "hue-rotate(150deg) saturate(0.85)" }}
            />
          </div>

          {/* Statistik */}
          <div className="mt-16 grid gap-5 sm:mt-20 md:grid-cols-2 lg:grid-cols-3">
            {t.stats.map((s, i) => (
              <StatCard key={s.value} value={s.value} desc={s.desc} style={STAT_STYLE[i]} />
            ))}
          </div>
        </div>

        <div
          className="fade-haze pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 sm:h-56"
          aria-hidden
        />
      </section>
    </>
  );
}
