"use client";

import type React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Grid pattern dengan kotak yang menyala saat hover (dekorasi panel auth). */
interface InteractiveGridPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number;
  height?: number;
  squares?: [number, number];
  className?: string;
  squaresClassName?: string;
}

export function InteractiveGridPattern({
  width = 40,
  height = 40,
  squares = [24, 24],
  className,
  squaresClassName,
  ...props
}: InteractiveGridPatternProps) {
  const [horizontal, vertical] = squares;
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <svg
      width={width * horizontal}
      height={height * vertical}
      className={cn("absolute inset-0 h-full w-full border border-white/10", className)}
      aria-hidden="true"
      {...props}
    >
      {Array.from({ length: horizontal * vertical }).map((_, index) => {
        const x = (index % horizontal) * width;
        const y = Math.floor(index / horizontal) * height;
        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: grid dekoratif (SVG aria-hidden), hover murni kosmetik
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: grid tetap, index stabil
            key={index}
            x={x}
            y={y}
            width={width}
            height={height}
            className={cn(
              "stroke-white/10 transition-all duration-100 ease-in-out [&:not(:hover)]:duration-1000",
              hovered === index ? "fill-white/10" : "fill-transparent",
              squaresClassName
            )}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
          />
        );
      })}
    </svg>
  );
}
