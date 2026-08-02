'use client';

import dynamic from "next/dynamic";

const BannerWaterRipple = dynamic(() => import("./BannerWaterRipple"), { ssr: false });

const stripeColors = [
  "#8a2824",
  "#875608",
  "#74660b",
  "#4d790d",
  "#164f78",
  "#263461",
  "#4d1f5d",
];

export default function BannerSection() {
  return (
    <section className="relative mt-4 h-[220px] w-full overflow-hidden bg-[#0d0d0d] sm:mt-6 sm:h-[300px] md:h-[400px] lg:h-[480px]">

      {/* ── Three-column layout ─────────────────────────────────── */}
      <div className="grid h-full grid-cols-3">
        {/* Section 1 — interactive water surface */}
        <div className="relative h-full w-full overflow-hidden">
          <BannerWaterRipple />
        </div>

        {/* Section 2 — rainbow colour stripes */}
        <div className="grid h-full grid-cols-7">
          {stripeColors.map((color) => (
            <div key={color} style={{ backgroundColor: color }} />
          ))}
        </div>

        {/* Section 3 — dark panel */}
        <div className="h-full w-full bg-[#0d0d0d]" />
      </div>

      {/* ── Full-width text overlay — spans all three columns ──────
          pointer-events-none lets mouse events fall through to the
          water canvas in section 1, so ripples still work.          */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6">
        <p
          className="font-bricolage text-center font-black leading-[1.05] text-white select-none"
          style={{ fontSize: "clamp(1.8rem, 7.5vw, 5.5rem)" }}
        >
          We Know Our Work Better
          <br />
          than
          <br />
          anybody Else
        </p>
      </div>

    </section>
  );
}
