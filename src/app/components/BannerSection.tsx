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
    <section className="relative mt-4 h-[220px] w-full overflow-hidden bg-[#151515] sm:mt-6 sm:h-[300px] md:h-[400px] lg:h-[480px]">
      <div className="grid h-full grid-cols-3">
        <div />
        <div className="grid h-full grid-cols-7">
          {stripeColors.map((color) => (
            <div key={color} style={{ backgroundColor: color }} />
          ))}
        </div>
        <div />
      </div>
      <h2 className="font-bricolage absolute left-1/2 top-1/2 z-10 w-[90%] -translate-x-1/2 -translate-y-1/2 text-center text-[clamp(1.4rem,5vw,4.5rem)] font-bold leading-[1.2] tracking-normal text-white">
        We Know Our Work Better
        <br />
        than
        <br />
        anybody Else
      </h2>
    </section>
  );
}
