"use client";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, useEffect, useRef } from "react";
import ParticleText from "./ParticleText";

export interface EvStat {
  icon: string;
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
}

interface Props {
  trust: { src: string; alt: string }[];
  trustPill: string;
  headline: [string, string];
  subtitle: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  stats: EvStat[];
  bgVideo?: string;
  bgVideoWebm?: string;
  bgPoster?: string;
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

function StatValue({ stat, index }: { stat: EvStat; index: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const decimals = stat.decimals ?? 0;
    const fmt = (n: number) =>
      `${stat.prefix ?? ""}${n.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${stat.suffix ?? ""}`;
    const duration = 1500 + index * 80;
    let raf = 0;
    const timer = setTimeout(
      () => {
        const start = performance.now();
        const frame = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          el.textContent = fmt(stat.target * easeOutCubic(t));
          if (t < 1) raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      },
      480 + index * 90
    );
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [stat, index]);
  return (
    <span ref={ref} className="ev-stat-value">
      {`${stat.prefix ?? ""}0${stat.suffix ?? ""}`}
    </span>
  );
}

export default function EvolveHero(props: Props) {
  return (
    <section className="ev-hero-section">
      <div className="ev-bg" aria-hidden="true">
        {props.bgVideo && (
          <video autoPlay muted loop playsInline preload="none" poster={props.bgPoster}>
            {/* webm (VP9, ~⅓ ukuran) untuk browser modern; mp4 (H.264) fallback Safari. */}
            {props.bgVideoWebm && <source src={props.bgVideoWebm} type="video/webm" />}
            <source src={props.bgVideo} type="video/mp4" />
          </video>
        )}
      </div>

      <div className="ev-hero">
        <div className="ev-trust">
          {props.trust.map((logo, i) => (
            <span key={logo.alt} className={`ev-avatar a${i + 1}`}>
              <span>
                <Image src={logo.src} alt={logo.alt} width={34} height={34} />
              </span>
            </span>
          ))}
          <span className="ev-trust-pill">{props.trustPill}</span>
        </div>

        <h1 className="ev-headline-particle">
          <ParticleText
            text={props.headline.join(" ")}
            fontFamily="inherit"
            fontWeight={400}
            fontSize="clamp(2.4rem, 8.5vw, 6rem)"
            color="#ffffff"
            highlightColor="#9a9a9a"
            scatter={150}
            gatherDuration={1500}
            stagger={360}
            pointerRepel={36}
            repelRadius={130}
            idleDrift={0}
            trigger="hover"
            glow
          />
        </h1>

        <p className="ev-sub">{props.subtitle}</p>

        <div className="ev-cta-row">
          <Link className="ev-cta" href={props.primary.href}>
            {props.primary.label}
          </Link>
          <a
            className="ev-cta-alt"
            href={props.secondary.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {props.secondary.label}
          </a>
        </div>
      </div>

      <div className="ev-stats">
        {props.stats.map((s, i) => (
          <div
            key={s.label}
            className="ev-stat"
            style={{ "--d": `${0.5 + i * 0.08}s` } as CSSProperties}
          >
            <span className="ev-stat-icon" aria-hidden="true">
              {s.icon}
            </span>
            <StatValue stat={s} index={i} />
            <span className="ev-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
