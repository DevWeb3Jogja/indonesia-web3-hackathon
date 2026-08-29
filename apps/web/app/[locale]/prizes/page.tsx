import type { Metadata } from "next";
import { Panel } from "@/components/ui";
import { getDict } from "@/lib/i18n";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return { title: getDict(params.locale).prizes.metaTitle };
}

const TRACKS = [
  { code: "01", track: "AI Agents" },
  { code: "02", track: "Finance & Commerce" },
  { code: "03", track: "Consumer Apps" },
];

const AMOUNTS = [600, 400, 300];

export default async function PrizesPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = getDict(params.locale).prizes;
  const places = t.places.map((label, i) => ({ label, amount: AMOUNTS[i] }));

  return (
    <div className="min-h-full bg-haze">
      <div className="page-wrap">
        <p className="eyebrow">{t.eyebrow}</p>
        <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <h1 className="page-title">
            {t.title1}
            <br />
            {t.title2}
          </h1>
        </div>

        {/* Penghargaan lintas track */}
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {/* Grand Prize — kartu emas berlapis (mengikuti gaya "Daily Newsletter"). */}
          <div
            className="group relative flex flex-col overflow-hidden rounded-3xl p-8 transition-transform duration-300 hover:-translate-y-1 md:p-10"
            style={{
              background:
                "radial-gradient(circle at 12% 8%, rgba(240,205,95,0.28) 0%, transparent 42%), linear-gradient(180deg, #15100A 0%, #15100A 55%, #A97D22 82%, #F0D07A 96%, #FFF7E6 100%)",
              boxShadow: "inset 0 -4px 15px -2px rgba(255,240,205,0.85)",
            }}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-amber-200/80">
              {t.grandPrize}
            </p>
            <p className="mt-3 font-firs text-[56px] font-semibold uppercase leading-none text-[#FDF3D8] md:text-[68px]">
              $1,000
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
              {t.grandPrizeDesc}
            </p>
          </div>

          <Panel clip="chamfer-lg" tone="bg-white/[0.02]">
            <div className="p-8 md:p-10">
              <p className="eyebrow">{t.communityChoice}</p>
              <p className="mt-6 font-firs text-[56px] font-semibold uppercase leading-none text-ink md:text-[72px]">
                $100
              </p>
              <p className="mt-4 text-sm leading-relaxed text-ink/80">{t.communityChoiceDesc}</p>
            </div>
          </Panel>
        </div>

        {/* Podium per track */}
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {TRACKS.map((tr) => (
            <Panel
              key={tr.code}
              tone="bg-white/[0.02]"
              className="transition duration-200 hover:-translate-y-0.5"
            >
              <div className="p-7">
                <div className="flex items-baseline justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-teal/70">
                    {t.track} {tr.code}
                  </p>
                  <p className="text-[11px] tracking-[0.14em] text-ink/50">$1,300</p>
                </div>
                <h2 className="mt-3 font-firs text-2xl font-semibold uppercase tracking-tight text-ink">
                  {tr.track}
                </h2>
                <ul className="mt-7 border-y border-teal/15">
                  {places.map((p, i) => (
                    <li
                      key={p.label}
                      className={`flex items-center justify-between border-teal/10 px-1 py-3.5 ${
                        i > 0 ? "border-t" : ""
                      } ${i === 0 ? "bg-teal/[0.06]" : ""}`}
                    >
                      <span className="flex items-center gap-3 text-sm text-ink/80">
                        <span className="text-[11px] tracking-[0.18em] text-teal/80">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {p.label}
                      </span>
                      <span className="font-firs text-lg font-semibold text-teal">${p.amount}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          ))}
        </div>

        {/* Rekap */}
        <Panel clip="chamfer-lg" tone="bg-white/[0.02]" className="mt-5">
          <div className="overflow-x-auto p-6 md:p-8">
            <p className="eyebrow mb-6">{t.recapTitle}</p>
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-teal/20 text-left text-[10px] uppercase tracking-[0.18em] text-teal/70">
                  <th className="pb-3 pr-4 font-medium">{t.colCategory}</th>
                  <th className="pb-3 pr-4 font-medium">{t.colPosition}</th>
                  <th className="pb-3 pr-4 text-center font-medium">{t.colTeams}</th>
                  <th className="pb-3 text-right font-medium">{t.colPrize}</th>
                </tr>
              </thead>
              <tbody className="text-ink">
                <tr className="border-b border-teal/10 bg-teal/[0.05]">
                  <td className="py-3.5 pr-4 font-semibold">{t.grandPrize}</td>
                  <td className="py-3.5 pr-4 text-ink/70">{t.rowGrandPrize}</td>
                  <td className="py-3.5 pr-4 text-center">1</td>
                  <td className="py-3.5 text-right font-firs font-semibold text-teal">$1,000</td>
                </tr>
                <tr className="border-b border-teal/10 bg-teal/[0.05]">
                  <td className="py-3.5 pr-4 font-semibold">{t.communityChoice}</td>
                  <td className="py-3.5 pr-4 text-ink/70">{t.rowCommunityChoice}</td>
                  <td className="py-3.5 pr-4 text-center">1</td>
                  <td className="py-3.5 text-right font-firs font-semibold text-teal">$100</td>
                </tr>
                {TRACKS.map((tr) =>
                  places.map((p, i) => (
                    <tr key={tr.track + p.label} className="border-b border-teal/10">
                      {i === 0 && (
                        <td rowSpan={3} className="py-3.5 pr-4 align-top font-semibold">
                          {tr.track}
                        </td>
                      )}
                      <td className="py-3.5 pr-4 text-ink/70">{p.label}</td>
                      <td className="py-3.5 pr-4 text-center">1</td>
                      <td className="py-3.5 text-right font-firs font-semibold text-teal">
                        ${p.amount}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="bg-teal/[0.08]">
                  <td className="py-4 pr-4 font-firs font-semibold uppercase">{t.total}</td>
                  <td />
                  <td className="py-4 pr-4 text-center font-semibold">11</td>
                  <td className="py-4 text-right font-firs text-xl font-semibold text-teal">
                    $5,000
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
