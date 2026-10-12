import {motion, useInView} from "framer-motion";
import {useRef} from "react";

const ease = [0.16, 1, 0.3, 1] as const;

type Segment = {text: string; className?: string};

function useWords(segments: Segment[]) {
  return segments.flatMap(segment =>
    segment.text.split(" ").filter(Boolean).map(word => ({word, className: segment.className ?? ""})),
  );
}

export function WordsPullUp({text, className = "", showAsterisk = false}: {text: string; className?: string; showAsterisk?: boolean}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, {once: true});
  const words = text.split(" ");
  return (
    <span ref={ref} className={`inline-flex flex-wrap ${className}`} aria-label={text}>
      {words.map((word, index) => {
        const last = index === words.length - 1;
        return (
          <span key={index} className={`pb-[0.05em] ${last && showAsterisk ? "pr-[0.35em]" : "overflow-hidden"}`} aria-hidden>
            <motion.span
              className="relative inline-block"
              initial={{y: 20, opacity: 0}}
              animate={inView ? {y: 0, opacity: 1} : undefined}
              transition={{duration: 0.8, delay: index * 0.08, ease}}
            >
              {word}
              {last && showAsterisk && (
                <span className="absolute -right-[0.3em] top-[0.65em] text-[0.31em]">*</span>
              )}
              {!last && "\u00a0"}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}

export function WordsPullUpMultiStyle({segments, className = ""}: {segments: Segment[]; className?: string}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, {once: true});
  const words = useWords(segments);
  return (
    <span ref={ref} className={`inline-flex flex-wrap justify-center ${className}`} aria-label={segments.map(s => s.text).join(" ")}>
      {words.map(({word, className: wordClass}, index) => (
        <span key={index} className="overflow-hidden pb-[0.08em]" aria-hidden>
          <motion.span
            className={`inline-block ${wordClass}`}
            initial={{y: 20, opacity: 0}}
            animate={inView ? {y: 0, opacity: 1} : undefined}
            transition={{duration: 0.8, delay: index * 0.08, ease}}
          >
            {word}{"\u00a0"}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
