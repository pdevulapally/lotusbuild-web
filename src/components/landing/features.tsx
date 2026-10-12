import {motion, useInView} from "framer-motion";
import {Activity, ArrowRight, Check, ListChecks, Monitor} from "lucide-react";
import {useRef} from "react";
import {Link} from "react-router-dom";

import {WordsPullUpMultiStyle} from "@/components/motion/words-pull-up";


const CARDS = [
  {
    number: "01",
    title: "Live activity.",
    icon: Activity,
    items: ["Replies stream in as they are written", "Every command and file edit, in order", "Reconnects without losing a step", "Save status the moment a run ends"],
  },
  {
    number: "02",
    title: "Plan, then build.",
    icon: ListChecks,
    items: ["Plan mode maps the work before any code", "Models and effort come from your plan", "Queue or steer follow-ups mid-run"],
  },
  {
    number: "03",
    title: "Live desktop.",
    icon: Monitor,
    items: ["Watch the agent's desktop, read-only", "Opens as soon as the desktop is ready", "Closes cleanly when the session ends"],
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, {once: true, margin: "-100px"});
  return (
    <section id="features" className="scroll-mt-24 relative min-h-screen overflow-hidden bg-black px-4 py-16 sm:px-6 sm:py-24">
      <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.15]" />
      <div className="relative mx-auto max-w-7xl">
        <h2 className="flex flex-col gap-1 text-center text-balance text-3xl font-normal leading-[1.05] tracking-[-0.02em] sm:text-4xl md:text-5xl">
          <WordsPullUpMultiStyle segments={[{text: "Agent-grade workflows for people who ship.", className: "text-[#E1E0CC]"}]} />
          <WordsPullUpMultiStyle segments={[{text: "Built for real builds. Powered by real models.", className: "text-gray-500"}]} />
        </h2>

        <div ref={ref} className="mt-12 grid grid-cols-1 gap-3 sm:gap-2 md:grid-cols-2 md:gap-1 lg:h-[480px] lg:grid-cols-4">
          <motion.div
            className="relative min-h-[320px] overflow-hidden rounded-2xl"
            initial={{opacity: 0, scale: 0.95}}
            animate={inView ? {opacity: 1, scale: 1} : undefined}
            transition={{duration: 0.8, ease}}
          >
            <img className="absolute inset-0 h-full w-full object-cover" src="/images/canvas.webp" alt="" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent" />
            <p className="absolute bottom-5 left-5 text-xl" style={{color: "#E1E0CC"}}>Your build canvas.</p>
          </motion.div>

          {CARDS.map((card, index) => (
            <motion.article
              key={card.number}
              className="flex min-h-[320px] flex-col rounded-2xl bg-[#212121] p-5 sm:p-6"
              initial={{opacity: 0, scale: 0.95}}
              animate={inView ? {opacity: 1, scale: 1} : undefined}
              transition={{duration: 0.8, delay: (index + 1) * 0.15, ease}}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15"><card.icon aria-hidden className="h-5 w-5" style={{color: "#E1E0CC"}} /></span>
              <h3 className="mt-6 flex items-baseline gap-2 text-xl" style={{color: "#E1E0CC"}}>
                {card.title}
                <span className="text-xs text-gray-500">({card.number})</span>
              </h3>
              <ul className="mt-5 space-y-3">
                {card.items.map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-400">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/sign-up" className="group mt-auto inline-flex items-center gap-1.5 pt-6 text-sm text-primary/80 transition-colors hover:text-primary">
                Learn more
                <ArrowRight className="h-4 w-4 -rotate-45 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
