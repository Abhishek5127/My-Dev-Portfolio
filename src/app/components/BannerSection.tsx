"use client";

import dynamic from "next/dynamic";

const BannerWaterRipple = dynamic(() => import("./BannerWaterRipple"), {
  ssr: false,
});

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
    <section className="relative mt-4 h-[220px] w-full overflow-hidden bg-[#0d0d0d] sm:mt-6 sm:h-[300px] md:h-[480px] lg:h-[735px]">
      <div className="absolute inset-y-0 left-0 z-20 w-[34.7%] overflow-hidden">
        <BannerWaterRipple />
      </div>

      <div className="absolute inset-y-0 left-[34.7%] z-0 grid w-[25%] grid-cols-7">
        {stripeColors.map((color) => (
          <div key={color} style={{ backgroundColor: color }} />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <p className="font-bricolage select-none text-center text-[clamp(2.35rem,6.95vw,8.1rem)] font-black leading-[1.18] tracking-[-0.035em] text-white">
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
