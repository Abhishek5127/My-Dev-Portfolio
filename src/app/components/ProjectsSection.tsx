"use client";

import { useEffect, useRef, useState } from "react";

type Project = {
  title: string;
  description?: string;
  image?: string;
};

const projects: Project[] = [
  {
    title: "lorem fdsfkjfs d",
    description: "dljfldskl jsj fdjkljdsklj",
  },
  {
    title: "lorem fdsfkjfs d",
    description: "djfldskl jsj fdjkljdsklj",
  },
  {
    title: "Project title",
    description: "Add project detail here",
  },
];

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const range = (value: number, start: number, end: number) =>
  clamp((value - start) / (end - start));

const easeOut = (value: number) => 1 - Math.pow(1 - value, 3);

const fadeWindow = (
  progress: number,
  enterStart: number,
  enterEnd: number,
  exitStart: number,
  exitEnd: number,
) => range(progress, enterStart, enterEnd) * (1 - range(progress, exitStart, exitEnd));

export default function ProjectsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const targetProgressRef = useRef(0);
  const easedProgressRef = useRef(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let animationFrame = 0;
    let isAnimating = true;

    const updateTargetProgress = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const scrollDistance = Math.max(1, rect.height - window.innerHeight);
      targetProgressRef.current = clamp(-rect.top / scrollDistance);
    };

    const animateProgress = () => {
      if (!isAnimating) return;

      const current = easedProgressRef.current;
      const target = targetProgressRef.current;
      const next = current + (target - current) * 0.075;

      easedProgressRef.current = Math.abs(target - next) < 0.001 ? target : next;
      setProgress(easedProgressRef.current);
      animationFrame = requestAnimationFrame(animateProgress);
    };

    const handleScroll = () => updateTargetProgress();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    updateTargetProgress();
    animateProgress();

    return () => {
      isAnimating = false;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const capsuleEnter = easeOut(range(progress, 0.02, 0.18));
  const capsuleExit = range(progress, 0.9, 1);
  const capsuleOpacity = capsuleEnter * (1 - capsuleExit);
  const capsuleY = 165 * (1 - capsuleEnter) - 190 * capsuleExit;

  const getProjectMotion = (index: number) => {
    const enterStart = 0.28 + index * 0.08;
    const enterEnd = enterStart + 0.16;
    const exitStart = 0.58 + index * 0.09;
    const exitEnd = exitStart + 0.18;
    const enter = easeOut(range(progress, enterStart, enterEnd));
    const exit = easeOut(range(progress, exitStart, exitEnd));

    return {
      opacity: fadeWindow(progress, enterStart, enterEnd, exitStart, exitEnd),
      transform: `translateY(${190 * (1 - enter) - 235 * exit}px)`,
    };
  };

  const renderProjectImage = (project: Project) => (
    <div
      className="aspect-[0.78] w-full rounded-lg bg-[#dddddd] bg-cover bg-center sm:rounded-xl md:rounded-2xl"
      style={project.image ? { backgroundImage: `url(${project.image})` } : undefined}
    />
  );

  const renderProjectText = (project: Project) =>
    project.title || project.description ? (
      <p className="mt-1.5 text-[clamp(0.6rem,1.8vw,1.35rem)] font-bold leading-tight text-white sm:mt-3">
        {project.title}
        {project.description ? (
          <>
            <br />
            {project.description}
          </>
        ) : null}
      </p>
    ) : null;

  return (
    <section
      ref={sectionRef}
      className="relative mt-6 h-[340vh] w-full bg-[#151515] sm:mt-10 md:mt-14"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div
          className="absolute top-[12%] box-border flex h-[76%] w-[40%] min-w-[160px] max-w-[480px] flex-col items-center justify-center rounded-t-full rounded-b-full border-2 border-[#dddddd] bg-[#4f8680] px-[4%] text-center sm:border-3 md:border-4"
          style={{
            left: "50%",
            zIndex: 20,
            opacity: capsuleOpacity,
            transform: `translateX(-50%) translateY(${capsuleY}px)`,
            willChange: "opacity, transform",
          }}
        >
          <h3 className="absolute top-[8%] font-bricolage text-[clamp(1.1rem,3.6vw,3rem)] font-bold leading-tight text-white">
            My
            <br />
            Impactful Projects
          </h3>

          <div className="flex w-[85%] flex-col items-center justify-center space-y-3 pt-[14%] sm:space-y-4 sm:pt-[12%] md:space-y-5 md:pt-[10%] lg:space-y-6">
            <div className="h-8 w-full rounded-full bg-[#dddddd] sm:h-12 md:h-16 lg:h-20" />
            <div className="h-8 w-full rounded-full bg-[#dddddd] sm:h-12 md:h-16 lg:h-20" />
            <div className="h-8 w-full rounded-full bg-[#dddddd] sm:h-12 md:h-16 lg:h-20" />
          </div>
        </div>

        <div
          className="absolute left-[4%] top-[54%] w-[24%] max-w-[320px]"
          style={{
            zIndex: 10,
            ...getProjectMotion(0),
            willChange: "opacity, transform",
          }}
        >
          {renderProjectImage(projects[0])}
          {renderProjectText(projects[0])}
        </div>

        <div
          className="absolute right-[4%] top-[12%] w-[24%] max-w-[320px]"
          style={{
            zIndex: 10,
            ...getProjectMotion(1),
            willChange: "opacity, transform",
          }}
        >
          {renderProjectImage(projects[1])}
          {renderProjectText(projects[1])}
        </div>

        <div
          className="absolute bottom-[8%] right-[4%] w-[24%] max-w-[320px]"
          style={{
            zIndex: 10,
            ...getProjectMotion(2),
            willChange: "opacity, transform",
          }}
        >
          {renderProjectImage(projects[2])}
          {renderProjectText(projects[2])}
        </div>
      </div>
    </section>
  );
}
