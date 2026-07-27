import HeroSection from "./components/HeroSection";
import BannerSection from "./components/BannerSection";
import ProjectsSection from "./components/ProjectsSection";

export default function Home() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-black font-[var(--font-poppins)] text-white">
      <HeroSection />
      <BannerSection />
      <ProjectsSection />
    </main>
  );
}
