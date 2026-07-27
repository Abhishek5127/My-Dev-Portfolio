export default function ProjectsSection() {
  return (
    <section className="relative mt-6 h-[560px] w-full overflow-hidden bg-[#151515] sm:mt-10 sm:h-[750px] md:mt-14 md:h-[980px] lg:h-[1200px]">
      {/* Center Capsule */}
      <div className="absolute left-1/2 top-[12%] box-border h-[76%] w-[40%] max-w-[480px] -translate-x-1/2 rounded-t-full rounded-b-full border-2 border-[#dddddd] bg-[#4f8680] px-[4%] pt-[20%] text-center sm:border-3 sm:pt-[22%] md:border-4">
        <h3 className="font-bricolage text-[clamp(1.1rem,3.6vw,3rem)] font-bold leading-tight text-white">
          My
          <br />
          Impactful Projects
        </h3>
        <div className="mt-[15%] space-y-[8%] px-[3%] sm:mt-[18%]">
          <div className="h-8 rounded-full bg-[#dddddd] sm:h-14 md:h-18 lg:h-22" />
          <div className="h-8 rounded-full bg-[#dddddd] sm:h-14 md:h-18 lg:h-22" />
          <div className="h-8 rounded-full bg-[#dddddd] sm:h-14 md:h-18 lg:h-22" />
        </div>
      </div>

      {/* Card 1 (Left Center) */}
      <div className="absolute left-[4%] top-[54%] w-[24%] max-w-[320px]">
        <div className="aspect-[0.78] w-full rounded-lg bg-[#dddddd] sm:rounded-xl md:rounded-2xl" />
        <p className="mt-1.5 text-[clamp(0.6rem,1.8vw,1.35rem)] font-bold leading-tight text-white sm:mt-3">
          lorem fdsfkjfs d
          <br />
          dljfldskl jsj fdjkljdsklj
        </p>
      </div>

      {/* Card 2 (Top Right) */}
      <div className="absolute right-[4%] top-[12%] w-[24%] max-w-[320px]">
        <div className="aspect-[0.78] w-full rounded-lg bg-[#dddddd] sm:rounded-xl md:rounded-2xl" />
        <p className="mt-1.5 text-[clamp(0.6rem,1.8vw,1.35rem)] font-bold leading-tight text-white sm:mt-3">
          lorem fdsfkjfs d
          <br />
          djfldskl jsj fdjkljdsklj
        </p>
      </div>

      {/* Card 3 (Bottom Right) */}
      <div className="absolute bottom-[8%] right-[4%] w-[24%] max-w-[320px]">
        <div className="aspect-[0.78] w-full rounded-lg bg-[#dddddd] sm:rounded-xl md:rounded-2xl" />
      </div>
    </section>
  );
}
