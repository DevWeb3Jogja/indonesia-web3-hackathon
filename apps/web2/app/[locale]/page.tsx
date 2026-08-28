import Image from "next/image";
import Link from "next/link";
import EligibilityWarning from "@/components/EligibilityWarning";
import EvolveHero from "@/components/EvolveHero";
import { ArrowUpRight, ChamferBorder } from "@/components/ui";
import { ASSETS } from "@/lib/assets";
import { REGISTER_URL } from "@/lib/content";
import { getDict, localePath } from "@/lib/i18n";

const STAT_STYLE = [
  { image: ASSETS.statPrize, clip: "clip-stat-a", offset: "", text: "left-8 right-8 bottom-8" },
  {
    image: ASSETS.statBuilders,
    clip: "clip-stat-b",
    offset: "lg:mt-24",
    text: "left-16 right-8 bottom-10",
  },
  { image: ASSETS.statSessions, clip: "clip-stat-c", offset: "", text: "left-8 right-16 bottom-8" },
];

function NominationCard({ title, sub, href }: { title: string; sub: string; href: string }) {
  return (
    <Link
      href={href}
      className="relative flex h-[5em] max-w-[20em] items-center justify-center text-center transition duration-200 hover:-translate-y-0.5"
    >
      <ChamferBorder className="text-white/25" />
      <span className="px-5">
        <span className="block text-[13px] font-semibold text-white">{title}</span>
        <span className="mt-0.5 block text-xs font-normal text-white/70">{sub}</span>
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
        style={{ backgroundColor: "rgba(255,255,255,0.12)", padding: "1.5px" }}
      >
        <div
          className={`${style.clip} h-full w-full overflow-hidden bg-cover bg-center`}
          style={{ backgroundImage: `url("${style.image}")`, opacity: 0.5 }}
        />
      </div>
      <div className={`absolute ${style.text}`}>
        <p className="grad-text font-firs text-[36px] font-normal uppercase leading-none sm:text-[52px]">
          {value}
        </p>
        <p className="mt-3 text-sm leading-[1.4] text-white">{desc}</p>
      </div>
    </div>
  );
}

export default async function HomePage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const dict = getDict(locale);
  const t = dict.home;
  const p = (path: string) => localePath(locale, path);

  return (
    <>
      <EvolveHero
        trust={["BA", "BN", "CO"]}
        trustPill="Co-hosted by Binance Academy · BNB Chain"
        headline={[t.title1, t.title2]}
        subtitle={t.subtitle}
        primary={{ label: t.cta, href: p("/submit") }}
        secondary={{ label: t.ctaRegister, href: REGISTER_URL }}
        stats={[
          { icon: "$", target: 5000, prefix: "$", label: "Prize pool" },
          { icon: "#", target: 3, label: "Tracks" },
          { icon: "*", target: 30, label: "Days to submit" },
          { icon: "%", target: 100, suffix: "%", label: "Free to enter" },
        ]}
        bgVideo={ASSETS.heroVideo}
        bgPoster={ASSETS.heroPoster}
      />

      {/* ========================= SUBMISSIONS (dari web) ========================= */}
      <section className="relative overflow-hidden bg-mist px-6 py-20 sm:px-10 sm:py-28">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-3 lg:gap-12">
          <div className="order-2 flex flex-col items-center gap-5 lg:order-1 lg:mt-36 lg:items-stretch">
            {t.tracks.map((c) => (
              <NominationCard key={c.title} title={c.title} sub={c.sub} href={p("/submit")} />
            ))}
          </div>

          <div className="order-1 flex flex-col items-center text-center lg:order-2">
            <p className="text-xs uppercase tracking-[0.24em] text-white/70">
              {t.submissions.bracket}
            </p>
            <h2 className="font-firs text-[44px] font-normal uppercase tracking-tight text-white sm:text-[54px]">
              {t.submissions.title}
            </h2>
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="none"
              className="mt-6 h-[220px] w-[220px] object-cover opacity-90 sm:mt-8 sm:h-[380px] sm:w-[380px] lg:h-[460px] lg:w-[460px]"
              aria-hidden
            >
              <source src={ASSETS.submissionsVideo} type="video/mp4" />
            </video>
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-white/70">
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

          <div className="order-3 flex flex-col items-center gap-5 lg:mt-36 lg:items-stretch">
            {t.prizeCards.map((c) => (
              <NominationCard key={c.title} title={c.title} sub={c.sub} href={p("/prizes")} />
            ))}
          </div>
        </div>
      </section>

      {/* ======================= PENYELENGGARA (dari web) ======================= */}
      <section className="relative bg-haze px-6 py-20 sm:px-10 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-10 text-white lg:flex-row lg:justify-between">
            <h2 className="page-title shrink-0">
              {t.about.title1}
              <br />
              {t.about.title2}
            </h2>

            <div className="max-w-xl">
              <p className="text-[17px] leading-[1.5] text-white/85 sm:text-lg">{t.about.p1}</p>
              <p className="mt-5 text-[17px] leading-[1.5] text-white/85 sm:text-lg">
                {t.about.p2}
              </p>

              <a
                href={REGISTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-6 inline-flex items-center gap-3 text-sm font-medium text-white"
              >
                {t.about.link}
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 transition duration-200 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </a>
            </div>
          </div>

          <div className="mt-16 sm:mt-20">
            <Image
              src={ASSETS.nusantara}
              alt={t.about.mapAlt}
              width={1324}
              height={562}
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="mx-auto w-full max-w-5xl opacity-80"
              style={{ filter: "grayscale(1) brightness(1.4)" }}
            />
          </div>

          <div className="mt-16 grid gap-5 sm:mt-20 md:grid-cols-2 lg:grid-cols-3">
            {t.stats.map((s, i) => (
              <StatCard key={s.value} value={s.value} desc={s.desc} style={STAT_STYLE[i]} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
