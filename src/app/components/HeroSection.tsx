import Image from "next/image";
import devPhoto from "@/app/assets/devPhoto/devPhoto.png";
import release from "@/app/assets/export";
import Navbar from "./navbar";

const socialLinks = [
  { label: "GitHub", icon: release.Github },
  { label: "LinkedIn", icon: release.Linkedin },
  { label: "Instagram", icon: release.Instagram },
  { label: "Email", icon: release.Gmail },
];

export default function HeroSection() {
  return (
    <section className="relative box-border w-full overflow-hidden bg-[#0d0d0d] pt-5 pb-8 sm:pt-8 md:pt-10">
      <div className="pointer-events-none absolute bottom-0 left-[clamp(1rem,4vw,4rem)] top-0 z-10 w-px bg-zinc-800/60" />

      <div className="flex items-center gap-[clamp(1rem,4vw,4rem)] px-[clamp(1.5rem,5vw,6rem)]">
        <div className="shrink-0 text-white">A</div>
        <Navbar />
      </div>

      <div className="mt-8 flex min-h-[420px] items-start justify-around gap-8">
        <div className="min-w-0 max-w-[580px] flex-1 self-center pl-3 lg:self-center">
          <h2 className="font-bricolage max-w-[13ch] text-[clamp(2rem,3.2vw,3.6rem)] font-extrabold leading-[0.95] tracking-[-0.045em] text-white">
            Build Something Really Matters
          </h2>

          <p className="mt-5 max-w-[550px] text-[clamp(0.95rem,1.18vw,1.2rem)] font-medium leading-[1.45] tracking-[-0.02em] text-zinc-300">
            We build digital experiences that are designed to deliver real,
            measurable results, not just look good. Every website, application,
            and interface we create is focused on helping businesses grow by
            improving user experience, increasing conversions, and
            strengthening their online presence. Our goal is simple: build
            solutions that make a meaningful impact and turn ideas into
            tangible success.
          </p>
        </div>

        <div className="flex w-full shrink-0 items-stretch self-start overflow-hidden rounded-l-[clamp(1.5rem,3vw,3.6rem)] bg-black shadow-2xl shadow-black/40 sm:w-auto lg:self-center">
          <div
            className="relative overflow-hidden bg-zinc-900"
            style={{
              width: "clamp(230px, 37vw, 560px)",
              height: "clamp(210px, 27vw, 390px)",
            }}
          >
            <Image
              src={devPhoto}
              alt="Abhishek Choudhary"
              fill
              priority
              sizes="(min-width: 1280px) 560px, (min-width: 768px) 37vw, 230px"
              className="object-contain object-center"
            />
          </div>

          <div
            className="flex shrink-0 flex-col items-center justify-center gap-[clamp(1rem,2vw,2rem)] bg-black"
            style={{
              width: "clamp(3rem,4.5vw,5.5rem)",
              height: "clamp(210px,27vw,390px)",
              paddingTop: "clamp(0.75rem,1.2vw,1.5rem)",
              paddingBottom: "clamp(0.75rem,1.2vw,1.5rem)",
            }}
          >
            {socialLinks.map((item) => (
              <Image
                key={item.label}
                src={item.icon}
                alt={item.label}
                width={28}
                height={28}
                className="invert opacity-100"
                style={{
                  width: "clamp(18px,1.9vw,32px)",
                  height: "clamp(18px,1.9vw,32px)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <h1 className="font-bricolage mt-6 w-full select-none text-center text-[clamp(3.5rem,11vw,8rem)] font-extrabold leading-none tracking-tight text-white sm:mt-10 lg:mt-14">
        Abhishek <span className="mx-1 inline-block sm:mx-2">✦</span> Choudhary
      </h1>
    </section>
  );
}
