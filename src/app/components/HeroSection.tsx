import Image from "next/image";
import devPhoto from "@/app/assets/devPhoto/devPhoto.png";
import release from "@/app/assets/export";

const socialLinks = [
  { label: "GitHub", icon: release.Github },
  { label: "LinkedIn", icon: release.Linkedin },
  { label: "Instagram", icon: release.Instagram },
  { label: "Email", icon: release.Gmail },
];

export default function HeroSection() {
  return (
    <section className="relative box-border w-full overflow-x-hidden bg-[#151515] px-4 py-5 sm:px-8 sm:py-8 md:px-12 lg:px-16 xl:px-24">
      {/* Navbar */}
      <div className="flex w-full justify-end">
        <div className="mr-4 flex h-11 w-full max-w-6xl overflow-hidden items-center justify-end rounded-full bg-[#dddddd] px-6 sm:mr-6 sm:h-14 sm:px-8 lg:mr-8 lg:h-18 lg:px-10">
          <button className="font-bricolage text-x font-bold w-30 text-black sm:text-3xl lg:text-4xl">
            Menu
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center justify-between gap-6 sm:mt-10 sm:flex-row sm:gap-10 lg:mt-14">
        <div className="w-full sm:max-w-[360px] md:max-w-[460px] lg:max-w-[560px]">
          <h2 className="font-bricolage text-xl font-bold leading-tight text-white sm:text-2xl md:text-3xl lg:text-4xl">
            Build Something Really Matters
          </h2>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-200 sm:mt-4 sm:text-base md:text-lg lg:text-xl">
            We build digital experiences that are designed to deliver real, measurable results—not just look good. Every website, application, and interface we create is focused on helping businesses grow by improving user experience, increasing conversions, and strengthening their online presence. Our goal is simple: build solutions that make a meaningful impact and turn ideas into tangible success.

          </p>
        </div>

        <div className="flex max-w-full shrink-0 items-center justify-end">
          <div className="relative h-[140px] w-[180px] overflow-hidden rounded-[1.8rem_0_0_1.8rem] bg-[#dddddd] sm:h-[190px] sm:w-[260px] sm:rounded-[2.5rem_0_0_2.5rem] md:h-[240px] md:w-[350px] lg:h-[300px] lg:w-[440px]">
            <Image
              src={devPhoto}
              alt="Abhishek Choudhary"
              fill
              priority
              sizes="(min-width: 1024px) 440px, (min-width: 768px) 350px, 260px"
              className="object-cover"
            />
          </div>

          <div className="flex h-[130px] w-9 shrink-0 flex-col items-center justify-center gap-2 rounded-full bg-black sm:h-[175px] sm:w-12 sm:gap-3 md:h-[220px] md:w-15 lg:h-[275px] lg:w-18">
            {socialLinks.map((item) => (
              <Image
                key={item.label}
                src={item.icon}
                alt={item.label}
                width={20}
                height={20}
                className="invert sm:h-[26px] sm:w-[26px] md:h-[32px] md:w-[32px]"
              />
            ))}
          </div>
        </div>
      </div>

      <h1 className="font-bricolage mt-8 w-full select-none text-center text-[clamp(1.75rem,7.5vw,7.5rem)] font-bold leading-none tracking-tight text-white sm:mt-12 lg:mt-16">
        Abhishek <span className="mx-1 sm:mx-2">{"\u2726"}</span> Choudhary
      </h1>
    </section>
  );
}