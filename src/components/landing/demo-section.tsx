import {motion} from "framer-motion";

import {WorkflowDemo} from "@/components/landing/workflow-demo";
import {WordsPullUpMultiStyle} from "@/components/motion/words-pull-up";

export function DemoSection() {
  return (
    <section id="demo" className="scroll-mt-24 bg-black px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-primary">How it works</p>
        <h2 className="mt-5 text-center text-balance text-3xl font-normal leading-[1.05] tracking-[-0.02em] sm:text-4xl md:text-5xl" style={{color: "#E1E0CC"}}>
          <WordsPullUpMultiStyle segments={[
            {text: "From a task to a running build,", className: "font-normal"},
            {text: "while you watch.", className: "font-normal"},
          ]} />
        </h2>
        <motion.div className="mt-12" initial={{opacity: 0, y: 30}} whileInView={{opacity: 1, y: 0}} viewport={{once: true, margin: "-100px"}}
          transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}}>
          <WorkflowDemo />
        </motion.div>
      </div>
    </section>
  );
}
