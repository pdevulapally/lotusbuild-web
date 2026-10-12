import {ScrollRevealText} from "@/components/motion/scroll-reveal-text";
import {WordsPullUpMultiStyle} from "@/components/motion/words-pull-up";

export function About() {
  return (
    <section id="how" className="scroll-mt-24 bg-black px-4 py-8 sm:px-6 sm:py-24 md:py-32">
      <div className="mx-auto max-w-6xl rounded-2xl bg-[#101010] px-6 py-16 text-center sm:px-10 sm:py-24 md:rounded-[2rem] md:py-32">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">The agent</p>
        <h2 className="mx-auto mt-5 max-w-3xl text-balance text-3xl font-normal leading-[1.05] tracking-[-0.02em] sm:text-4xl md:text-5xl" style={{color: "#E1E0CC"}}>
          <WordsPullUpMultiStyle
            segments={[
              {text: "Describe it in a sentence,", className: "font-normal"},
              {text: "watch it get built", className: "font-normal"},
              {text: "by an agent that writes, runs and checks its own code.", className: "font-normal"},
            ]}
          />
        </h2>
        <ScrollRevealText
          className="mx-auto mt-8 max-w-2xl text-sm leading-relaxed text-primary/70 sm:text-base"
          text="Every project gets its own sandbox. Plan the work first or go straight to building, pick the model and effort your plan allows, and follow each command, file edit and result as it streams in. Send follow-ups while the agent works, steer the current turn, or stop it whenever you want."
        />
      </div>
    </section>
  );
}
