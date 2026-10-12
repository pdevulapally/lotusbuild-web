import {motion} from "framer-motion";

import {HeroBuildInput} from "@/components/landing/hero-build-input";
import {WordsPullUp, WordsPullUpMultiStyle} from "@/components/motion/words-pull-up";

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  return (
    <section className="h-[100svh] min-h-[640px] p-4 md:p-6">
      <div className="relative h-full w-full overflow-hidden rounded-2xl md:rounded-[2rem]">
        <img className="absolute inset-0 h-full w-full object-cover" src="/images/lake-retreat.webp" alt="" fetchPriority="high" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/45 to-black/80" />


        <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-4 pt-16 pb-[18vw] text-center sm:pb-[14vw] lg:pb-[11vw]">
          <h1 className="text-balance text-4xl font-normal leading-[1.02] tracking-[-0.03em] sm:text-5xl md:text-6xl" style={{color: "#E1E0CC"}}>
            <WordsPullUpMultiStyle segments={[
              {text: "What would you like to", className: "font-normal"},
              {text: "build today?", className: "font-normal"},
            ]} />
          </h1>
          <motion.p className="mt-5 max-w-2xl text-sm leading-relaxed text-primary/70 sm:text-base"
            initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{duration: 0.8, delay: 0.5, ease}}>
            Describe it in a sentence. An agent writes the code, runs it in its own sandbox, and shows you every step while it works.
          </motion.p>
          <motion.div className="mt-8 w-full max-w-3xl" initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{duration: 0.8, delay: 0.7, ease}}>
            <HeroBuildInput />
          </motion.div>
        </div>

        <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 px-4 sm:px-6 md:px-10">
          <p className="text-center font-medium leading-[0.78] tracking-[-0.07em] text-[17vw] opacity-90 lg:text-[16vw]" style={{color: "#E1E0CC"}}>
            <WordsPullUp text="LotusBuild" showAsterisk className="translate-y-[0.12em] justify-center pl-[0.35em]" />
          </p>
        </div>
      </div>
    </section>
  );
}

