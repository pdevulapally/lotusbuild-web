import {motion, useScroll, useTransform, type MotionValue} from "framer-motion";
import {useRef} from "react";

function AnimatedLetter({char, progress, index, total}: {char: string; progress: MotionValue<number>; index: number; total: number}) {
  const charProgress = index / total;
  const opacity = useTransform(progress, [charProgress - 0.1, charProgress + 0.05], [0.2, 1]);
  return <motion.span style={{opacity}}>{char}</motion.span>;
}

export function ScrollRevealText({text, className = ""}: {text: string; className?: string}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const {scrollYProgress} = useScroll({target: ref, offset: ["start 0.8", "end 0.2"]});
  const chars = text.split("");
  return (
    <p ref={ref} className={className} aria-label={text}>
      <span aria-hidden>
        {chars.map((char, index) => (
          <AnimatedLetter key={index} char={char} index={index} total={chars.length} progress={scrollYProgress} />
        ))}
      </span>
    </p>
  );
}
