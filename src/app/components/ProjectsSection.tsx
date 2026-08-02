"use client";

import { useEffect, useRef, useState } from "react";

export default function ProjectsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  // stage: 0 = hidden, 1 = capsule in, 2 = side cards in, 3 = elements exit up
  const [stage, setStage] = useState<number>(0);
  const capsuleTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const now = Date.now();

      // Step 1: Capsule enters first when section arrives
      if (rect.top <= windowHeight * 0.85 && capsuleTimeRef.current === null) {
        capsuleTimeRef.current = now;
        setStage(1);
        return;
      }

      // Step 2: Side Cards CANNOT enter until at least 750ms AFTER capsule has settled + user scrolls
      if (
        capsuleTimeRef.current !== null &&
        now - capsuleTimeRef.current >= 750 &&
        rect.top <= windowHeight * 0.65
      ) {
        setStage((prev) => (prev < 3 ? 2 : prev));
      }

      // Step 3: Elements exit UP together when user scrolls past section
      if (rect.top <= -rect.height * 0.15) {
        setStage(3);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Compute opacity & Y transform based on stage
  const capsuleOpacity = stage === 1 || stage === 2 ? 1 : 0;
  const capsuleY = stage === 0 ? 90 : stage === 3 ? -130 : 0;

  const cardsOpacity = stage === 2 ? 1 : 0;
  const cardsY = stage < 2 ? 70 : stage === 3 ? -130 : 0;

  return (
    <section
      ref={sectionRef}
      className="relative mt-6 h-[560px] w-full overflow-hidden bg-[#151515] sm:mt-10 sm:h-[750px] md:mt-14 md:h-[980px] lg:h-[1200px]"
    >
      {/* ── CENTER CAPSULE (Stage 1 entrance) ── */}
      <div
        className="absolute top-[12%] box-border flex h-[76%] w-[40%] min-w-[160px] max-w-[480px] flex-col items-center justify-center rounded-t-full rounded-b-full border-2 border-[#dddddd] bg-[#4f8680] px-[4%] text-center sm:border-3 md:border-4"
        style={{
          left: "50%",
          zIndex: 20,
          opacity: capsuleOpacity,
          transform: `translateX(-50%) translateY(${capsuleY}px)`,
          transition:
            "opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Heading at top curve */}
        <h3 className="absolute top-[8%] font-bricolage text-[clamp(1.1rem,3.6vw,3rem)] font-bold leading-tight text-white">
          My
          <br />
          Impactful Projects
        </h3>

        {/* White blocks / Pills - PERFECTLY centered inside capsule */}
        <div className="flex w-[85%] flex-col items-center justify-center space-y-3 pt-[14%] sm:space-y-4 sm:pt-[12%] md:space-y-5 md:pt-[10%] lg:space-y-6">
          <div className="h-8 w-full rounded-full bg-[#dddddd] sm:h-12 md:h-16 lg:h-20" />
          <div className="h-8 w-full rounded-full bg-[#dddddd] sm:h-12 md:h-16 lg:h-20" />
          <div className="h-8 w-full rounded-full bg-[#dddddd] sm:h-12 md:h-16 lg:h-20" />
        </div>
      </div>

      {/* ── 3 SIDE CARDS (Stage 2 entrance: Unlocked only after 750ms + scroll) ── */}

      {/* Card 1 — Left Center */}
      <div
        className="absolute left-[4%] top-[54%] w-[24%] max-w-[320px]"
        style={{
          zIndex: 10,
          opacity: cardsOpacity,
          transform: `translateY(${cardsY}px)`,
          transition:
            "opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)",
          transitionDelay: stage === 2 ? "100ms" : "0ms",
        }}
      >
        <div className="aspect-[0.78] w-full rounded-lg bg-[#dddddd] sm:rounded-xl md:rounded-2xl" />
        <p className="mt-1.5 text-[clamp(0.6rem,1.8vw,1.35rem)] font-bold leading-tight text-white sm:mt-3">
          lorem fdsfkjfs d
          <br />
          dljfldskl jsj fdjkljdsklj
        </p>
      </div>

      {/* Card 2 — Top Right */}
      <div
        className="absolute right-[4%] top-[12%] w-[24%] max-w-[320px]"
        style={{
          zIndex: 10,
          opacity: cardsOpacity,
          transform: `translateY(${cardsY}px)`,
          transition:
            "opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)",
          transitionDelay: stage === 2 ? "250ms" : "0ms",
        }}
      >
        <div className="aspect-[0.78] w-full rounded-lg bg-[#dddddd] sm:rounded-xl md:rounded-2xl" />
        <p className="mt-1.5 text-[clamp(0.6rem,1.8vw,1.35rem)] font-bold leading-tight text-white sm:mt-3">
          lorem fdsfkjfs d
          <br />
          djfldskl jsj fdjkljdsklj
        </p>
      </div>

      {/* Card 3 — Bottom Right */}
      <div
        className="absolute bottom-[8%] right-[4%] w-[24%] max-w-[320px]"
        style={{
          zIndex: 10,
          opacity: cardsOpacity,
          transform: `translateY(${cardsY}px)`,
          transition:
            "opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)",
          transitionDelay: stage === 2 ? "400ms" : "0ms",
        }}
      >
        <div className="aspect-[0.78] w-full rounded-lg bg-[#dddddd] sm:rounded-xl md:rounded-2xl" />
      </div>
    </section>
  );
}
