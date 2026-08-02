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
        <div className="flex justify-center items-center">
          section1
        </div>
        <div className="grid h-full grid-cols-7">
          {stripeColors.map((color) => (
            <div key={color} style={{ backgroundColor: color }} />
          ))}
        </div>
        <div className="flex justify-center items-center">section3</div>
      </div>      
    </section>
  );
}
