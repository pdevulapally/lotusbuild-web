import {ArrowRight} from "lucide-react";
import {Link} from "react-router-dom";

import {About} from "@/components/landing/about";
import {DemoSection} from "@/components/landing/demo-section";
import {Features} from "@/components/landing/features";
import {Hero} from "@/components/landing/hero";
import {SiteFooter} from "@/components/landing/site-footer";
import {SiteHeader} from "@/components/landing/site-header";

export default function LandingPage() {
  return (
    <main id="top" className="bg-black">
      <SiteHeader />
      <Hero />
      <DemoSection />
      <About />
      <Features />
      <section className="px-4 pb-6 sm:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl md:rounded-[2rem]">
          <img className="absolute inset-0 h-full w-full object-cover" src="/images/mountain-loch.webp" alt="" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
          <div className="relative flex flex-col items-center gap-6 px-6 py-24 text-center md:py-32">
            <h2 className="text-balance text-3xl font-normal leading-[1.05] tracking-[-0.02em] sm:text-4xl md:text-5xl" style={{color: "#E1E0CC"}}>Start your first project.</h2>
            <p className="max-w-md text-sm leading-relaxed text-primary/75 sm:text-base">Describe what you want. LotusBuild plans it, builds it and shows you the running app.</p>
            <Link to="/sign-up" className="group inline-flex items-center gap-2 rounded-full bg-primary py-1 pl-5 pr-1 text-sm font-medium text-black transition-all hover:gap-3 sm:text-base">
              Start building
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110 sm:h-10 sm:w-10">
                <ArrowRight className="h-4 w-4" style={{color: "#E1E0CC"}} />
              </span>
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
